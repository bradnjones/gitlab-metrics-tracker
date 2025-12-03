import { ErrorTransformer } from '../../../../src/lib/infrastructure/api/core/ErrorTransformer.js';

describe('ErrorTransformer', () => {
  describe('transform', () => {
    it('should transform GraphQL errors with single error', () => {
      const originalError = {
        response: {
          errors: [
            { message: 'Group not found' }
          ]
        }
      };

      const transformed = ErrorTransformer.transform(originalError, 'fetching iterations');

      expect(transformed).toBeInstanceOf(Error);
      expect(transformed.message).toBe('GitLab API Error (fetching iterations): Group not found');
    });

    it('should transform GraphQL errors with multiple errors', () => {
      const originalError = {
        response: {
          errors: [
            { message: 'Group not found' },
            { message: 'Invalid token' }
          ]
        }
      };

      const transformed = ErrorTransformer.transform(originalError, 'fetching projects');

      expect(transformed.message).toBe('GitLab API Error (fetching projects): Group not found; Invalid token');
    });

    it('should transform HTTP errors', () => {
      const originalError = {
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      };

      const transformed = ErrorTransformer.transform(originalError, 'fetching merge request');

      expect(transformed.message).toBe('HTTP 404 (fetching merge request): Not Found');
    });

    it('should transform HTTP errors without statusText', () => {
      const originalError = {
        response: {
          status: 500
        }
      };

      const transformed = ErrorTransformer.transform(originalError, 'fetching data');

      expect(transformed.message).toBe('HTTP 500 (fetching data): Unknown error');
    });

    it('should transform network errors', () => {
      const originalError = new Error('Network connection failed');

      const transformed = ErrorTransformer.transform(originalError, 'connecting to GitLab');

      expect(transformed.message).toBe('Failed connecting to GitLab: Network connection failed');
    });

    it('should preserve context in all error types', () => {
      const context = 'performing critical operation';
      const error = { response: { errors: [{ message: 'Failed' }] } };

      const transformed = ErrorTransformer.transform(error, context);

      expect(transformed.message).toContain(context);
    });
  });

  describe('isRetryable', () => {
    it('should return true for ECONNRESET errors', () => {
      const error = { code: 'ECONNRESET' };

      expect(ErrorTransformer.isRetryable(error)).toBe(true);
    });

    it('should return true for ETIMEDOUT errors', () => {
      const error = { code: 'ETIMEDOUT' };

      expect(ErrorTransformer.isRetryable(error)).toBe(true);
    });

    it('should return true for 429 rate limit errors', () => {
      const error = {
        response: { status: 429 }
      };

      expect(ErrorTransformer.isRetryable(error)).toBe(true);
    });

    it('should return true for 5xx server errors', () => {
      const errors = [
        { response: { status: 500 } },
        { response: { status: 502 } },
        { response: { status: 503 } },
        { response: { status: 599 } }
      ];

      errors.forEach(error => {
        expect(ErrorTransformer.isRetryable(error)).toBe(true);
      });
    });

    it('should return false for 4xx client errors (except 429)', () => {
      const errors = [
        { response: { status: 400 } },
        { response: { status: 401 } },
        { response: { status: 403 } },
        { response: { status: 404 } }
      ];

      errors.forEach(error => {
        expect(ErrorTransformer.isRetryable(error)).toBe(false);
      });
    });

    it('should return false for GraphQL errors', () => {
      const error = {
        response: {
          errors: [{ message: 'Invalid query' }]
        }
      };

      expect(ErrorTransformer.isRetryable(error)).toBe(false);
    });

    it('should return false for generic errors', () => {
      const error = new Error('Something went wrong');

      expect(ErrorTransformer.isRetryable(error)).toBe(false);
    });
  });
});
