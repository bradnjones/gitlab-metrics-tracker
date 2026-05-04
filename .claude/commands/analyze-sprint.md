# Sprint Metrics Statistical Analysis

Analyze the sprint metrics data for statistical signal vs. noise, trends, and process improvement opportunities.

## Instructions

1. Read `src/data/metrics.json` and `src/data/annotations.json` from the project root.

2. For each metric available in the data (velocity, throughput, cycle_time_avg, deployment_frequency, lead_time_avg, mttr_avg, change_failure_rate), compute:
   - **Mean** and **standard deviation**
   - **Coefficient of Variation (CV)** = (std dev / mean) × 100 — anything above 30% is high noise
   - **Control limits** (UCL = mean + 3σ, LCL = mean - 3σ) — points outside these are signals, not noise
   - **Trend direction** via linear regression slope — classify as Improving / Stable / Degrading with the slope magnitude
   - **Recent vs. historical** — compare the last 3 iterations against the overall mean (is the team improving or regressing lately?)

3. For each annotation in `src/data/annotations.json`:
   - Find iterations that fall within 1 iteration before and 2 iterations after the annotation date
   - For each metric the annotation claims to affect, compute the before/after mean difference
   - State whether the change was statistically meaningful (> 1σ shift) or within noise

4. Identify **outlier iterations** — any data point more than 2σ from the mean in any metric. These are genuine signals worth investigating.

5. Produce a structured report with these sections:

### Metric Health Summary
A table with columns: Metric | Mean | Std Dev | CV% | Trend | Status
- Status: 🟢 Stable (CV < 20%), 🟡 Noisy (CV 20–35%), 🔴 Highly Variable (CV > 35%)

### Signals (Real Changes Worth Acting On)
List only data points or periods that crossed control limits. For each: which metric, which iteration, direction, magnitude.

### Noise (Ignore These)
Briefly note any variation that stays within 1σ — things teams often over-react to that don't reflect real change.

### Annotation Impact Assessment
For each annotation, rate: Confirmed Impact / Inconclusive / No Detectable Effect, with the before/after delta.

### Trend Analysis
Which metrics are trending in the right direction? Which are degrading? Quantify ("velocity improving ~2 pts/sprint").

### Top 3 Process Recommendations
Based purely on the data patterns, what are the 3 highest-leverage things the team could change or investigate? Be specific — reference the metric, the trend, and the suggested experiment.

## Format

Use markdown with clear headers. Lead with the most important finding. Keep recommendations concrete and actionable — not generic agile advice.
