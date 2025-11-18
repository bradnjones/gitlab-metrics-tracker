import { describe, it, expect } from '@jest/globals';
import { IncidentAnalyzer } from '../../../src/lib/core/services/IncidentAnalyzer.js';

describe('IncidentAnalyzer', () => {
  describe('calculateDowntime', () => {
    it('should calculate downtime for closed incident', () => {
      const incident = {
        createdAt: '2025-01-01T00:00:00Z',
        closedAt: '2025-01-01T02:00:00Z', // 2 hours later
      };

      const downtime = IncidentAnalyzer.calculateDowntime(incident);

      expect(downtime).toBe(2);
    });

    it('should return 0 for open incident', () => {
      const incident = {
        createdAt: '2025-01-01T00:00:00Z',
        closedAt: null,
      };

      const downtime = IncidentAnalyzer.calculateDowntime(incident);

      expect(downtime).toBe(0);
    });

    it('should return 0 if createdAt is missing', () => {
      const incident = {
        createdAt: null,
        closedAt: '2025-01-01T02:00:00Z',
      };

      const downtime = IncidentAnalyzer.calculateDowntime(incident);

      expect(downtime).toBe(0);
    });

    it('should calculate fractional hours correctly', () => {
      const incident = {
        createdAt: '2025-01-01T00:00:00Z',
        closedAt: '2025-01-01T00:30:00Z', // 30 minutes = 0.5 hours
      };

      const downtime = IncidentAnalyzer.calculateDowntime(incident);

      expect(downtime).toBe(0.5);
    });
  });

  describe('enrichWithDowntime', () => {
    it('should add downtimeHours to each incident', () => {
      const incidents = [
        {
          id: '1',
          title: 'Incident 1',
          createdAt: '2025-01-01T00:00:00Z',
          closedAt: '2025-01-01T01:00:00Z',
        },
        {
          id: '2',
          title: 'Incident 2',
          createdAt: '2025-01-02T00:00:00Z',
          closedAt: null,
        },
      ];

      const enriched = IncidentAnalyzer.enrichWithDowntime(incidents);

      expect(enriched[0].downtimeHours).toBe(1);
      expect(enriched[1].downtimeHours).toBe(0);
      expect(enriched[0]).toHaveProperty('id');
      expect(enriched[0]).toHaveProperty('title');
    });

    it('should preserve all original fields', () => {
      const incidents = [
        {
          id: 'gid://gitlab/Issue/1',
          iid: '100',
          title: 'Production outage',
          state: 'closed',
          createdAt: '2025-01-01T00:00:00Z',
          closedAt: '2025-01-01T02:00:00Z',
          labels: { nodes: [{ title: 'incident::high' }] },
          webUrl: 'https://gitlab.com/issues/100',
        },
      ];

      const enriched = IncidentAnalyzer.enrichWithDowntime(incidents);

      expect(enriched[0]).toMatchObject({
        id: 'gid://gitlab/Issue/1',
        iid: '100',
        title: 'Production outage',
        state: 'closed',
        createdAt: '2025-01-01T00:00:00Z',
        closedAt: '2025-01-01T02:00:00Z',
        labels: { nodes: [{ title: 'incident::high' }] },
        webUrl: 'https://gitlab.com/issues/100',
        downtimeHours: 2,
      });
    });
  });

  describe('calculateMTTR', () => {
    it('should calculate average downtime across closed incidents', () => {
      const incidents = [
        {
          createdAt: '2025-01-01T00:00:00Z',
          closedAt: '2025-01-01T02:00:00Z', // 2 hours
        },
        {
          createdAt: '2025-01-02T00:00:00Z',
          closedAt: '2025-01-02T04:00:00Z', // 4 hours
        },
      ];

      const mttr = IncidentAnalyzer.calculateMTTR(incidents);

      expect(mttr).toBe(3); // (2 + 4) / 2
    });

    it('should ignore open incidents when calculating MTTR', () => {
      const incidents = [
        {
          createdAt: '2025-01-01T00:00:00Z',
          closedAt: '2025-01-01T02:00:00Z', // 2 hours
        },
        {
          createdAt: '2025-01-02T00:00:00Z',
          closedAt: null, // Open - should be ignored
        },
      ];

      const mttr = IncidentAnalyzer.calculateMTTR(incidents);

      expect(mttr).toBe(2); // Only closed incident counted
    });

    it('should return 0 if no closed incidents', () => {
      const incidents = [
        {
          createdAt: '2025-01-01T00:00:00Z',
          closedAt: null,
        },
      ];

      const mttr = IncidentAnalyzer.calculateMTTR(incidents);

      expect(mttr).toBe(0);
    });

    it('should return 0 for empty array', () => {
      const mttr = IncidentAnalyzer.calculateMTTR([]);

      expect(mttr).toBe(0);
    });

    it('should handle multiple incidents with varying downtime', () => {
      const incidents = [
        {
          createdAt: '2025-01-01T00:00:00Z',
          closedAt: '2025-01-01T01:00:00Z', // 1 hour
        },
        {
          createdAt: '2025-01-02T00:00:00Z',
          closedAt: '2025-01-02T03:00:00Z', // 3 hours
        },
        {
          createdAt: '2025-01-03T00:00:00Z',
          closedAt: '2025-01-03T05:00:00Z', // 5 hours
        },
      ];

      const mttr = IncidentAnalyzer.calculateMTTR(incidents);

      expect(mttr).toBe(3); // (1 + 3 + 5) / 3
    });
  });

  describe('findTimelineEventByTag', () => {
    it('should find timeline event with matching tag (case insensitive)', () => {
      const timelineEvents = [
        {
          id: '1',
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        },
        {
          id: '2',
          occurredAt: '2025-01-15T12:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'End time' }]
          }
        }
      ];

      const event = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'start time');

      expect(event).toBeDefined();
      expect(event.id).toBe('1');
      expect(event.occurredAt).toBe('2025-01-15T10:00:00Z');
    });

    it('should find event with partial tag match', () => {
      const timelineEvents = [
        {
          id: '1',
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Impact mitigated' }]
          }
        }
      ];

      const event = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'impact');

      expect(event).toBeDefined();
      expect(event.id).toBe('1');
    });

    it('should return undefined when no matching tag found', () => {
      const timelineEvents = [
        {
          id: '1',
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Response initiated' }]
          }
        }
      ];

      const event = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'start time');

      expect(event).toBeUndefined();
    });

    it('should return undefined for empty timeline events array', () => {
      const event = IncidentAnalyzer.findTimelineEventByTag([], 'start time');

      expect(event).toBeUndefined();
    });

    it('should handle events without tags', () => {
      const timelineEvents = [
        {
          id: '1',
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: []
          }
        },
        {
          id: '2',
          occurredAt: '2025-01-15T11:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      const event = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'start time');

      expect(event).toBeDefined();
      expect(event.id).toBe('2');
    });

    it('should handle events with missing timelineEventTags', () => {
      const timelineEvents = [
        {
          id: '1',
          occurredAt: '2025-01-15T10:00:00Z'
          // No timelineEventTags property
        },
        {
          id: '2',
          occurredAt: '2025-01-15T11:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'End time' }]
          }
        }
      ];

      const event = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'end time');

      expect(event).toBeDefined();
      expect(event.id).toBe('2');
    });

    it('should return first matching event when multiple exist', () => {
      const timelineEvents = [
        {
          id: '1',
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        },
        {
          id: '2',
          occurredAt: '2025-01-15T11:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      const event = IncidentAnalyzer.findTimelineEventByTag(timelineEvents, 'start');

      expect(event.id).toBe('1'); // Should return first match
    });
  });

  describe('getActualStartTime', () => {
    it('should return timeline event start time when available', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z'
      };

      const timelineEvents = [
        {
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      const startTime = IncidentAnalyzer.getActualStartTime(incident, timelineEvents);

      expect(startTime).toBe('2025-01-15T10:00:00Z');
    });

    it('should fallback to createdAt when no start time tag exists', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z'
      };

      const timelineEvents = [
        {
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Impact detected' }]
          }
        }
      ];

      const startTime = IncidentAnalyzer.getActualStartTime(incident, timelineEvents);

      expect(startTime).toBe('2025-01-15T12:00:00Z'); // Fallback to createdAt
    });

    it('should fallback to createdAt when timeline events is empty', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z'
      };

      const startTime = IncidentAnalyzer.getActualStartTime(incident, []);

      expect(startTime).toBe('2025-01-15T12:00:00Z');
    });

    it('should fallback to createdAt when timeline events is undefined', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z'
      };

      const startTime = IncidentAnalyzer.getActualStartTime(incident);

      expect(startTime).toBe('2025-01-15T12:00:00Z');
    });

    it('should prefer timeline event even if it is after createdAt', () => {
      const incident = {
        createdAt: '2025-01-15T08:00:00Z'
      };

      const timelineEvents = [
        {
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      const startTime = IncidentAnalyzer.getActualStartTime(incident, timelineEvents);

      // Should use timeline event even though it's later than createdAt
      expect(startTime).toBe('2025-01-15T10:00:00Z');
    });
  });

  describe('calculateDowntime with timeline events (cascading fallback)', () => {
    it('should use timeline event start_time and end_time when available', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z',
        closedAt: '2025-01-15T15:00:00Z'
      };

      const timelineEvents = [
        {
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        },
        {
          occurredAt: '2025-01-15T14:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'End time' }]
          }
        }
      ];

      const downtime = IncidentAnalyzer.calculateDowntime(incident, timelineEvents);

      // Should use 10:00 to 14:00 (4 hours) not 12:00 to 15:00 (3 hours)
      expect(downtime).toBe(4);
    });

    it('should fallback to createdAt when no start time tag exists', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z',
        closedAt: '2025-01-15T15:00:00Z'
      };

      const timelineEvents = [
        {
          occurredAt: '2025-01-15T14:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'End time' }]
          }
        }
      ];

      const downtime = IncidentAnalyzer.calculateDowntime(incident, timelineEvents);

      // Should use createdAt (12:00) to end time (14:00) = 2 hours
      expect(downtime).toBe(2);
    });

    it('should fallback to impact mitigated when no end time tag exists', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z',
        closedAt: '2025-01-15T15:00:00Z'
      };

      const timelineEvents = [
        {
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        },
        {
          occurredAt: '2025-01-15T13:30:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Impact mitigated' }]
          }
        }
      ];

      const downtime = IncidentAnalyzer.calculateDowntime(incident, timelineEvents);

      // Should use start time (10:00) to impact mitigated (13:30) = 3.5 hours
      expect(downtime).toBe(3.5);
    });

    it('should fallback to closedAt when no end time or impact mitigated exists', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z',
        closedAt: '2025-01-15T15:00:00Z'
      };

      const timelineEvents = [
        {
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      const downtime = IncidentAnalyzer.calculateDowntime(incident, timelineEvents);

      // Should use start time (10:00) to closedAt (15:00) = 5 hours
      expect(downtime).toBe(5);
    });

    it('should use createdAt/closedAt when timeline events is empty', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z',
        closedAt: '2025-01-15T15:00:00Z'
      };

      const downtime = IncidentAnalyzer.calculateDowntime(incident, []);

      // Should fallback to createdAt/closedAt = 3 hours
      expect(downtime).toBe(3);
    });

    it('should use createdAt/closedAt when timeline events is undefined', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z',
        closedAt: '2025-01-15T15:00:00Z'
      };

      const downtime = IncidentAnalyzer.calculateDowntime(incident);

      // Should fallback to createdAt/closedAt = 3 hours
      expect(downtime).toBe(3);
    });

    it('should return 0 when incident is still open (no closedAt)', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z',
        closedAt: null
      };

      const timelineEvents = [
        {
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        }
      ];

      const downtime = IncidentAnalyzer.calculateDowntime(incident, timelineEvents);

      expect(downtime).toBe(0);
    });

    it('should handle complex cascading fallback scenario', () => {
      const incident = {
        createdAt: '2025-01-15T12:00:00Z',
        closedAt: '2025-01-15T18:00:00Z'
      };

      const timelineEvents = [
        {
          occurredAt: '2025-01-15T09:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Impact detected' }]
          }
        },
        {
          occurredAt: '2025-01-15T10:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Start time' }]
          }
        },
        {
          occurredAt: '2025-01-15T14:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Response initiated' }]
          }
        },
        {
          occurredAt: '2025-01-15T16:00:00Z',
          timelineEventTags: {
            nodes: [{ name: 'Impact mitigated' }]
          }
        }
      ];

      const downtime = IncidentAnalyzer.calculateDowntime(incident, timelineEvents);

      // Start: 10:00 (Start time tag)
      // End: 16:00 (Impact mitigated - no End time tag)
      // = 6 hours
      expect(downtime).toBe(6);
    });
  });
});
