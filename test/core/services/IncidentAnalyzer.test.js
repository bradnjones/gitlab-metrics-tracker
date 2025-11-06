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
});
