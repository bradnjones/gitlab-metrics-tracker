# AI Metric Review Feature

## Context

Today the dashboard surfaces six metrics (Velocity, Throughput, Cycle Time, Deployment Frequency, Lead Time, MTTR + Change Failure Rate) as charts. Users have to eyeball trends to decide if a movement is real, what's causing it, and what to do about it. The `analyze-sprint` Claude Code skill already specifies a rigorous analytical framework for this, but it requires a human in the Claude Code CLI — it can't be triggered from the app.

This feature adds a "Review with AI" button to the dashboard toolbar that produces an in-app, on-demand analyst report: signal vs noise per metric, cross-metric context, annotation impact assessment, and concrete process recommendations. Results persist so users can build a history of insights and (eventually) check whether acted-on recommendations moved the metrics.

## Locked Decisions

- **LLM**: Anthropic Claude API. Default model `claude-sonnet-4-6`. Override via `ANTHROPIC_MODEL` env var.
- **Scope**: One holistic run over all currently-displayed iterations. One button in `ChartsToolbar`.
- **Persistence**: `src/data/analyses.json`, atomic writes (mirrors `FileAnnotationsRepository`).
- **UX**: Modal (no streaming) rendering markdown via `react-markdown` + `remark-gfm`.
- **Feature gating**: Two-flag opt-in. Button shows but is disabled unless **both** `ANTHROPIC_API_KEY` is set **and** `AI_REVIEW_ENABLED=true` — second flag exists because enabling key presence alone would silently ship sprint metadata to a third party. Documented in `.env.example`.
- **Rate limit**: 10 POSTs/hour per IP via existing `express-rate-limit`. Client also disables the button while a request is in flight.
- **Iteration cap**: 100 ids per request, validated server-side.

## Architecture

```
Presentation:   AIReviewButton → useAIReview hook → POST /api/analysis/review
Server:         analysis.js route → ServiceFactory → MetricAnalysisService
Core:           MetricAnalysisService = MetricsService + AnnotationsRepo + SignalPackageBuilder + ILLMClient + IAnalysesRepository
Infrastructure: AnthropicLLMClient (only file importing @anthropic-ai/sdk), FileAnalysesRepository
```

**Critical design choice**: Statistics are computed deterministically server-side (reusing `src/lib/analysis/trendCalculator.js` and `src/lib/analysis/nelsonRules.js`). The LLM receives a structured "signal package" (mean, σ, CV, control limits, regression, Nelson rule violations, before/after annotation deltas in σ units) and is asked **only** to interpret, contextualize, and recommend — never to do arithmetic.

## Files to Create

| Path | Purpose |
|---|---|
| `src/lib/core/interfaces/ILLMClient.js` | Port: `generate({system, user, model, maxTokens})` → `{text, usage, model, latencyMs}` |
| `src/lib/core/interfaces/IAnalysesRepository.js` | Port: `save`, `findById`, `findAll` (desc by createdAt) |
| `src/lib/core/entities/Analysis.js` | Entity with `toJSON`/`fromJSON` |
| `src/lib/core/services/SignalPackageBuilder.js` | Pure: builds the deterministic JSON signal package |
| `src/lib/core/services/MetricAnalysisService.js` | Orchestrator: metrics + annotations + signals + LLM + persist |
| `src/lib/infrastructure/llm/AnthropicLLMClient.js` | Adapter wrapping `@anthropic-ai/sdk` |
| `src/lib/infrastructure/repositories/FileAnalysesRepository.js` | Atomic JSON file repo (copy patterns from `FileAnnotationsRepository`) |
| `src/server/routes/analysis.js` | `POST /api/analysis/review`, `GET /api/analysis`, `GET /api/analysis/:id` |
| `src/public/hooks/useAIReview.js` | Frontend hook: `run`, `loading`, `error`, `lastAnalysis`, `history` |
| `src/public/components/AIReviewModal.jsx` + `.styles.jsx` | Modal with markdown render, copy-as-md, focus trap, ESC close |
| `src/public/components/AIReviewButton.jsx` | Toolbar button with disabled tooltip + last-run timestamp |

## Files to Modify

