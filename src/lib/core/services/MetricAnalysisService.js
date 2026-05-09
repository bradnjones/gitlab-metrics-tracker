/**
 * Orchestrates the AI metric review pipeline:
 * fetch metrics → fetch annotations → build signal package → call LLM → persist.
 *
 * @module core/services/MetricAnalysisService
 */

import { createHash } from 'crypto';
import { Analysis } from '../entities/Analysis.js';
import { SignalPackageBuilder } from './SignalPackageBuilder.js';

/**
 * Thrown when analyze() is called but no LLM client is configured.
 * Separate from the infrastructure-layer LLMNotConfiguredError so the core
 * layer has no outward dependency on infrastructure.
 */
export class LLMNotConfiguredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LLMNotConfiguredError';
  }
}

/**
 * Thrown when chatStream() is called with an analysis ID that does not exist.
 */
export class AnalysisNotFoundError extends Error {
  /** @param {string} id */
  constructor(id) {
    super(`Analysis not found: ${id}`);
    this.name = 'AnalysisNotFoundError';
  }
}

/** System prompt sent to the LLM for every analysis request. */
const SYSTEM_PROMPT = `You are a Sprint Metrics Analyst. You receive a pre-computed JSON signal package containing statistical summaries of team sprint metrics. Your job is interpretation, contextualization, and recommendation — never arithmetic. Trust the numbers exactly as given.

## Analytical Framework

**Signal vs Noise**
- Signal: data points outside 3σ control limits, Nelson rule violations (rule1/rule2/rule3), or annotation-correlated shifts ≥ 1σ (deltaSigmas ≥ 1, verdict = "meaningful")
- Noise: variation within ±1σ — teams commonly over-react to this; note it so they don't

**Status emoji** (based on CV in summary.cv):
- 🟢 CV < 20% — stable
- 🟡 CV 20–35% — noisy
- 🔴 CV > 35% — highly variable

**Confidence caveat**: When summary.confidence = "low" (fewer than 5 iterations), prefix all findings with an explicit caveat that the sample is too small for reliable conclusions.

## Required Output Sections (in this exact order)

1. **Headline** — one sentence: the single most important finding
2. **Metric Health Table** — markdown table: Metric | Mean | Std Dev | CV% | Trend | Status (emoji)
3. **Signals** — real changes worth acting on; cite specific iteration titles and numeric deltas
4. **Noise** — variation to ignore; be brief
5. **Annotation Impact** — for each annotation: Confirmed Impact / Inconclusive / No Detectable Effect, with before/after delta in σ units
6. **Trend Analysis** — which metrics are improving or degrading; quantify ("velocity improving ~2 pts/sprint")
7. **Top 3 Recommendations** — concrete experiments, not generic agile advice; reference the specific metric and suggest a measurable experiment

## Style Rules
- No hedging language ("it appears", "might be", "could suggest") — be direct
- Cite specific iteration titles and numeric values from the data
- Under 1200 words total
- Use the higherIsBetter flag to frame whether a trend is good or bad`;

/**
 * MetricAnalysisService — Core orchestrator for AI metric review.
 *
 * Dependencies are injected; no concrete infrastructure imports.
 */
export class MetricAnalysisService {
  /**
   * @param {Object} deps
   * @param {import('./MetricsService.js').MetricsService} deps.metricsService
   * @param {import('../interfaces/IAnnotationsRepository.js').IAnnotationsRepository} deps.annotationsRepository
   * @param {import('../interfaces/ILLMClient.js').ILLMClient|null} deps.llmClient - null when AI not configured
   * @param {import('../interfaces/IAnalysesRepository.js').IAnalysesRepository} deps.analysesRepository
   * @param {function(): Date} [deps.clock] - Injectable for stable test timestamps
   */
  constructor({ metricsService, annotationsRepository, llmClient, analysesRepository, clock }) {
    this._metricsService = metricsService;
    this._annotationsRepository = annotationsRepository;
    this._llmClient = llmClient;
    this._analysesRepository = analysesRepository;
    this._clock = clock || (() => new Date());
  }

