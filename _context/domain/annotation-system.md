# Annotation System Guide

**Version:** 1.0
**Last Updated:** 2025-01-06
**Prototype Reference:** `/Users/brad/dev/smi/gitlab-sprint-metrics/src/lib/correlations.js`

---

## Overview

The Annotation System is a core feature that makes metrics actionable by capturing contextual events that impact sprint performance. This document defines the annotation types, impact detection, correlation analysis, and recommendation generation based on the working prototype.

**Key Principle:** Raw metrics tell you WHAT changed. Annotations tell you WHY. Together, they enable data-driven continuous improvement.

---

## Why Annotations Matter

### The Problem: Metrics Without Context

**Scenario:** Velocity drops from 42 points to 28 points.

**Without annotations:**
- "Velocity dropped 33%. That's bad."
- No explanation
- No action to take
- Pattern repeats

**With annotations:**
- "Velocity dropped 33% after we adopted new code review process (annotation: Process change, 2024-01-05)"
- Clear cause identified
- Can evaluate if process change is worth the velocity impact
- Can track if velocity recovers over time
- Future process changes can be compared to this baseline

### Benefits

1. **Build institutional memory** - Capture why metrics changed
2. **Enable correlation analysis** - Link events to metric changes
3. **Detect patterns** - Identify recurring impacts
4. **Generate recommendations** - Suggest what to repeat or avoid
5. **Tell stories** - Metrics with context are compelling narratives

---

## Five Event Types

The prototype identified five event types that cover ~95% of real-world scenarios.

### 1. Process (Process Changes)

**Definition:** Changes to team workflows, methodologies, or procedures.

**Examples:**
- Adopted pair programming
- Changed sprint length from 2 weeks to 1 week
- Implemented new code review process
- Started daily standups
- Changed definition of done

**Typical Impact:**
- **Short-term:** Often negative (learning curve, adjustment period)
- **Long-term:** Usually positive (improved efficiency)

**Icon:** ⚙️
**Color:** #3498db (Blue)

### 2. Team (Team Changes)

**Definition:** Changes to team composition or structure.

**Examples:**
- New team member onboarded
- Team member left
- Organizational restructure
- Team split into two squads
- Cross-functional collaboration started

**Typical Impact:**
- **New members:** Temporary velocity drop (ramp-up time)
- **Member departure:** Velocity drop (knowledge loss)
- **Restructure:** Variable (depends on execution)

**Icon:** 👥
**Color:** #2ecc71 (Green)

### 3. Tooling (Tool/Technology Changes)

**Definition:** Changes to development tools, frameworks, or infrastructure.

**Examples:**
- Migrated to new CI/CD platform
- Upgraded to React 18
- Adopted TypeScript
- Changed from Jenkins to GitLab CI
- Introduced new testing framework

**Typical Impact:**
- **Initial:** Negative (learning, migration effort)
- **Steady state:** Positive (improved productivity)

**Icon:** 🔧
**Color:** #9b59b6 (Purple)

### 4. External (External Events)

**Definition:** Events outside team control that impact work.

**Examples:**
- Holidays (Christmas, New Year)
- Company all-hands meeting
- Major dependency release (breaking changes)
- External vendor outage
- Regulatory requirement change

**Typical Impact:**
- Variable (depends on event)
- Often temporary disruption

**Icon:** 🌐
**Color:** #e74c3c (Red)

### 5. Incident (Production Incidents)

**Definition:** Production issues requiring urgent response.

**Examples:**
- Production outage
- Security breach
- Data corruption
- Critical bug requiring hotfix
- Performance degradation

**Typical Impact:**
- **Immediate:** Disrupts planned work
- **Metrics affected:** MTTR, deployment frequency, cycle time
- **Velocity impact:** Usually negative (work diverted)

**Icon:** 🚨
**Color:** #e67e22 (Orange)

---

## Impact Levels

Each annotation declares an **expected impact** (what the team predicts) and the system **detects actual impact** (what the data shows).

### Positive Impact

**Definition:** Event expected to improve metrics.

**Examples:**
- Adopted automated testing → expect faster cycle time
- New senior developer joined → expect higher velocity
- Upgraded CI/CD → expect more frequent deployments

**Metrics:**
- Velocity: Increase
- Throughput: Increase
- Cycle time: Decrease (lower is better)
- Deployment frequency: Increase
- Lead time: Decrease (lower is better)

### Negative Impact

**Definition:** Event expected to worsen metrics temporarily or permanently.

**Examples:**
- Key developer left → expect lower velocity
- Production incident → expect longer MTTR
- Major refactoring sprint → expect lower throughput