- `src/server/services/ServiceFactory.js` — add `createAnalysesRepository`, `createLLMClient` (returns `null` if not configured), `createMetricAnalysisService`.
- `src/server/app.js` — mount `/api/analysis` route.
- `src/public/components/VelocityApp.jsx` (~line 528, `ChartsToolbar`) — render `<AIReviewButton>` and wire `useAIReview.run(displayedIterations.map(i => i.id))`. Use `displayedIterations` (post-filter) not `selectedIterations`.
- `package.json` — add `@anthropic-ai/sdk`, `react-markdown`, `remark-gfm`.
- `.env.example` — add `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_REVIEW_ENABLED` with comment about data egress.

## Reused Existing Code (do not reimplement)

- `src/lib/analysis/trendCalculator.js` — `linearRegression`, `classifyTrend`, `recentVsHistorical`
- `src/lib/analysis/nelsonRules.js` — SPC violation detection
- `src/lib/core/services/MetricsService.js` — `calculateMultipleMetrics`
- `src/lib/infrastructure/repositories/FileAnnotationsRepository.js` — atomic-write pattern (`_writeQueue`, `_recoverFromTmp`) to copy verbatim
- `src/lib/core/entities/Annotation.js` — annotation shape
- `src/server/routes/annotations.js` — route conventions
- `src/public/components/ChartEnlargementModal.jsx` + `.styles.jsx` — modal pattern
- `src/public/utils/apiFetch.js` — auth-aware fetch
- `src/public/styles/theme.js` — design tokens
- `.claude/commands/analyze-sprint.md` — written spec of desired output structure (system prompt cribs heavily from this)

## Signal Package Shape (server → LLM input)

```jsonc
{
  "schemaVersion": 1,
  "iterationRange": { "from": "...", "to": "...", "count": 16 },
  "metrics": {
    "velocity": {
      "higherIsBetter": true,
      "series": [{ "iterationId": "...", "title": "Sprint 42", "endDate": "...", "value": 38 }, ...],
      "summary": { "mean": 35.4, "stddev": 6.1, "cv": 17.2, "ucl": 53.7, "lcl": 17.1, "confidence": "high" },
      "trend": { "slope": 0.42, "intercept": 32.1, "r2": 0.31, "classification": "improving" },
      "recentVsHistorical": { "recentMean": 39.7, "historicalMean": 35.4, "delta": 4.3, "deltaPct": 12.1 },
      "nelsonViolations": { "rule1": [...], "rule2": [...], "rule3": [...] },
      "status": "stable"
    },
    "throughput": {...}, "cycleTimeAvg": {...}, "deploymentFrequency": {...},
    "leadTimeAvg": {...}, "mttrAvg": {...}, "changeFailureRate": {...}
  },
  "annotations": [{
    "id": "...", "date": "...", "title": "...", "eventType": "Process", "impact": "Positive",
    "affectedMetrics": ["velocity"],
    "beforeAfter": { "velocity": { "beforeMean": 32.0, "afterMean": 38.2, "deltaSigmas": 1.02, "verdict": "meaningful" } }
  }]
}
```

Window for `beforeAfter`: 1 iteration before, 2 after (matches `analyze-sprint.md` spec). Set `summary.confidence: "low"` when fewer than 5 iterations selected.

## System Prompt Shape

Stable system prompt (cache with `cache_control: { type: "ephemeral" }` for prompt-cache discounts on repeat calls within 5 min). Tells the LLM:

- It's a Sprint Metrics Analyst receiving pre-computed stats.
- Job is interpretation, not arithmetic. Trust the numbers.
- Distinguish signal (3σ, ≥1σ post-annotation shifts, Nelson hits) from noise (within ±1σ).
- Output sections in fixed order: Headline → Metric Health Table → Signals → Noise → Annotation Impact → Trends → Top 3 Recommendations.
- Cite specific iteration titles + numeric deltas; no hedging language.
- Emoji status: 🟢 CV<20%, 🟡 20–35%, 🔴 >35%.
- Concrete experiments, not generic agile platitudes.
- Reduce confidence claims when `confidence: "low"`.

## `analyses.json` Entry Shape

