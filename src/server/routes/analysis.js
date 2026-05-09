/**
 * Analysis API routes
 * POST /api/analysis/review — run AI metric review
 * GET  /api/analysis        — list all past analyses
 * GET  /api/analysis/:id    — get single analysis by id
 *
 * @module server/routes/analysis
 */

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { ServiceFactory } from '../services/ServiceFactory.js';
import { ConsoleLogger } from '../../lib/infrastructure/logging/ConsoleLogger.js';

const router = express.Router();

const logger = new ConsoleLogger({ serviceName: 'analysis-api' });

/**
 * Dedicated rate limiter for the AI review endpoint: 10 requests/hour per IP.
 * Stricter than the general 500/min limiter applied to all /api routes.
 */
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  message: { error: 'Too many AI review requests — limit is 10 per hour' },
});

/**
 * Validate iterationIds before the rate limiter so malformed requests don't
 * consume quota. Shared by both /review and /review/stream.
 */
function validateIterationIds(req, res, next) {
  const { iterationIds } = req.body;
  if (!Array.isArray(iterationIds)) {
    return res.status(400).json({ error: 'iterationIds must be an array' });
  }
  if (iterationIds.length > 100) {
    return res.status(400).json({ error: 'iterationIds cannot exceed 100 items' });
  }
  next();
}

/**
 * Validate chat message before rate limiter so malformed requests don't consume quota.
 */
function validateChatMessage(req, res, next) {
  const { message } = req.body;
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message must be a non-empty string' });
  }
  next();
}

/**
 * Gate on LLM availability before the rate limiter so unconfigured requests don't consume quota.
 * Attaches the client to req.llmClient for downstream use.
 */
function requireLLMClient(req, res, next) {
  const llmClient = ServiceFactory.createLLMClient(req.anthropicApiKey);
  if (!llmClient) {
    return res.status(503).json({
      error: 'AI review is not configured — set AI_REVIEW_ENABLED=true and add your Anthropic API key in Settings',
    });
  }
  req.llmClient = llmClient;
  next();
}

/**
 * POST /api/analysis/review/stream
 * Stream an AI metric review via Server-Sent Events.
 *
 * Body: { iterationIds: string[] }
 * Response: text/event-stream — delta and done events, or an error event
 */
router.post('/review/stream', validateIterationIds, reviewLimiter, async (req, res) => {
  const { iterationIds } = req.body;

  const llmClient = ServiceFactory.createLLMClient(req.anthropicApiKey);
  if (!llmClient) {
    return res.status(503).json({
      error: 'AI review is not configured — set AI_REVIEW_ENABLED=true and add your Anthropic API key in Settings',
    });
  }

  const service = ServiceFactory.createMetricAnalysisService({
    gitlabToken: req.gitlabToken,
    projectPath: req.gitlabProject,
    anthropicApiKey: req.anthropicApiKey,
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    for await (const event of service.analyzeStream(iterationIds)) {
      if (event.type === 'done') {
        send({ type: 'done', analysis: event.analysis.toJSON() });
      } else {
        send(event);
      }
    }
  } catch (err) {
    logger.error('AI metric stream failed', err, {
      route: 'POST /api/analysis/review/stream',
    });
    send({ type: 'error', message: 'Analysis failed — the run has been persisted for debugging' });
  } finally {
    res.end();
  }
});

/**
 * POST /api/analysis/review
 * Trigger an AI metric review for the given iteration IDs.
 *
 * Body: { iterationIds: string[] }
 * Returns: Analysis (toJSON)
 */
router.post('/review', validateIterationIds, reviewLimiter, async (req, res) => {
  const { iterationIds } = req.body;

  // Gate on LLM availability — createLLMClient returns null when not configured
  const llmClient = ServiceFactory.createLLMClient(req.anthropicApiKey);
  if (!llmClient) {
    return res.status(503).json({
      error: 'AI review is not configured — set AI_REVIEW_ENABLED=true and add your Anthropic API key in Settings',
    });
  }

  // Build service inline with the pre-checked llmClient
  const service = ServiceFactory.createMetricAnalysisService({
    gitlabToken: req.gitlabToken,
    projectPath: req.gitlabProject,
    anthropicApiKey: req.anthropicApiKey,
  });

  try {
    const analysis = await service.analyze(iterationIds);
    return res.json(analysis.toJSON());
  } catch (err) {
    if (err.name === 'LLMNotConfiguredError') {
      return res.status(503).json({ error: err.message });
    }

    logger.error('AI metric review failed', err, {
      route: 'POST /api/analysis/review',
    });

    return res.status(500).json({
      error: 'Analysis failed — the run has been persisted for debugging',
    });
  }
});

/**
 * POST /api/analysis/:id/chat
 * Stream a follow-up chat message against an existing analysis via Server-Sent Events.
 *
 * Body: { message: string }
 * Response: text/event-stream — delta, done, and error events
 */
router.post('/:id/chat', validateChatMessage, requireLLMClient, reviewLimiter, async (req, res) => {
  const { message } = req.body;
  const { id } = req.params;

  // Pre-check existence so we can return 404 JSON before switching to SSE
  const repo = ServiceFactory.createAnalysesRepository();
  const existing = await repo.findById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Analysis not found' });
  }

  const service = ServiceFactory.createMetricAnalysisService({
    gitlabToken: req.gitlabToken,
    projectPath: req.gitlabProject,
    anthropicApiKey: req.anthropicApiKey,
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    for await (const event of service.chatStream(id, message)) {
      if (event.type === 'done') {
        send({ type: 'done', analysis: event.analysis.toJSON() });
      } else {
        send(event);
      }
    }
  } catch (err) {
    logger.error('Chat stream failed', err, { route: 'POST /api/analysis/:id/chat', id });
    send({ type: 'error', message: 'Chat failed — please try again' });
  } finally {
    res.end();
  }
});

/**
 * GET /api/analysis
 * List all past analyses, newest first.
 */
router.get('/', async (req, res) => {
  try {
    const repo = ServiceFactory.createAnalysesRepository();
    const all = await repo.findAll();
    return res.json(all.map((a) => a.toJSON()));
  } catch (err) {
    logger.error('Failed to list analyses', err, { route: 'GET /api/analysis' });
    return res.status(500).json({ error: 'Failed to list analyses' });
  }
});

/**
 * GET /api/analysis/:id
 * Retrieve a single analysis by id.
 */
router.get('/:id', async (req, res) => {
  try {
    const repo = ServiceFactory.createAnalysesRepository();
    const analysis = await repo.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    return res.json(analysis.toJSON());
  } catch (err) {
    logger.error('Failed to fetch analysis', err, {
      route: 'GET /api/analysis/:id',
      id: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

export default router;
