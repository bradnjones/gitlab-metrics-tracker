import { ChangeLinkExtractor } from '../../../src/lib/core/services/ChangeLinkExtractor.js';

describe('ChangeLinkExtractor', () => {
  describe('extractFromTimelineEvents', () => {
    it('should extract MR link from Start time event note', () => {
      // Arrange
      const timelineEvents = [
        {
          occurredAt: '2025-10-01T10:00:00Z',
          note: 'https://gitlab.com/smi-org/dev/all-the-config/-/merge_requests/158',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      // Act
      const result = ChangeLinkExtractor.extractFromTimelineEvents(timelineEvents);

      // Assert
      expect(result).toEqual({
        type: 'merge_request',
        url: 'https://gitlab.com/smi-org/dev/all-the-config/-/merge_requests/158',
        project: 'smi-org/dev/all-the-config',
        id: '158'
      });
    });

    it('should extract commit link from Start time event note', () => {
      // Arrange
      const timelineEvents = [
        {
          occurredAt: '2025-10-21T15:41:00Z',
          note: 'https://gitlab.com/smi-org/dev/groundhog/groundhog/-/commit/00fb65b430b2e5b69e07d8b9a0266212e6423386\nDeployment without the necessary dlls went live',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      // Act
      const result = ChangeLinkExtractor.extractFromTimelineEvents(timelineEvents);

      // Assert
      expect(result).toEqual({
        type: 'commit',
        url: 'https://gitlab.com/smi-org/dev/groundhog/groundhog/-/commit/00fb65b430b2e5b69e07d8b9a0266212e6423386',
        project: 'smi-org/dev/groundhog/groundhog',
        sha: '00fb65b430b2e5b69e07d8b9a0266212e6423386'
      });
    });

    it('should return null when no Start time event exists', () => {
      // Arrange
      const timelineEvents = [
        {
          occurredAt: '2025-10-20T15:34:00Z',
          note: 'Incident impact detected',
          timelineEventTags: {
            nodes: [{ name: 'Impact detected' }]
          }
        }
      ];

      // Act
      const result = ChangeLinkExtractor.extractFromTimelineEvents(timelineEvents);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when Start time event has no change link', () => {
      // Arrange
      const timelineEvents = [
        {
          occurredAt: '2025-10-21T15:41:00Z',
          note: 'Deployment without change link',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      // Act
      const result = ChangeLinkExtractor.extractFromTimelineEvents(timelineEvents);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty timeline events', () => {
      // Arrange
      const timelineEvents = [];

      // Act
      const result = ChangeLinkExtractor.extractFromTimelineEvents(timelineEvents);

      // Assert
      expect(result).toBeNull();
    });

    it('should extract MR link even with additional text in note', () => {
      // Arrange
      const timelineEvents = [
        {
          occurredAt: '2025-10-30T10:05:00Z',
          note: 'This deployment caused issues: https://gitlab.com/smi-org/dev/member_app/-/merge_requests/531 - need to investigate',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      // Act
      const result = ChangeLinkExtractor.extractFromTimelineEvents(timelineEvents);

      // Assert
      expect(result).toEqual({
        type: 'merge_request',
        url: 'https://gitlab.com/smi-org/dev/member_app/-/merge_requests/531',
        project: 'smi-org/dev/member_app',
        id: '531'
      });
    });

    it('should handle Start time tag with different casing', () => {
      // Arrange
      const timelineEvents = [
        {
          occurredAt: '2025-10-01T10:00:00Z',
          note: 'https://gitlab.com/test/-/merge_requests/1',
          timelineEventTags: {
            nodes: [{ name: 'START TIME' }]
          }
        }
      ];

      // Act
      const result = ChangeLinkExtractor.extractFromTimelineEvents(timelineEvents);

      // Assert
      expect(result).not.toBeNull();
      expect(result.type).toBe('merge_request');
    });

    it('should prefer MR link over commit link when both present', () => {
      // Arrange
      const timelineEvents = [
        {
          occurredAt: '2025-10-01T10:00:00Z',
          note: 'MR: https://gitlab.com/test/-/merge_requests/1\nCommit: https://gitlab.com/test/-/commit/abc123',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      // Act
      const result = ChangeLinkExtractor.extractFromTimelineEvents(timelineEvents);

      // Assert
      expect(result.type).toBe('merge_request');
    });
  });
});