**Metrics:**
- Velocity: Decrease
- Throughput: Decrease
- Cycle time: Increase (higher is worse)
- Deployment frequency: Decrease
- Lead time: Increase (higher is worse)

### Neutral Impact

**Definition:** Event not expected to significantly affect metrics (or unknown impact).

**Examples:**
- Documentation sprint
- Team building event
- Minor dependency update
- Holiday (predictable, planned around)

**Metrics:**
- No significant change expected

---

## Multi-Metric Linking

One event can affect multiple metrics simultaneously.

### Example: New CI/CD Platform

**Annotation:**
- Title: "Migrated from Jenkins to GitLab CI"
- Type: Tooling
- Date: 2024-01-15
- Impact: Positive (long-term)
- Affected metrics: `['deployment_frequency', 'lead_time_avg', 'cycle_time_avg']`

**Expected outcomes:**
- Deployment frequency: Increase (faster pipelines)
- Lead time: Decrease (automated deployments)
- Cycle time: Decrease (faster feedback loops)

**Actual detection (3 sprints later):**
- Deployment frequency: +45% (0.2 → 0.29 per day)
- Lead time: -30% (4.5 → 3.2 days)
- Cycle time: -15% (6.2 → 5.3 days)

**Result:** Positive impact confirmed across all three metrics.

---

## Timeline Visualization

Annotations appear as **vertical lines** on metric charts with event type icons.

### Chart Integration

```javascript
// Chart.js annotation plugin configuration
const chartOptions = {
  plugins: {
    annotation: {
      annotations: annotations.map(annotation => ({
        type: 'line',
        mode: 'vertical',
        scaleID: 'x',
        value: annotation.date,
        borderColor: getEventTypeColor(annotation.type),
        borderWidth: 2,
        label: {
          content: `${getEventTypeIcon(annotation.type)} ${annotation.title}`,
          enabled: true,
          position: 'top'
        }
      }))
    }
  }
};
```

### Visual Example

```
Velocity Chart
60 |
50 |     ●
40 |         ●     ●
30 |               │    ●                ← Process change marker
20 |               │        ●     ●
10 |_______________│____________________
   Sprint 1    Sprint 2    Sprint 3
               ⚙️ New code review
                 (Process, Negative)
```

**Insight:** Velocity dropped after process change, but recovering.

---

## Correlation Analysis

### Before/After Impact Detection

**Algorithm (from prototype):**

1. **Find annotation date**
2. **Get sprints before annotation** (last 3 sprints)
3. **Get sprints after annotation** (first 3 sprints)
4. **Calculate before mean** (average of metric in before window)
5. **Calculate after mean** (average of metric in after window)
6. **Compute percent change:** `(after - before) / before * 100`
7. **Determine significance:** `|percent_change| > 10%` = significant
8. **Detect impact direction:**
   - For "higher is better" metrics (velocity, throughput, deployment frequency):
     - Positive change (>10%) = Positive impact
     - Negative change (<-10%) = Negative impact
   - For "lower is better" metrics (cycle time, lead time, MTTR):
     - Negative change (<-10%) = Positive impact
     - Positive change (>10%) = Negative impact

### Example: Process Change Impact

**Annotation:**
- Title: "Adopted pair programming"
- Date: 2024-01-15
- Type: Process
- Declared impact: Positive

**Metrics before (3 sprints):**
- Velocity: [38, 42, 40] → Mean: 40 points

**Metrics after (3 sprints):**
- Velocity: [35, 32, 36] → Mean: 34.3 points

**Analysis:**
- Percent change: `(34.3 - 40) / 40 * 100 = -14.25%`
- Significant: Yes (|14.25%| > 10%)
- Detected impact: Negative (velocity decreased)
- Matches declared: No (declared Positive, detected Negative)

**Interpretation:**
- Pair programming initially decreased velocity (learning curve)
- Need to monitor longer term (may improve later)
- Consider if quality improvements offset velocity decrease

### Implementation (from prototype)

