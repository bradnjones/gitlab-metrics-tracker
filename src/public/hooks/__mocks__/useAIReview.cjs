// CJS stub for useAIReview hook — used by VelocityApp tests via babel-jest
function useAIReview() {
  return {
    run: () => Promise.resolve(),
    chat: () => Promise.resolve(),
    loading: false,
    error: null,
    lastAnalysis: null,
    streamingText: '',
    chatLoading: false,
    chatStreamingText: '',
    pendingChatMessage: '',
    history: [],
  };
}

module.exports = { useAIReview };
