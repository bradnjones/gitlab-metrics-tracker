import { GraphQLClient } from 'graphql-request';

/**
 * GitLab GraphQL API client for fetching sprint metrics data.
 * Provides methods for querying iterations, issues, merge requests, pipelines, and incidents.
 */
export class GitLabClient {
  /**
   * Creates a new GitLabClient instance.
   *
   * @param {Object} config - Configuration object
   * @param {string} [config.url='https://gitlab.com'] - GitLab instance URL
   * @param {string} config.token - GitLab personal access token
   * @param {string} config.projectPath - GitLab project path (e.g., 'group/project')
   * @throws {Error} If token or projectPath is missing
   */
  constructor(config) {
    // Validate required configuration
    if (!config.token) {
      throw new Error('GITLAB_TOKEN is required');
    }

    if (!config.projectPath) {
      throw new Error('GITLAB_PROJECT_PATH is required');
    }

    // Store configuration
    this.url = config.url || 'https://gitlab.com';
    this.token = config.token;
    this.projectPath = config.projectPath;

    // Initialize GraphQL client
    this.client = new GraphQLClient(`${this.url}/api/graphql`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });

    // Initialize cache properties
    this._projectsCache = null;
    this._projectsCacheTime = null;
    this._cacheTimeout = 600000; // 10 minutes in milliseconds
  }

  /**
   * Fetches project metadata from GitLab.
   *
   * @returns {Promise<Object>} Project metadata
   * @throws {Error} If the request fails
   */
  async fetchProject() {
    const query = `
      query getProject($fullPath: ID!) {
        project(fullPath: $fullPath) {
          id
          name
          nameWithNamespace
          path
          pathWithNamespace
          description
          webUrl
        }
      }
    `;

    try {
      const data = await this.client.request(query, { fullPath: this.projectPath });
      return data.project;
    } catch (error) {
      // Check for GraphQL errors
      if (error.response?.errors) {
        throw new Error(error.response.errors[0].message);
      }
      throw error;
    }
  }

  /**
   * Fetches all iterations (sprints) for the group.
   * Handles pagination and automatically falls back to parent group if needed.
   *
   * @returns {Promise<Array>} Array of iteration objects
   * @throws {Error} If the group is not found or request fails
   */
  async fetchIterations() {
    let groupPath = this.projectPath;

    const query = `
      query getIterations($fullPath: ID!, $after: String) {
        group(fullPath: $fullPath) {
          id
          name
          iterations(first: 100, after: $after, includeAncestors: false) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              iid
              title
              description
              state
              startDate
              dueDate
              createdAt
              updatedAt
              webUrl
              iterationCadence {
                id
                title
              }
            }
          }
        }
      }
    `;

    let allIterations = [];
    let hasNextPage = true;
    let after = null;

    try {
      while (hasNextPage) {
        const data = await this.client.request(query, {
          fullPath: groupPath,
          after,
        });

        // Check if group exists
        if (!data.group) {
          // Try removing last segment (might be a project path)
          const segments = this.projectPath.split('/');
          if (segments.length > 1) {
            groupPath = segments.slice(0, -1).join('/');
            console.log(`Trying parent group: ${groupPath}`);
            continue; // Retry with parent group
          }
          throw new Error(`Group not found: ${groupPath}. Please check your GITLAB_PROJECT_PATH in .env`);
        }

        // Check if iterations are available
        if (!data.group.iterations || !data.group.iterations.nodes) {
          console.warn('This group does not have iterations configured in GitLab.');
          console.warn('You may need to enable iterations: Group Settings > Iterations');
          return [];
        }

        const { nodes, pageInfo } = data.group.iterations;
        allIterations = allIterations.concat(nodes);
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;

        // Small delay to avoid rate limiting
        if (hasNextPage) {
          await this.delay(100);
        }
      }

      console.log(`Found ${allIterations.length} iterations from group: ${groupPath}`);

      return allIterations;
    } catch (error) {
      // Check if it's a GraphQL error
      if (error.response?.errors) {
        const errorMessages = error.response.errors.map(e => e.message).join(', ');
        throw new Error(`GitLab API Error: ${errorMessages}`);
      }
      throw error;
    }
  }

  /**
   * Helper method to delay execution (for rate limiting).
   *
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