  /**
   * Run a full AI metric review for the given iterations.
   *
   * @param {string[]} iterationIds
   * @returns {Promise<Analysis>} The persisted Analysis entity (status='succeeded')
   * @throws {LLMNotConfiguredError} If llmClient is null
   * @throws {Error} If the LLM call fails (after persisting a failed Analysis)
   */
  async analyze(iterationIds) {
    if (this._llmClient === null) {
      throw new LLMNotConfiguredError(
        'AI review is not configured — set ANTHROPIC_API_KEY and AI_REVIEW_ENABLED=true'
      );
    }

    // 1. Compute metrics and fetch annotations
    const metrics = await this._metricsService.calculateMultipleMetrics(iterationIds);
    const annotations = await this._annotationsRepository.findAll();

    // 2. Build deterministic signal package
    const signalPackage = SignalPackageBuilder.build({ metrics, annotations });

    // 3. Compute a digest so the UI can detect "nothing changed since last review"
    const inputsDigest = 'sha256:' + createHash('sha256')
      .update(JSON.stringify(signalPackage))
      .digest('hex');

    // 4. Build prompts
    const systemPrompt = SYSTEM_PROMPT;
    const userPrompt = `Analyze the following sprint metrics signal package:\n\n${JSON.stringify(signalPackage, null, 2)}`;

    // 5. Derive iteration range and annotation IDs for the entity
    const iterationRange = signalPackage.iterationRange;
    const annotationIds = annotations.map((a) => a.id);
    const createdAt = this._clock().toISOString();

    // 6. Call the LLM — persist failure if it throws
    let llmResult;
    try {
      llmResult = await this._llmClient.generate({ system: systemPrompt, user: userPrompt });
    } catch (err) {
      const failedAnalysis = new Analysis({
        createdAt,
        iterationIds,
        iterationRange,
        annotationIds,
        inputsDigest,
        signalPackage,
        model: null,
        systemPrompt,
        userPrompt,
        response: null,
        usage: null,
        latencyMs: null,
        status: 'failed',
        errorMessage: err.message,
      });
      await this._analysesRepository.save(failedAnalysis);
      throw err;
    }

    // 7. Persist and return the succeeded analysis
    const analysis = new Analysis({
      createdAt,
      iterationIds,
      iterationRange,
      annotationIds,
      inputsDigest,
      signalPackage,
      model: llmResult.model,
      systemPrompt,
      userPrompt,
      response: llmResult.text,
      usage: llmResult.usage,
      latencyMs: llmResult.latencyMs,
      status: 'succeeded',
      errorMessage: null,
    });

    await this._analysesRepository.save(analysis);
    return analysis;
  }