```javascript
// src/lib/correlations.js (lines 3-89)

export function detectImpact(metrics, annotations) {
  const impacts = [];

  for (const annotation of annotations) {
    const annotationDate = new Date(annotation.date);

    // Find metrics before and after
    const before = metrics.filter(m => new Date(m.end_date) < annotationDate);
    const after = metrics.filter(m => new Date(m.start_date) >= annotationDate);

    if (before.length === 0 || after.length === 0) continue;

    // 3-sprint window
    const beforeWindow = before.slice(-3);
    const afterWindow = after.slice(0, 3);

    const impact = {
      annotation_id: annotation.id,
      annotation_title: annotation.title,
      annotation_date: annotation.date,
      annotation_type: annotation.type,
      declared_impact: annotation.impact,
      metrics: {}
    };

    // Analyze each affected metric
    const metricsToAnalyze = annotation.affected_metrics || [
      'velocity_points', 'throughput', 'cycle_time_avg',
      'deployment_frequency', 'lead_time_avg', 'mttr_avg'
    ];

    for (const metricKey of metricsToAnalyze) {
      const beforeValues = beforeWindow.map(m => m[metricKey]).filter(v => v != null);
      const afterValues = afterWindow.map(m => m[metricKey]).filter(v => v != null);

      if (beforeValues.length === 0 || afterValues.length === 0) continue;

      const beforeMean = mean(beforeValues);
      const afterMean = mean(afterValues);
      const percentChange = ((afterMean - beforeMean) / beforeMean) * 100;

      // Significance threshold: 10%
      const isSignificant = Math.abs(percentChange) > 10;

      // Lower is better for these metrics
      const lowerIsBetter = ['cycle_time_avg', 'lead_time_avg', 'mttr_avg'].includes(metricKey);

      let detectedImpact = 'neutral';
      if (isSignificant) {
        if (lowerIsBetter) {
          detectedImpact = percentChange < 0 ? 'positive' : 'negative';
        } else {
          detectedImpact = percentChange > 0 ? 'positive' : 'negative';
        }
      }

      impact.metrics[metricKey] = {
        before_mean: beforeMean,
        after_mean: afterMean,
        percent_change: percentChange,
        is_significant: isSignificant,
        detected_impact: detectedImpact,
        matches_declared: detectedImpact === annotation.impact
      };
    }

    impacts.push(impact);
  }

  return impacts;
}
```

---

## Pattern Recognition

**Goal:** Identify consistent patterns across event types.

### Algorithm (from prototype)

1. **Group annotations by type** (Process, Team, Tooling, etc.)
2. **For each type, analyze all annotations:**
   - Detect impact for each annotation
   - Aggregate impacts per metric
3. **Calculate consistency:**
   - Count positive impacts vs. negative impacts
   - Consistency = `max(positive_count, negative_count) / total_significant_count`
4. **Identify typical impact:**
   - If 70%+ consistent → strong pattern
   - Typical impact = majority direction (positive or negative)

### Example: Tooling Changes Pattern

**Scenario:** Team has made 5 tooling changes over 2 years.

**Impact analysis:**

| Annotation | Deployment Frequency Impact |
|------------|----------------------------|
| Migrated to GitLab CI | +45% (positive) |
| Adopted Docker | +30% (positive) |
| Upgraded Node.js | +12% (positive) |
| Changed to ESLint | -5% (neutral, <10%) |
| Adopted Prettier | +8% (neutral, <10%) |

**Pattern detection:**
- Significant impacts: 3 positive, 0 negative
- Consistency: 3/3 = 100%
- Typical impact: Positive
- Average change: +29%

**Recommendation:** Tooling changes consistently improve deployment frequency. Continue investing in tooling improvements.

### Implementation (from prototype)

```javascript
// src/lib/correlations.js (lines 91-149)

export function findPatterns(metrics, annotations) {
  const patterns = [];

  // Group by type
  const annotationsByType = annotations.reduce((acc, annotation) => {
    if (!acc[annotation.type]) acc[annotation.type] = [];
    acc[annotation.type].push(annotation);
    return acc;
  }, {});

  // Analyze patterns per type
  for (const [type, typeAnnotations] of Object.entries(annotationsByType)) {
    const impacts = typeAnnotations.map(a => detectImpact(metrics, [a])[0]);

    const metricImpacts = {};
    for (const impact of impacts) {
      for (const [metricKey, metricData] of Object.entries(impact.metrics)) {
        if (!metricImpacts[metricKey]) metricImpacts[metricKey] = [];
        metricImpacts[metricKey].push(metricData);
      }
    }

    const pattern = {
      type,
      occurrence_count: typeAnnotations.length,
      metrics: {}
    };

    for (const [metricKey, impacts] of Object.entries(metricImpacts)) {
      const significantImpacts = impacts.filter(i => i.is_significant);
      const positiveImpacts = significantImpacts.filter(i => i.detected_impact === 'positive');
      const negativeImpacts = significantImpacts.filter(i => i.detected_impact === 'negative');

      if (significantImpacts.length > 0) {
        pattern.metrics[metricKey] = {
          affected_count: significantImpacts.length,
          positive_count: positiveImpacts.length,
          negative_count: negativeImpacts.length,
          consistency: Math.max(positiveImpacts.length, negativeImpacts.length) / significantImpacts.length,
          typical_impact: positiveImpacts.length > negativeImpacts.length ? 'positive' : 'negative',
          avg_change: mean(significantImpacts.map(i => i.percent_change))
        };
      }
    }

    patterns.push(pattern);
  }

  return patterns;
}
```

