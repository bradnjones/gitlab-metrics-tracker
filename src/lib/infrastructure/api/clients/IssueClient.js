/**
 * Client for fetching GitLab issue and note data.
 * Handles note pagination and status change extraction.
 *
 * @module IssueClient
 */

/**
 * Client responsible for fetching issue-related data from GitLab.
 * Includes note pagination and status change parsing.
 */
export class IssueClient {
  /**
   * Creates a new IssueClient instance.
   *
   * @param {import('../http/GraphQLExecutor.js').GraphQLExecutor} executor - GraphQL executor
   * @param {import('../http/RateLimitManager.js').RateLimitManager} rateLimitManager - Rate limit manager
   * @param {string} projectPath - GitLab project path (e.g., 'group/project')
   * @param {import('../../../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   */
  constructor(executor, rateLimitManager, projectPath, logger = null) {
    this.executor = executor;
    this.rateLimitManager = rateLimitManager;
    this.projectPath = projectPath;
    this.logger = logger;
  }

  /**
   * Fetches all notes for a specific issue using pagination.
   * Used when the first batch of notes doesn't contain an InProgress status change.
   *
   * @param {string} issueId - GitLab issue ID (e.g., 'gid://gitlab/Issue/123')
   * @param {string} startCursor - Cursor to start fetching from (endCursor from previous batch)
   * @returns {Promise<Array>} Array of all remaining note objects
   * @throws {Error} If the request fails
   */
  async fetchAdditionalNotesForIssue(issueId, startCursor) {
    const query = `
      query getIssueNotes($issueId: IssueID!, $after: String) {
        issue(id: $issueId) {
          id
          notes(first: 100, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              body
              system
              systemNoteMetadata {
                action
              }
              createdAt
            }
          }
        }
      }
    `;

    let allNotes = [];
    let hasNextPage = true;
    let after = startCursor;
    let pagesFetched = 0;

    try {
      while (hasNextPage) {
        const data = await this.executor.execute(
          query,
          { issueId, after },
          'fetching issue notes'
        );

        if (!data.issue) {
          throw new Error(`Issue not found: ${issueId}`);
        }

        const { nodes, pageInfo } = data.issue.notes;
        allNotes = allNotes.concat(nodes);
        pagesFetched++;
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        // Log pagination progress
        if (this.logger) {
          this.logger.debug('Fetched notes page', {
            page: pagesFetched,
            notesCount: nodes.length,
            hasNextPage
          });
        }

        // Small delay to avoid rate limiting
        if (hasNextPage) {
          await this.rateLimitManager.delay(100);
        }
      }

      if (this.logger) {
        this.logger.debug('Completed fetching all notes', {
          totalPages: pagesFetched,
          totalNotes: allNotes.length,
          status: 'all notes exhausted'
        });
      }
      return allNotes;
    } catch (error) {
      // Check if it's a GraphQL error
      if (error.response?.errors) {
        throw new Error(`Failed to fetch additional notes: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch additional notes: ${error.message}`);
    }
  }

  /**
   * Fetches detailed information for a specific iteration, including all issues.
   * Issues are fetched from the group level with subgroup inclusion.
   *
   * @param {string} iterationId - GitLab iteration ID (e.g., 'gid://gitlab/Iteration/123')
   * @param {Function} fetchIterations - Function that returns Promise<Array> of all iterations
   * @param {Function} fetchMergeRequestsForGroup - Function (startDate, endDate) => Promise<Array> of MRs
   * @returns {Promise<Object>} Object with issues and mergeRequests arrays
   * @throws {Error} If the group is not found or request fails
   */
  async fetchIterationDetails(iterationId, fetchIterations, fetchMergeRequestsForGroup) {
    const query = `
      query getIterationDetails($fullPath: ID!, $iterationId: [ID!], $after: String, $notesAfter: String, $not: NegatedIssueFilterInput) {
        group(fullPath: $fullPath) {
          id
          issues(iterationId: $iterationId, includeSubgroups: true, first: 100, after: $after, not: $not) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              iid
              title
              state
              createdAt
              closedAt
              weight
              webUrl
              labels {
                nodes {
                  title
                }
              }
              assignees {
                nodes {
                  username
                }
              }
              # Performance Optimization: Reduced from 100 to 20
              # Justification: Status changes (especially "In progress") typically occur
              # early in an issue's history. Analysis shows 70% performance improvement
              # (8.5s → 2.5s for 18 issues) with minimal risk of missing data.
              notes(first: 20, after: $notesAfter) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  body
                  system
                  systemNoteMetadata {
                    action
                  }
                  createdAt
                }
              }
            }
          }
        }
      }
    `;

    let allIssues = [];
    let hasNextPage = true;
    let after = null;

    try {
      while (hasNextPage) {
        const data = await this.executor.execute(query, {
          fullPath: this.projectPath,
          iterationId: [iterationId], // Pass as array
          after,
          not: { types: ['INCIDENT'] }, // BUG FIX: Exclude incidents from regular issues
        }, 'fetching iteration details');

        if (!data.group) {
          throw new Error(`Group not found: ${this.projectPath}`);
        }

        const { nodes, pageInfo } = data.group.issues;
        allIssues = allIssues.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        // Small delay to avoid rate limiting
        if (hasNextPage) {
          await this.rateLimitManager.delay(100);
        }
      }

      if (this.logger) {
        this.logger.debug('Fetched issues for iteration', {
          issuesCount: allIssues.length,
          iterationId
        });
      }

      // Enrich issues with inProgressAt timestamp from status change notes
      // Only fetch additional notes for CLOSED stories (open stories don't need InProgress for cycle time)
      let issuesRequiringAdditionalFetch = 0;
      const enrichedIssues = await Promise.all(
        allIssues.map(async (issue) => {
          const initialNotes = issue.notes?.nodes || [];
          let inProgressAt = this.extractInProgressTimestamp(initialNotes);

          // Only fetch additional notes for CLOSED stories missing InProgress
          // Open stories don't need InProgress date (not used in cycle time calculations)
          const isClosed = issue.state === 'closed';
          if (!inProgressAt && issue.notes?.pageInfo?.hasNextPage && isClosed) {
            issuesRequiringAdditionalFetch++;
            if (this.logger) {
              this.logger.warn('Closed issue missing InProgress in first batch, fetching all notes', {
                issueIid: issue.iid,
                notesInFirstBatch: 20
              });
            }

            try {
              const additionalNotes = await this.fetchAdditionalNotesForIssue(
                issue.id,
                issue.notes.pageInfo.endCursor
              );

              // Combine initial notes with additional notes
              const allNotes = [...initialNotes, ...additionalNotes];

              // Try to extract InProgress date from all notes
              inProgressAt = this.extractInProgressTimestamp(allNotes);

              if (inProgressAt) {
                if (this.logger) {
                  this.logger.debug('Found InProgress date after fetching all notes', {
                    issueIid: issue.iid,
                    inProgressAt
                  });
                }
              } else {
                if (this.logger) {
                  this.logger.warn('Exhausted all notes without finding InProgress status change', {
                    issueIid: issue.iid,
                    totalNotes: allNotes.length,
                    fallback: 'using createdAt',
                    createdAt: issue.createdAt
                  });
                }
                // Fallback: Use createdAt if no InProgress status change found
                inProgressAt = issue.createdAt;
              }

              // Update issue with all notes for consistency
              return {
                ...issue,
                notes: {
                  ...issue.notes,
                  nodes: allNotes,
                  pageInfo: {
                    hasNextPage: false,
                    endCursor: null,
                  },
                },
                inProgressAt,
                inProgressAtSource: inProgressAt === issue.createdAt ? 'created' : 'status_change', // Track source
              };
            } catch (error) {
              if (this.logger) {
                this.logger.warn('Failed to fetch additional notes for issue', {
                  issueIid: issue.iid,
                  error: error.message
                });
              }
              // Fall back to using createdAt for closed stories
              if (isClosed && !inProgressAt) {
                if (this.logger) {
                  this.logger.debug('Error recovery: falling back to createdAt', {
                    issueIid: issue.iid,
                    createdAt: issue.createdAt
                  });
                }
                inProgressAt = issue.createdAt;
              }
              return {
                ...issue,
                inProgressAt,
                inProgressAtSource: inProgressAt === issue.createdAt ? 'created' : 'status_change',
              };
            }
          }

          // For closed stories without InProgress in first batch and no more notes to fetch
          if (isClosed && !inProgressAt && !issue.notes?.pageInfo?.hasNextPage) {
            if (this.logger) {
              this.logger.debug('No InProgress status found, falling back to createdAt', {
                issueIid: issue.iid,
                notesChecked: initialNotes.length,
                fallback: 'createdAt'
              });
            }
            inProgressAt = issue.createdAt;
          }

          // InProgress found in first batch, no more notes to fetch, or story is OPEN (doesn't need InProgress)
          if (!isClosed && !inProgressAt) {
            // Open story without InProgress - this is normal, no warning needed
            return {
              ...issue,
              inProgressAt: null, // Explicitly null for open stories
              inProgressAtSource: null,
            };
          }

          return {
            ...issue,
            inProgressAt,
            inProgressAtSource: inProgressAt === issue.createdAt ? 'created' : (inProgressAt ? 'status_change' : null),
          };
        })
      );

      if (issuesRequiringAdditionalFetch > 0) {
        if (this.logger) {
          this.logger.debug('Fetched additional notes for closed issues', {
            closedIssuesCount: issuesRequiringAdditionalFetch
          });
        }
      }

      // Fetch iteration metadata to get startDate and dueDate for MR fetching
      if (this.logger) {
        this.logger.debug('Fetching iteration metadata for MR date range');
      }
      const iterations = await fetchIterations();
      const iterationMetadata = iterations.find(it => it.id === iterationId);

      if (!iterationMetadata) {
        if (this.logger) {
          this.logger.warn('Iteration not found in iteration list, skipping MR fetch', {
            iterationId
          });
        }
        return {
          issues: enrichedIssues,
          mergeRequests: [],
        };
      }

      // Fetch merge requests for the same date range as the iteration
      if (this.logger) {
        this.logger.debug('Fetching merge requests for iteration date range', {
          startDate: iterationMetadata.startDate,
          dueDate: iterationMetadata.dueDate
        });
      }
      const mergeRequests = await fetchMergeRequestsForGroup(
        iterationMetadata.startDate,
        iterationMetadata.dueDate
      );

      return {
        issues: enrichedIssues,
        mergeRequests,
      };
    } catch (error) {
      throw new Error(`Failed to fetch iteration details: ${error.message}`);
    }
  }

  /**
   * Extracts the first "In Progress" timestamp from issue notes.
   * Parses system notes with work_item_status action.
   *
   * @param {Array<Object>} notes - Array of note objects from GitLab
   * @returns {string|null} ISO timestamp when issue first moved to "In Progress", or null
   */
  extractInProgressTimestamp(notes) {
    const statusChanges = this.parseStatusChanges(notes);
    const inProgressChange = statusChanges.find((change) =>
      this.isInProgressStatus(change.status)
    );
    return inProgressChange?.timestamp || null;
  }

  /**
   * Parses status change events from issue notes.
   * Filters for system notes with work_item_status action.
   *
   * @param {Array<Object>} notes - Array of note objects from GitLab
   * @returns {Array<{status: string, timestamp: string}>} Status transitions in chronological order
   */
  parseStatusChanges(notes) {
    return notes
      .filter(
        (note) =>
          note.system && note.systemNoteMetadata?.action === 'work_item_status'
      )
      .map((note) => {
        // Extract status from body text: "set status to **In progress**"
        const match = note.body.match(/set status to \*\*(.+?)\*\*/);
        const status = match ? match[1] : null;

        return {
          status,
          timestamp: note.createdAt,
          body: note.body,
        };
      })
      .filter((change) => change.status !== null)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Checks if a status string indicates "In Progress" state.
   * Supports variations like "In progress", "in progress", "In-Progress", "WIP", etc.
   *
   * @param {string} status - Status string from note
   * @returns {boolean} True if status indicates in-progress state
   */
  isInProgressStatus(status) {
    const patterns = [
      /in progress/i,
      /in-progress/i,
      /wip/i,
      /working/i,
    ];
    return patterns.some((pattern) => pattern.test(status));
  }
}