  /**
   * Stream an AI metric review for the given iterations.
   * Yields `{ type: 'delta', text }` events from the LLM, then
   * `{ type: 'done', analysis }` with the persisted Analysis on completion.
   * On LLM failure yields `{ type: 'error', message }` and persists a failed Analysis.
   *
   * @param {string[]} iterationIds
   * @yields {{ type: 'delta', text: string } | { type: 'done', analysis: Analysis } | { type: 'error', message: string }}
   * @throws {LLMNotConfiguredError} If llmClient is null
   */
  async *analyzeStream(iterationIds) {
    if (this._llmClient === null) {
      throw new LLMNotConfiguredError(
        'AI review is not configured — set ANTHROPIC_API_KEY and AI_REVIEW_ENABLED=true'
      );
    }

    // 1. Compute metrics and fetch annotations
    const metrics = await this._metricsService.calculateMultipleMetrics(iterationIds);
    const annotations = await this._annotationsRepository.findAll();

    // 2. Build deterministic signal package
    const signalPackage = SignalPackageBuilder.build({ metrics, annotations });

    // 3. Compute digest
    const inputsDigest = 'sha256:' + createHash('sha256')
      .update(JSON.stringify(signalPackage))
      .digest('hex');

    // 4. Build prompts
    const systemPrompt = SYSTEM_PROMPT;
    const userPrompt = `Analyze the following sprint metrics signal package:\n\n${JSON.stringify(signalPackage, null, 2)}`;

    // 5. Derive iteration range and annotation IDs
    const iterationRange = signalPackage.iterationRange;
    const annotationIds = annotations.map((a) => a.id);
    const createdAt = this._clock().toISOString();

    // 6. Stream from the LLM, passing deltas through
    let llmDone = null;

    try {
      for await (const event of this._llmClient.stream({ system: systemPrompt, user: userPrompt })) {
        if (event.type === 'delta') {
          yield event;
        } else if (event.type === 'done') {
          llmDone = event;
        }
      }
    } catch (err) {
      const failedAnalysis = new Analysis({
        createdAt,
        iterationIds,
        iterationRange,
        annotationIds,
        inputsDigest,
        signalPackage,
        model: null,
        systemPrompt,
        userPrompt,
        response: null,
        usage: null,
        latencyMs: null,
        status: 'failed',
        errorMessage: err.message,
      });
      await this._analysesRepository.save(failedAnalysis);
      yield { type: 'error', message: err.message };
      return;
    }

    // 7. Persist and yield the succeeded analysis
    const analysis = new Analysis({
      createdAt,
      iterationIds,
      iterationRange,
      annotationIds,
      inputsDigest,
      signalPackage,
      model: llmDone?.model ?? null,
      systemPrompt,
      userPrompt,
      response: llmDone?.text ?? null,
      usage: llmDone?.usage ?? null,
      latencyMs: llmDone?.latencyMs ?? null,
      status: 'succeeded',
      errorMessage: null,
    });

    await this._analysesRepository.save(analysis);
    yield { type: 'done', analysis };
  }

  /**
   * Stream a follow-up chat message against an existing analysis.
   * Reconstructs the full conversation thread and sends it to the LLM via streamConversation().
   * On completion, appends the user/assistant turn to conversationHistory and re-saves the analysis.
   *
   * @param {string} analysisId
   * @param {string} message - The user's follow-up message
   * @yields {{ type: 'delta', text: string } | { type: 'done', analysis: Analysis } | { type: 'error', message: string }}
   * @throws {LLMNotConfiguredError} If llmClient is null
   * @throws {AnalysisNotFoundError} If no analysis exists with the given ID
   */
  async *chatStream(analysisId, message) {
    if (this._llmClient === null) {
      throw new LLMNotConfiguredError(
        'AI review is not configured — set ANTHROPIC_API_KEY and AI_REVIEW_ENABLED=true'
      );
    }

    const analysis = await this._analysesRepository.findById(analysisId);
    if (!analysis) {
      throw new AnalysisNotFoundError(analysisId);
    }

    // Reconstruct full conversation: original turn + any prior chat + new user message
    const messages = [
      { role: 'user', content: analysis.userPrompt },
      { role: 'assistant', content: analysis.response },
      ...analysis.conversationHistory,
      { role: 'user', content: message },
    ];

    let fullText = '';

    try {
      for await (const event of this._llmClient.streamConversation({
        system: SYSTEM_PROMPT,
        messages,
      })) {
        if (event.type === 'delta') {
          fullText += event.text;
          yield event;
        } else if (event.type === 'done') {
          fullText = event.text;
        }
      }
    } catch (err) {
      yield { type: 'error', message: err.message };
      return;
    }

    // Append the completed turn to conversationHistory and persist
    const updatedHistory = [
      ...analysis.conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: fullText },
    ];

    const updatedAnalysis = Analysis.fromJSON({
      ...analysis.toJSON(),
      conversationHistory: updatedHistory,
    });

    await this._analysesRepository.save(updatedAnalysis);
    yield { type: 'done', analysis: updatedAnalysis };
  }
}