---

## Recommendations Generation

**Goal:** Provide actionable insights based on impact detection and pattern recognition.

### Recommendation Types

#### 1. Mismatch Alerts (Medium Priority)

**When:** Declared impact doesn't match detected impact.

**Example:**
- **Annotation:** "New testing framework" (declared: Positive)
- **Detection:** Cycle time increased 18% (detected: Negative)
- **Recommendation:** "Review 'New testing framework' impact assessment. The cycle_time_avg metric shows a negative impact (18% increase), but the annotation was marked as positive."

#### 2. Replicate Success (High Priority)

**When:** Event type consistently shows positive impact (≥70% consistency, ≥2 occurrences).

**Example:**
- **Pattern:** Tooling changes improved deployment frequency 4 out of 4 times (+35% average)
- **Recommendation:** "Tooling changes consistently improve deployment_frequency. 4 out of 4 events improved deployment_frequency by an average of 35%. Consider applying similar changes."

#### 3. Avoid Negative Patterns (High Priority)

**When:** Event type consistently shows negative impact (≥70% consistency, ≥2 occurrences).

**Example:**
- **Pattern:** Process changes decreased velocity 3 out of 4 times (-22% average)
- **Recommendation:** "Process changes tend to negatively impact velocity. 3 out of 4 events worsened velocity by an average of 22%. Consider alternative approaches or longer evaluation periods."

#### 4. Add Missing Annotations (Low Priority)

**When:** High variance in metrics without corresponding annotations.

**Example:**
- **Detection:** Velocity swung from 45 to 28 to 52 over 3 sprints, but no annotations
- **Recommendation:** "High variance detected in velocity. Consider adding annotations to document events that may have influenced these changes."

### Implementation (from prototype)

```javascript
// src/lib/correlations.js (lines 151-226)

export function generateRecommendations(impacts, patterns) {
  const recommendations = [];

  // 1. Mismatch alerts
  for (const impact of impacts) {
    for (const [metricKey, metricData] of Object.entries(impact.metrics)) {
      if (metricData.is_significant && !metricData.matches_declared) {
        recommendations.push({
          type: 'mismatch',
          priority: 'medium',
          title: `Review "${impact.annotation_title}" impact assessment`,
          description: `The ${metricKey} metric shows a ${metricData.detected_impact} impact (${metricData.percent_change.toFixed(1)}% change), but the annotation was marked as ${impact.declared_impact}.`,
          annotation_id: impact.annotation_id,
          metric: metricKey
        });
      }
    }
  }

  // 2. Replicate success
  for (const pattern of patterns) {
    for (const [metricKey, metricData] of Object.entries(pattern.metrics)) {
      if (metricData.consistency > 0.7 &&
          metricData.typical_impact === 'positive' &&
          metricData.positive_count >= 2) {
        recommendations.push({
          type: 'replicate_success',
          priority: 'high',
          title: `${pattern.type} changes consistently improve ${metricKey}`,
          description: `${metricData.positive_count} out of ${metricData.affected_count} "${pattern.type}" events improved ${metricKey} by an average of ${metricData.avg_change.toFixed(1)}%. Consider applying similar changes.`,
          pattern_type: pattern.type,
          metric: metricKey
        });
      }
    }
  }

  // 3. Avoid negative patterns
  for (const pattern of patterns) {
    for (const [metricKey, metricData] of Object.entries(pattern.metrics)) {
      if (metricData.consistency > 0.7 &&
          metricData.typical_impact === 'negative' &&
          metricData.negative_count >= 2) {
        recommendations.push({
          type: 'avoid_pattern',
          priority: 'high',
          title: `${pattern.type} changes tend to negatively impact ${metricKey}`,
          description: `${metricData.negative_count} out of ${metricData.affected_count} "${pattern.type}" events worsened ${metricKey} by an average of ${Math.abs(metricData.avg_change).toFixed(1)}%. Consider alternative approaches.`,
          pattern_type: pattern.type,
          metric: metricKey
        });
      }
    }
  }

  // Sort by priority (high, medium, low)
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
```

