/**
 * MergeRequestClient
 * Handles GitLab merge request and commit queries.
 *
 * Responsibilities:
 * - Fetch merge requests for groups
 * - Fetch merge request details
 * - Fetch commit details (used for CFR calculation)
 *
 * @class MergeRequestClient
 */
export class MergeRequestClient {
  /**
   * Creates a MergeRequestClient instance.
   *
   * @param {import('../core/GraphQLExecutor.js').GraphQLExecutor} executor - GraphQL query executor
   * @param {import('../core/RateLimitManager.js').RateLimitManager} rateLimitManager - Rate limit manager
   * @param {string} projectPath - GitLab project path
   * @param {import('../../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   */
  constructor(executor, rateLimitManager, projectPath, logger = null) {
    this.executor = executor;
    this.rateLimitManager = rateLimitManager;
    this.projectPath = projectPath;
    this.logger = logger;
  }

  /**
   * Fetches merged merge requests for the group within a date range.
   *
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Array>} Array of merge request objects
   * @throws {Error} If the group is not found or request fails
   */
  async fetchMergeRequestsForGroup(startDate, endDate) {
    const query = `
      query getGroupMergeRequests($fullPath: ID!, $after: String, $mergedAfter: Time, $mergedBefore: Time) {
        group(fullPath: $fullPath) {
          id
          mergeRequests(
            state: merged
            first: 100
            after: $after
            mergedAfter: $mergedAfter
            mergedBefore: $mergedBefore
          ) {
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
              mergedAt
              targetBranch
              sourceBranch
              webUrl
              author {
                username
                name
              }
              project {
                fullPath
                name
              }
              commits {
                nodes {
                  id
                  sha
                  committedDate
                }
              }
            }
          }
        }
      }
    `;

    let allMRs = [];
    let hasNextPage = true;
    let after = null;

    try {
      const mergedAfter = new Date(startDate).toISOString();
      const mergedBefore = new Date(endDate).toISOString();

      if (this.logger) {
        this.logger.debug('Querying merged MRs from group', {
          startDate,
          endDate
        });
      }

      while (hasNextPage) {
        const data = await this.executor.execute(
          query,
          { fullPath: this.projectPath, after, mergedAfter, mergedBefore },
          'fetching merge requests'
        );

        if (!data.group) {
          throw new Error(`Group not found: ${this.projectPath}`);
        }

        if (!data.group.mergeRequests) {
          break;
        }

        const { nodes, pageInfo } = data.group.mergeRequests;
        allMRs = allMRs.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        if (hasNextPage) {
          await this.rateLimitManager.delay(100);
        }
      }

      if (this.logger) {
        this.logger.debug('Found merged MRs in date range', {
          count: allMRs.length
        });
      }
      return allMRs;
    } catch (error) {
      // Check if it's a GraphQL error
      if (error.response?.errors) {
        throw new Error(`Failed to fetch merge requests: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch merge requests: ${error.message}`);
    }
  }

  /**
   * Fetches details of a specific merge request.
   *
   * @param {string} projectPath - GitLab project path
   * @param {string} mrId - Merge request IID
   * @returns {Promise<Object>} Merge request details
   * @throws {Error} If the merge request is not found
   */
  async fetchMergeRequestDetails(projectPath, mrId) {
    const query = `
      query getMergeRequest($fullPath: ID!, $iid: String!) {
        project(fullPath: $fullPath) {
          mergeRequest(iid: $iid) {
            id
            iid
            title
            state
            mergedAt
            createdAt
            targetBranch
            sourceBranch
            webUrl
          }
        }
      }
    `;

    try {
      const data = await this.executor.execute(
        query,
        { fullPath: projectPath, iid: mrId },
        `fetching MR !${mrId}`
      );

      if (!data.project || !data.project.mergeRequest) {
        throw new Error(`Merge request !${mrId} not found in project ${projectPath}`);
      }

      return data.project.mergeRequest;
    } catch (error) {
      if (error.response?.errors) {
        throw new Error(`Failed to fetch MR details: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch MR details: ${error.message}`);
    }
  }

  /**
   * Fetches commit details to get committedDate.
   * Used for CFR calculation to determine which iteration a change belongs to.
   *
   * @param {string} projectPath - GitLab project path
   * @param {string} sha - Commit SHA
   * @returns {Promise<Object>} Commit details including committedDate
   * @throws {Error} If the commit is not found
   */
  async fetchCommitDetails(projectPath, sha) {
    const query = `
      query getCommit($fullPath: ID!, $sha: String!) {
        project(fullPath: $fullPath) {
          repository {
            commit(ref: $sha) {
              id
              sha
              title
              message
              committedDate
              createdAt
              webUrl
            }
          }
        }
      }
    `;

    try {
      const data = await this.executor.execute(
        query,
        { fullPath: projectPath, sha },
        `fetching commit ${sha.substring(0, 8)}`
      );

      if (!data.project?.repository?.commit) {
        throw new Error(`Commit ${sha} not found in project ${projectPath}`);
      }

      return data.project.repository.commit;
    } catch (error) {
      if (error.response?.errors) {
        throw new Error(`Failed to fetch commit details: ${error.response.errors[0].message}`);
      }
      throw new Error(`Failed to fetch commit details: ${error.message}`);
    }
  }
}
