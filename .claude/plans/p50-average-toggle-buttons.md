# Plan: Add P50 and Average toggle buttons

## Context

The CycleTimeChart and LeadTimeChart each render three datasets: Average, P50, and P90. Today only the P90 series can be hidden via a toggle button in the dashboard toolbar. Users have asked for the ability to also hide P50 and Average independently, so they can focus the chart on whichever statistic is most relevant for the conversation at hand.

This change adds two new toggle buttons (`P50: On/Off`, `Average: On/Off`) that mirror the existing P90 toggle pattern exactly — same styled component, same localStorage persistence, same dataset-filter mechanism in the chart components — and extends both charts to honor all three flags. Per user direction, at least one of the three series must remain visible at all times: the active toggle button for the last-visible series is disabled to prevent rendering an empty chart.

## Files to modify

1. `src/public/components/VelocityApp.jsx` — add state, handlers, and buttons (currently lines 173, 209-216, 394-404, 473-480, 497, 516)
2. `src/public/components/CycleTimeChart.jsx` — accept `showP50` / `showAverage` props and filter datasets (currently lines 61, 252-256)
3. `src/public/components/LeadTimeChart.jsx` — accept `showP50` / `showAverage` props and filter datasets (currently lines 48, 232-236)
4. `test/public/components/CycleTimeChart.test.jsx` — add P50/Average toggle tests mirroring lines 386-431
5. `test/public/components/LeadTimeChart.test.jsx` — add P50/Average toggle tests mirroring the equivalent block

## Implementation

### 1. `VelocityApp.jsx`

Add two new localStorage keys alongside `SHOW_P90_KEY` (line 173):

```js
const SHOW_P50_KEY = 'chart-show-p50';
const SHOW_AVERAGE_KEY = 'chart-show-average';
```

Add two new `useState` blocks alongside `showP90` (after line 216), each defaulting to `true` and reading from localStorage with the same try/catch pattern.

Add two new `useCallback` handlers `handleToggleP50` and `handleToggleAverage` alongside `handleToggleP90` (after line 404), each writing the next value to its respective localStorage key.

In `ChartsToolbar` (lines 473-480), add two buttons next to the existing P90 button. To enforce "at least one on", compute whether only one toggle is currently true and disable that toggle:

```jsx
const onlyOneVisible = [showAverage, showP50, showP90].filter(Boolean).length === 1;
// ...
<AnnotationToggleButton
  onClick={handleToggleAverage}
  disabled={showAverage && onlyOneVisible}
>
  {showAverage ? 'Average: On' : 'Average: Off'}
</AnnotationToggleButton>
<AnnotationToggleButton
  onClick={handleToggleP50}
  disabled={showP50 && onlyOneVisible}
>
  {showP50 ? 'P50: On' : 'P50: Off'}
</AnnotationToggleButton>
<AnnotationToggleButton
  onClick={handleToggleP90}
  disabled={showP90 && onlyOneVisible}
>
  {showP90 ? 'P90: On' : 'P90: Off'}
</AnnotationToggleButton>
```

Add a `&:disabled { opacity: 0.5; cursor: not-allowed; }` rule to `AnnotationToggleButton` (lines 143-164) so the disabled state reads visually.

Pass `showP50={showP50}` and `showAverage={showAverage}` to both `<CycleTimeChart>` (lines 493-498) and `<LeadTimeChart>` (lines 512-517).

### 2. `CycleTimeChart.jsx` and `LeadTimeChart.jsx`

Extend the prop signature (line 61 / 48) to accept the two new props, defaulting to `true`:

```js
const CycleTimeChart = ({
  selectedIterations = [],
  annotationRefreshKey = 0,
  showAnnotations = true,
  showP90 = true,
  showP50 = true,
  showAverage = true,
}) => {
```

Update the JSDoc block above to document the new props.

Replace the `displayedChartData` memo (CycleTimeChart lines 252-256, LeadTimeChart lines 232-236) to filter all three series:

```js
const displayedChartData = useMemo(() => {
  if (!chartData) return null;
  const datasets = chartData.datasets.filter(d => {
    if (d.label === 'P90') return showP90;
    if (d.label === 'P50') return showP50;
    if (d.label === 'Average') return showAverage;
    return true;
  });
  return { ...chartData, datasets };
}, [chartData, showP90, showP50, showAverage]);
```

### 3. Tests

Mirror the existing P90 tests at `test/public/components/CycleTimeChart.test.jsx:386-431` for `showP50` and `showAverage` — assert default-on, hide-when-false, and updates-when-prop-changes. Do the same in `test/public/components/LeadTimeChart.test.jsx`.

## Reuse

- `AnnotationToggleButton` styled component (`VelocityApp.jsx:143-164`) — reused as-is, only adding a `:disabled` rule
- localStorage init/handler pattern (`VelocityApp.jsx:209-216`, `394-404`) — copied verbatim with new keys
- `displayedChartData` memo pattern (`CycleTimeChart.jsx:252-256`, `LeadTimeChart.jsx:232-236`) — extended to filter three labels instead of one

## Verification

1. `npm test` — all existing tests plus new P50/Average tests pass
2. `npm run lint` — clean
3. `npm run test:coverage` — chart components stay ≥85%
4. Manual via `docker compose up --build -d`:
   - Load dashboard with iterations selected
   - Toggle each of Average / P50 / P90 independently on Cycle Time and Lead Time charts; verify the corresponding line appears/disappears
   - Toggle two off so only one remains; verify the remaining toggle button is disabled and visually dimmed
   - Reload the page and confirm all three preferences persist via localStorage
   - Confirm none of the other charts (Velocity, Throughput, Deployment Frequency, MTTR, Change Failure Rate) are affected