```jsonc
{
  "id": "uuid",
  "schemaVersion": 1,
  "createdAt": "ISO",
  "iterationIds": [...],
  "iterationRange": { "from": "...", "to": "..." },
  "annotationIds": [...],          // snapshot — annotations are mutable, analysis isn't
  "inputsDigest": "sha256:...",    // SHA-256 of canonicalized signalPackage; enables "unchanged since last review"
  "signalPackage": {...},          // full deterministic input — invaluable for debugging "why did the LLM say X"
  "model": "claude-sonnet-4-6",
  "systemPrompt": "...",            // separated from user — system rarely changes, helps caching/debugging
  "userPrompt": "...",
  "response": "markdown",
  "usage": { "input": 4123, "output": 1567 },
  "latencyMs": 8400,
  "status": "succeeded",            // or "failed" — persist failures too for debugging
  "errorMessage": null
}
```

## Build Order (each = one trunk commit, TDD)

1. **`SignalPackageBuilder` + `ILLMClient` interface** — pure unit; fixture-driven tests assert hand-computed mean/CV/slope; verify `beforeAfter` window.
2. **`AnthropicLLMClient`** — mock `@anthropic-ai/sdk`. Tests: default model, env override, missing key throws `LLMNotConfiguredError`, latency measured, usage extracted, network error path.
3. **`Analysis` entity + `IAnalysesRepository` + `FileAnalysesRepository`** — copy `FileAnnotationsRepository` test suite; verify `.tmp` recovery.
4. **`MetricAnalysisService`** — mock all 5 deps; assert call order; success persists `succeeded` analysis; LLM error persists `failed` analysis with `errorMessage`. Inject `clock` for stable timestamps. `inputsDigest` = canonicalized SHA-256.
5. **`ServiceFactory` wiring** — `createLLMClient` returns `null` when key/flag missing; factory tests cover null-LLM path.
6. **Route `analysis.js` + mount** — `supertest` integration tests: 200 happy path, 503 not configured, 400 invalid body, 400 >100 ids, 429 rate limit, 500 LLM error (still persisted).
7. **`useAIReview` hook** — mock `apiFetch`; test `run`, `loading`, `error`, history auto-load.
8. **`AIReviewModal`** — RTL tests: renders markdown table, ESC closes, copy-to-clipboard works, displays model + usage + timestamp.
9. **`AIReviewButton` + wire into `ChartsToolbar`** — click sends `displayedIterations` ids; tooltip when disabled; "Last reviewed X min ago" text once `lastAnalysis` exists; success opens modal.

History view (list past analyses, re-open in modal) — defer to a follow-up commit; keep MVP scope tight.

## Verification

1. `npm test` green; `npm run test:coverage` ≥85% on every new file.
2. `npm run lint` clean.
3. With `ANTHROPIC_API_KEY` + `AI_REVIEW_ENABLED=true` set, `npm run dev` → load dashboard with ~10 iterations → click "Review with AI" → modal shows markdown report with Metric Health table → `src/data/analyses.json` contains entry with all fields populated, including `signalPackage` and `usage`.
4. Unset `AI_REVIEW_ENABLED`, reload → button visible, disabled, tooltip "AI review not configured".
5. Spam-click button → second click no-op (in-flight); 11th click in an hour → server returns 429.
6. Hand-pick an iteration where annotation `deltaSigmas > 1` → confirm LLM's "Confirmed/Inconclusive/No Effect" verdict matches deterministic `beforeAfter.verdict`.
7. Inspect `analyses.json`: `signalPackage` round-trips, `usage` reasonable (~3–5k input tokens).
8. `docker compose up --build -d` → repeat steps 3–4 inside container.

## Risks / Notes

- **Coverage on `AnthropicLLMClient`**: hard to reach 85% without granular mocking — plan branches: success, network error, 401, 429, malformed response.
- **Token budget**: 100 iterations × 7 metrics ≈ 30KB user prompt — fine. Cap enforced server-side.
- **Privacy**: signal package contains iteration titles. `AI_REVIEW_ENABLED` is the explicit opt-in for data egress to Anthropic; documented in `.env.example`.
- **History view deferred**: `GET /api/analysis` is built and tested in step 6 so the UI can be added later without server changes.
