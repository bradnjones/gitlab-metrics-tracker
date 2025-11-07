import React, { useState } from 'react';

/**
 * Minimal vertical slice component for calculating sprint metrics
 *
 * This is a temporary component to demonstrate the complete vertical slice
 * from UI → API → Service Layer → Domain Logic
 *
 * @component
 * @returns {React.ReactElement} The metrics calculator component
 */
function MetricsCalculator() {
  const [iterationId, setIterationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Handles form submission and calls the metrics API
   *
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!iterationId.trim()) {
      setError('Please enter an iteration ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/metrics/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iterationId: iterationId.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate metrics');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formats a metric value for display
   *
   * @param {number|Object} value - The metric value
   * @returns {string} Formatted value
   */
  const formatValue = (value) => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  };

  return (
    <div className="container">
      <h1>GitLab Sprint Metrics Calculator</h1>
      <p>Enter a GitLab iteration ID to calculate sprint metrics.</p>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="iterationId">
            Iteration ID (e.g., gid://gitlab/Iteration/12345)
          </label>
          <input
            id="iterationId"
            type="text"
            value={iterationId}
            onChange={(e) => setIterationId(e.target.value)}
            placeholder="gid://gitlab/Iteration/12345"
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Calculating...' : 'Calculate Metrics'}
        </button>
      </form>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="loading">
          <p>Calculating metrics...</p>
        </div>
      )}

      {results && (
        <div className="results">
          <h2>Results</h2>

          {results.metrics ? (
            <div>
              <div className="metric">
                <div className="metric-name">Iteration</div>
                <div className="metric-value">{results.metrics.iterationTitle}</div>
              </div>

              <div className="metric">
                <div className="metric-name">Velocity (Points)</div>
                <div className="metric-value">{formatValue(results.metrics.velocityPoints)}</div>
              </div>

              <div className="metric">
                <div className="metric-name">Velocity (Stories)</div>
                <div className="metric-value">{formatValue(results.metrics.velocityStories)}</div>
              </div>

              <div className="metric">
                <div className="metric-name">Throughput</div>
                <div className="metric-value">{formatValue(results.metrics.throughput)}</div>
              </div>

              <div className="metric">
                <div className="metric-name">Cycle Time (Avg)</div>
                <div className="metric-value">{formatValue(results.metrics.cycleTimeAvg)} days</div>
              </div>

              <div className="metric">
                <div className="metric-name">Cycle Time (P50)</div>
                <div className="metric-value">{formatValue(results.metrics.cycleTimeP50)} days</div>
              </div>

              <div className="metric">
                <div className="metric-name">Cycle Time (P90)</div>
                <div className="metric-value">{formatValue(results.metrics.cycleTimeP90)} days</div>
              </div>

              <div className="metric">
                <div className="metric-name">Issue Count</div>
                <div className="metric-value">{results.metrics.issueCount}</div>
              </div>
            </div>
          ) : (
            <p>No metrics calculated</p>
          )}

          <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
            <strong>Full Response:</strong>
            <pre style={{
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetricsCalculator;
