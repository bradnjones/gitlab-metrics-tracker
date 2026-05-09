// CJS stub for useAIReview hook — used by VelocityApp tests via babel-jest
function useAIReview() {
  return {
    run: () => Promise.resolve(),
    loading: false,
    error: null,
    lastAnalysis: null,
    streamingText: '',
    history: [],
  };
}

module.exports = { useAIReview };
