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
   * @param {import('../core/GraphQLExecutor.js').GraphQLExecutor} executor - GraphQL executor
   * @param {import('../core/RateLimitManager.js').RateLimitManager} rateLimitManager - Rate limit manager
   * @param {import('../../../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   */
  constructor(executor, rateLimitManager, logger = null) {
    this.executor = executor;
    this.rateLimitManager = rateLimitManager;
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
