import { ChangeFailureRateCalculator } from '../../../src/lib/core/services/ChangeFailureRateCalculator.js';

describe('ChangeFailureRateCalculator', () => {
  describe('calculate', () => {
    it('should calculate change failure rate as percentage', () => {
      // Arrange
      const incidents = [{ id: 1 }, { id: 2 }]; // 2 incidents
      const deployments = 10; // 10 deployments

      // Act
      const result = ChangeFailureRateCalculator.calculate(incidents, deployments);

      // Assert
      expect(result).toBe(20); // (2 / 10) * 100 = 20%
    });

    it('should return 0 for zero deployments (avoid division by zero)', () => {
      // Arrange
      const incidents = [{ id: 1 }];
      const deployments = 0;

      // Act
      const result = ChangeFailureRateCalculator.calculate(incidents, deployments);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 when no incidents occurred', () => {
      // Arrange
      const incidents = [];
      const deployments = 20;

      // Act
      const result = ChangeFailureRateCalculator.calculate(incidents, deployments);

      // Assert
      expect(result).toBe(0); // (0 / 20) * 100 = 0%
    });

    it('should calculate CFR correctly with fractional results', () => {
      // Arrange
      const incidents = [{ id: 1 }]; // 1 incident
      const deployments = 3; // 3 deployments

      // Act
      const result = ChangeFailureRateCalculator.calculate(incidents, deployments);

      // Assert
      expect(result).toBeCloseTo(33.33, 2); // (1 / 3) * 100 = 33.333...
    });

    it('should handle CFR > 100% when incidents exceed deployments', () => {
      // Arrange
      const incidents = [{ id: 1 }, { id: 2 }, { id: 3 }]; // 3 incidents
      const deployments = 2; // 2 deployments

      // Act
      const result = ChangeFailureRateCalculator.calculate(incidents, deployments);

      // Assert
      expect(result).toBe(150); // (3 / 2) * 100 = 150%
    });
  });
});
