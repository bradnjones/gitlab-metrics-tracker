import { RateLimitManager } from './http/RateLimitManager.js';
import { GraphQLExecutor } from './http/GraphQLExecutor.js';
import { ProjectClient } from './clients/ProjectClient.js';
import { PipelineClient } from './clients/PipelineClient.js';
import { MergeRequestClient } from './clients/MergeRequestClient.js';
import { IterationClient } from './clients/IterationClient.js';
import { IssueClient } from './clients/IssueClient.js';
import { IncidentClient } from './clients/IncidentClient.js';

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
   * @param {import('../../core/interfaces/ILogger.js').ILogger} [logger] - Logger instance (optional)
   * @throws {Error} If token or projectPath is missing
   */
  constructor(config, logger = null) {
    // Validate required configuration
    if (!config.token) {
      throw new Error('GITLAB_TOKEN is required');
    }

    if (!config.projectPath) {
      throw new Error('GITLAB_PROJECT_PATH is required');
    }

    // Store configuration
    this.projectPath = config.projectPath;
    this.logger = logger;

    // Initialize helpers
    this.rateLimitManager = new RateLimitManager(logger);
    this.executor = new GraphQLExecutor(config, logger);

    // Initialize specialized clients
    this.projectClient = new ProjectClient(
      this.executor,
      this.rateLimitManager,
      this.projectPath,
      logger
    );
    this.pipelineClient = new PipelineClient(
      this.executor,
      this.rateLimitManager,
      logger
    );
    this.mergeRequestClient = new MergeRequestClient(
      this.executor,
      this.rateLimitManager,
      this.projectPath,
      logger
    );
    this.iterationClient = new IterationClient(
      this.executor,
      this.rateLimitManager,
      this.projectPath,
      logger
    );
    this.issueClient = new IssueClient(
      this.executor,
      this.rateLimitManager,
      this.projectPath,
      logger
    );
    this.incidentClient = new IncidentClient(
      this.executor,
      this.rateLimitManager,
      this.projectPath,
      this.mergeRequestClient,
      logger
    );

  }

  /**
   * Fetches project metadata from GitLab.
   *
   * @returns {Promise<Object>} Project metadata
   * @throws {Error} If the request fails
   */
  async fetchProject() {
    return this.projectClient.fetchProject();
  }

  /**
   * Fetches all iterations (sprints) for the group.
   * Handles pagination and automatically falls back to parent group if needed.
   *
   * @returns {Promise<Array>} Array of iteration objects
   * @throws {Error} If the group is not found or request fails
   */
  async fetchIterations() {
    return this.iterationClient.fetchIterations();
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
    return this.issueClient.fetchAdditionalNotesForIssue(issueId, startCursor);
  }

  /**
   * Fetches detailed information for a specific iteration, including all issues.
   * Issues are fetched from the group level with subgroup inclusion.
   *
   * @param {string} iterationId - GitLab iteration ID (e.g., 'gid://gitlab/Iteration/123')
   * @returns {Promise<Object>} Object with issues and mergeRequests arrays
   * @throws {Error} If the group is not found or request fails
   */
  async fetchIterationDetails(iterationId) {
    return this.issueClient.fetchIterationDetails(
      iterationId,
      () => this.fetchIterations(),
      (start, end) => this.fetchMergeRequestsForGroup(start, end)
    );
  }

  /**
   * Fetches merged merge requests for a group within a date range.
   * Used for deployment tracking (proxy) and lead time calculations.
   *
   * @param {string} startDate - Start date (ISO format or parseable string)
   * @param {string} endDate - End date (ISO format or parseable string)
   * @returns {Promise<Array>} Array of merged merge request objects
   * @throws {Error} If the group is not found or request fails
   */
  async fetchMergeRequestsForGroup(startDate, endDate) {
    return this.mergeRequestClient.fetchMergeRequestsForGroup(startDate, endDate);
  }

  /**
   * Fetches pipelines for a specific project with date filtering.
   * Used for deployment frequency metric calculation.
   *
   * @param {string} projectPath - Project path (e.g., 'group/project')
   * @param {string} [ref='master'] - Git ref/branch to filter by
   * @param {string} [startDate] - Start date for filtering (ISO format)
   * @param {string} [endDate] - End date for filtering (ISO format)
   * @returns {Promise<Array>} Array of pipeline objects
   */
  async fetchPipelinesForProject(projectPath, ref = 'master', startDate, endDate) {
    return this.pipelineClient.fetchPipelinesForProject(projectPath, ref, startDate, endDate);
  }

  /**
   * Fetches all projects in a group.
   *
   * @returns {Promise<Array>} Array of project objects
   */
  async fetchGroupProjects() {
    return this.projectClient.fetchGroupProjects();
  }

  /**
   * Fetches incidents (issues with type=INCIDENT) within a date range.
   * Returns enriched incident data with timeline metadata.
   *
   * @param {string} startDate - Start date (ISO format or parseable string)
   * @param {string} endDate - End date (ISO format or parseable string)
   * @returns {Promise<Array>} Array of enriched incident objects
   * @throws {Error} If the group is not found or request fails
   */
  async fetchIncidents(startDate, endDate) {
    return this.incidentClient.fetchIncidents(startDate, endDate);
  }

  /**
   * Fetches timeline events for a specific incident.
   * Timeline events contain actual incident timing with tags like "Start time", "End time".
   *
   * @param {Object} incident - Incident object with id and webUrl
   * @param {string} incident.id - GitLab incident ID (e.g., 'gid://gitlab/Issue/123')
   * @param {string} incident.webUrl - Incident web URL (used to extract project path)
   * @returns {Promise<Array>} Array of timeline event objects
   */
  async fetchIncidentTimelineEvents(incident) {
    return this.incidentClient.fetchIncidentTimelineEvents(incident);
  }

  /**
   * Fetch merge request details to get mergedAt date
   * Used for CFR calculation to determine which iteration a change belongs to
   *
   * @param {string} projectPath - GitLab project path (e.g., 'group/project')
   * @param {string} mrId - Merge request IID
   * @returns {Promise<Object>} MR details including mergedAt date
   * @throws {Error} If the request fails
   */
  async fetchMergeRequestDetails(projectPath, mrId) {
    return this.mergeRequestClient.fetchMergeRequestDetails(projectPath, mrId);
  }

  /**
   * Fetch commit details to get committedDate
   * Used for CFR calculation to determine which iteration a change belongs to
   *
   * @param {string} projectPath - GitLab project path (e.g., 'group/project')
   * @param {string} sha - Commit SHA
   * @returns {Promise<Object>} Commit details including committedDate
   * @throws {Error} If the request fails
   */
  async fetchCommitDetails(projectPath, sha) {
    return this.mergeRequestClient.fetchCommitDetails(projectPath, sha);
  }

}