---

## Annotation Data Model

### Schema

```javascript
/**
 * Annotation object
 * @typedef {Object} Annotation
 * @property {string} id - Unique identifier (UUID)
 * @property {string} title - Annotation title (e.g., "Adopted pair programming")
 * @property {string} description - Detailed description (optional)
 * @property {'process'|'team'|'tooling'|'external'|'incident'} type - Event type
 * @property {'positive'|'negative'|'neutral'} impact - Declared impact
 * @property {Date} date - Event date
 * @property {Array<string>} affected_metrics - Metrics expected to be affected
 * @property {Date} created_at - Annotation creation timestamp
 * @property {string} created_by - User who created annotation (optional)
 */
```

### Example

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Migrated to GitLab CI",
  "description": "Moved from Jenkins to GitLab CI for faster pipelines and better integration",
  "type": "tooling",
  "impact": "positive",
  "date": "2024-01-15T00:00:00Z",
  "affected_metrics": [
    "deployment_frequency",
    "lead_time_avg",
    "cycle_time_avg"
  ],
  "created_at": "2024-01-15T14:30:00Z",
  "created_by": "team@example.com"
}
```

---

## User Interface

### Annotation Modal (Keyboard Shortcut: Ctrl+N)

**Fields:**
1. **Title** (required) - Short description
2. **Type** (required) - Dropdown: Process, Team, Tooling, External, Incident
3. **Impact** (required) - Radio: Positive, Negative, Neutral
4. **Date** (required) - Date picker
5. **Affected Metrics** (optional) - Multi-select: Velocity, Throughput, Cycle Time, etc.
6. **Description** (optional) - Detailed notes

**Actions:**
- Save - Create annotation
- Cancel - Close modal

### Annotations List

**Display:**
- Table view with columns: Date, Title, Type (icon + name), Impact (color-coded)
- Sort by date (newest first)
- Filter by type, impact
- Search by title

**Actions:**
- Edit - Update annotation
- Delete - Remove annotation (with confirmation)

### Insights View

**Sections:**
1. **Impact Detection** - Before/after analysis for each annotation
2. **Pattern Recognition** - Patterns by event type
3. **Recommendations** - Actionable insights sorted by priority

---

## Testing Strategy

### Core Tests (3-5 tests per function)

```javascript
describe('detectImpact', () => {
  test('detects positive impact when metric improves', () => {
    const metrics = [
      { end_date: '2024-01-01', velocity_points: 40 },
      { end_date: '2024-01-14', velocity_points: 42 },
      { end_date: '2024-01-28', velocity_points: 38 },
      { start_date: '2024-02-01', velocity_points: 48 },
      { start_date: '2024-02-15', velocity_points: 52 },
      { start_date: '2024-03-01', velocity_points: 50 }
    ];
    const annotations = [
      {
        id: '1',
        title: 'Adopted pair programming',
        date: '2024-02-01',
        type: 'process',
        impact: 'positive',
        affected_metrics: ['velocity_points']
      }
    ];

    const impacts = detectImpact(metrics, annotations);

    expect(impacts[0].metrics.velocity_points.detected_impact).toBe('positive');
    expect(impacts[0].metrics.velocity_points.percent_change).toBeGreaterThan(10);
  });

  test('handles empty metrics gracefully', () => {
    expect(detectImpact([], [])).toEqual([]);
  });

  test('requires 3 sprints before and after', () => {
    const metrics = [
      { end_date: '2024-01-01', velocity_points: 40 }
    ];
    const annotations = [
      { id: '1', date: '2024-02-01', type: 'process', impact: 'positive' }
    ];

    const impacts = detectImpact(metrics, annotations);

    expect(impacts).toEqual([]); // Not enough data
  });
});
```

---

## Related Documentation

- `_context/domain/metrics-formulas.md` - Metric definitions
- `_context/domain/gitlab-api-patterns.md` - Fetching annotation data
- `_context/reference/prototype-lessons.md` - Annotation system lessons
- `_context/reference/ui-design-system.md` - Annotation UI patterns

---

## Further Reading

- **Correlation vs Causation:** https://en.wikipedia.org/wiki/Correlation_does_not_imply_causation
- **Statistical Significance:** https://en.wikipedia.org/wiki/Statistical_significance
- **simple-statistics library:** https://simplestatistics.org/

---

**Remember:** Annotations turn metrics into stories. Capture context, detect impact, recognize patterns, and generate actionable recommendations. The annotation system is what makes this tool valuable beyond just displaying charts. 🚀
