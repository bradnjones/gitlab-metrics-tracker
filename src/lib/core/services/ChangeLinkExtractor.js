/**
 * ChangeLinkExtractor - Extracts MR or commit links from incident timeline events
 * Used for correlating incidents with specific changes for accurate CFR calculation
 *
 * @module core/services/ChangeLinkExtractor
 */

/**
 * Change link information extracted from timeline events
 * @typedef {Object} ChangeLink
 * @property {'merge_request'|'commit'} type - Type of change
 * @property {string} url - Full URL to the change
 * @property {string} project - GitLab project path
 * @property {string} [id] - MR ID (for merge requests)
 * @property {string} [sha] - Commit SHA (for commits)
 */

/**
 * ChangeLinkExtractor - Service for extracting change links from timeline events
 */
export class ChangeLinkExtractor {
  /**
   * MR URL pattern: https://gitlab.com/group/project/-/merge_requests/123
   * Supports both single-level (test) and multi-level (group/subgroup/project) paths
   * @private
   */
  static MR_PATTERN = /https?:\/\/([^\/]+)\/((?:[^\/]+\/)*[^\/]+)\/-\/merge_requests\/(\d+)/;

  /**
   * Commit URL pattern: https://gitlab.com/group/project/-/commit/abc123...
   * Supports both single-level (test) and multi-level (group/subgroup/project) paths
   * @private
   */
  static COMMIT_PATTERN = /https?:\/\/([^\/]+)\/((?:[^\/]+\/)*[^\/]+)\/-\/commit\/([a-f0-9]+)/;

  /**
   * Extract change link (MR or commit) from incident timeline events
   * Looks for the "Start time" event and extracts the first MR or commit URL from its note
   *
   * @param {Array<Object>} timelineEvents - Timeline events from incident
   * @returns {ChangeLink|null} Extracted change link or null if not found
   */
  static extractFromTimelineEvents(timelineEvents) {
    if (!timelineEvents || timelineEvents.length === 0) {
      return null;
    }

    // Find "Start time" event (case-insensitive)
    const startEvent = timelineEvents.find(event =>
      event.timelineEventTags?.nodes?.some(tag =>
        tag.name.toLowerCase().includes('start time')
      )
    );

    if (!startEvent || !startEvent.note) {
      return null;
    }

    // Try to extract MR link first (preferred)
    const mrMatch = startEvent.note.match(this.MR_PATTERN);
    if (mrMatch) {
      return {
        type: 'merge_request',
        url: mrMatch[0],
        project: mrMatch[2],
        id: mrMatch[3]
      };
    }

    // Try to extract commit link
    const commitMatch = startEvent.note.match(this.COMMIT_PATTERN);
    if (commitMatch) {
      return {
        type: 'commit',
        url: commitMatch[0],
        project: commitMatch[2],
        sha: commitMatch[3]
      };
    }

    // No change link found
    return null;
  }
}
