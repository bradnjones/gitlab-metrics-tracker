# Incident Metrics Timing Fix

**Status:** 🚧 In Progress - Phase 3 (MTTR Calculation Update)
**Created:** 2025-01-18
**Branch:** `fix/incident-metrics-timing` (created from `fix/117-incident-date-filtering`)
**PR #119:** https://github.com/bradnjones/gitlab-metrics-tracker/pull/119 (previous work)
**Goal:** Fix MTTR and Change Failure Rate to use incident timeline event tags instead of creation/close timestamps

---

## 🤖 Instructions for Claude

**THIS DOCUMENT IS A LIVING WORKING DOCUMENT**

Claude should:
- ✅ **Update this document** as we explore, make decisions, and implement
- ✅ **Add findings** to the "Notes & Updates" section with timestamps
- ✅ **Check off items** in checklists as completed
- ✅ **Document decisions** and rationale in the relevant sections
- ✅ **Track technical discoveries** in the "Technical Notes" section
- ✅ **Update status** at the top as we progress through phases

**Do NOT:**
- ❌ Delete information - append/update instead
- ❌ Remove sections - mark as "N/A" or "Decided Against" if not using

---

## ⚠️ GitHub Outage - Workflow Exception

**Current Situation (2025-01-18):**
- 🔴 GitHub is experiencing a MAJOR outage (Partial System Outage)
- ✅ Previous work committed on branch `fix/117-incident-date-filtering` (commit `1f293c0`)
- ⚠️ Cannot push to remote repository

**Workflow Exception Decision:**
- **Breaking normal workflow:** Will create new branch from `fix/117-incident-date-filtering` instead of `main`
- **Reason:** GitHub outage prevents pushing current branch and pulling updated main
- **Impact:** New feature branch will include previous InProgress detection work in its history

**When GitHub Comes Back Online:**

1. **First: Push the InProgress detection branch**
   ```bash
   git checkout fix/117-incident-date-filtering
   git push
   gh pr create --title "feat: Improve InProgress date detection and simplify navigation"
   # Use PR description from commit message or prepared text
   ```

2. **Second: Push this incident metrics timing fix branch**
   ```bash
   git checkout fix/incident-metrics-timing
   git push
   gh pr create --title "fix: Use incident start_time/end_time for accurate MTTR calculations"
   ```

3. **Result:**
   - First PR will show: InProgress detection + navigation simplification
   - Second PR will show: BOTH previous work + incident metrics timing changes
   - Once first PR is merged, second PR will automatically update to show only incident metrics changes

**Alternative (if desired):**
- After first PR is merged, rebase second branch onto updated main to clean history
- This is optional - git will handle it automatically when reviewing PRs

---

## 🎯 Objective

**Current Problem:**

**MTTR (Mean Time To Recovery):**
- Currently calculates downtime using:
  - **Start:** `incident.createdAt` (when incident was created in GitLab)
  - **End:** `incident.closedAt` (when incident was closed in GitLab)

**Change Failure Rate:**
- Currently counts incidents based on `createdAt` timestamp
- May count incidents that didn't actually occur during the measurement period

**Issue:**
- These timestamps reflect when the incident was **recorded in GitLab**, not when it **actually occurred**
- Example: Incident starts at 2:00 PM but not created in GitLab until 2:30 PM (or even days later!)
- Example: Incident resolved at 3:00 PM but not closed in GitLab until 3:15 PM
- This leads to:
  - **Inaccurate MTTR calculations** (wrong downtime duration)
  - **Inaccurate CFR calculations** (counting wrong incidents for time period)

**Desired Solution:**
- Use GitLab incident timeline events with specific tags:
  - **Start:** Timeline event "Start time" tag → `occurredAt` (actual incident start)
  - **End:** Timeline event "End time" tag → `occurredAt` (actual incident resolution)
  - **Mitigation:** Timeline event "Impact mitigated" tag → `occurredAt` (impact ceased)
- This gives **accurate** incident timing for both MTTR and CFR metrics

---

## 🔍 Current Implementation Analysis

### Current Metric Calculations
- **MTTR:** Mean Time To Recovery from incidents
- **Change Failure Rate:** Percentage of deployments that result in incidents

### Components to Investigate
- [ ] Where incidents are fetched from GitLab API
- [ ] What fields are currently available in incident objects
- [ ] Where MTTR is calculated
- [ ] Where Change Failure Rate is calculated
- [ ] How incidents are stored/cached locally

### Key Questions
- [ ] Does GitLab GraphQL API provide `start_time` and `end_time` for incidents?
- [ ] Are these fields already being fetched but not used?
- [ ] Do we need to update the GraphQL query?
- [ ] What happens if `start_time` or `end_time` is null/missing?

---

## 📝 GitLab Incident API Investigation

### ✅ FINDINGS: Timeline Event Tags Are the Solution!

**Key Discovery (2025-01-18):**
GitLab doesn't provide `start_time`/`end_time` as direct fields on incidents. Instead, it uses **incident timeline events with specific tags** to track actual incident timing:

**Available Timeline Event Tags:**
1. **Start time** - When the incident actually started (service degradation began)
2. **Impact detected** - When operators became aware of the problem
3. **Response initiated** - When response to the incident began
4. **Impact mitigated** - When severe impact ceased
5. **End time** - When the system fully recovered and is operating normally

**For MTTR Calculations, we need:**
- **Start time tag** → `occurredAt` field (actual incident start)
- **End time tag** → `occurredAt` field (actual incident resolution)

**Current Implementation (INCORRECT):**
- Uses `incident.createdAt` → When incident **issue was created in GitLab**
- Uses `incident.closedAt` → When incident **issue was closed in GitLab**

**New Implementation (ACCURATE - Cascading Fallback):**

**Start Time:**
1. Timeline event with "Start time" tag → `occurredAt` (most accurate)
2. Fallback: `incident.createdAt` (when issue was created)

**End Time:**
1. Timeline event with "End time" tag → `occurredAt` (most accurate)
2. Timeline event with "Impact mitigated" tag → `occurredAt` (impact ceased)
3. Fallback: `incident.closedAt` (when issue was closed)

### GraphQL API Structure

**Timeline Events Query:**
```graphql
project(fullPath: ID!) {
  incidentManagementTimelineEvents(incidentId: IssueID!) {
    nodes {
      id
      occurredAt        # ACTUAL event timestamp
      createdAt         # When event was recorded in GitLab
      note              # Event description
      timelineEventTags {
        nodes {
          name          # Tag name: "Start time", "End time", etc.
        }
      }
    }
  }
}
```

**Key Fields:**
- `occurredAt` - When the event actually occurred (this is what we need!)
- `timelineEventTags` - Tags like "Start time", "End time"
- `note` - Event description

### Verified Information
- ✅ Timeline events are available via GraphQL API
- ✅ Events have `occurredAt` field (actual occurrence time)
- ✅ Events can be tagged with specific incident lifecycle tags
- ✅ Standard tags include "Start time" and "End time"
- ✅ Requires GitLab Ultimate for full functionality

---

## 🔧 Technical Notes

### Files to Modify

**1. GitLabClient.js (Infrastructure Layer)**
- Add new method: `fetchIncidentTimelineEvents(incidentId)`
- Modify `fetchIncidents()` to optionally fetch timeline events
- Extract helper methods to find timeline events by tag

**2. IncidentAnalyzer.js (Core Layer)**
- Update `calculateDowntime()` to accept timeline events
- Add logic to find "Start time" and "End time" tagged events
- Use `occurredAt` from timeline events instead of `createdAt`/`closedAt`
- Implement cascading fallback logic when timeline events are missing
- Add method to get actual incident start time (for CFR filtering)

**3. ChangeFailureRateCalculator.js (Core Layer)**
- Update to use actual incident start time for period filtering
- Currently counts incidents by `createdAt` - should use timeline event "Start time"
- This ensures only incidents that **actually occurred** during the period are counted

**4. Tests**
- Update `IncidentAnalyzer.test.js` with timeline event scenarios
- Update `ChangeFailureRateCalculator.test.js` with timeline-based filtering
- Update `GitLabClient.test.js` to mock timeline events
- Add tests for cascading fallback behavior

### Implementation Approach

**Phase 1: Add Timeline Events Fetching**
```javascript
// In GitLabClient.js
async fetchIncidentTimelineEvents(incidentId) {
  const query = `
    query getIncidentTimelineEvents($fullPath: ID!, $incidentId: IssueID!) {
      project(fullPath: $fullPath) {
        incidentManagementTimelineEvents(incidentId: $incidentId) {
          nodes {
            id
            occurredAt
            createdAt
            note
            timelineEventTags {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  `;
  // Implementation...
}
```

**Phase 2: Extract Timeline Event Timestamps**
```javascript
// Helper function to find timeline event by tag name
findTimelineEventByTag(timelineEvents, tagName) {
  return timelineEvents.find(event =>
    event.timelineEventTags?.nodes?.some(tag =>
      tag.name.toLowerCase().includes(tagName.toLowerCase())
    )
  );
}

// Usage - Cascading fallback strategy
const startEvent = findTimelineEventByTag(timelineEvents, 'start time');
const endEvent = findTimelineEventByTag(timelineEvents, 'end time');
const mitigatedEvent = findTimelineEventByTag(timelineEvents, 'impact mitigated');

// Start time: Use "Start time" tag, fallback to createdAt
const actualStart = startEvent?.occurredAt || incident.createdAt;

// End time: Use "End time" tag, then "Impact mitigated", fallback to closedAt
const actualEnd = endEvent?.occurredAt || mitigatedEvent?.occurredAt || incident.closedAt;
```

**Phase 3: Update MTTR Calculation**
```javascript
// In IncidentAnalyzer.js
static calculateDowntime(incident, timelineEvents = []) {
  // Find timeline events by tag (cascading fallback)
  const startEvent = this.findTimelineEventByTag(timelineEvents, 'start time');
  const endEvent = this.findTimelineEventByTag(timelineEvents, 'end time');
  const mitigatedEvent = this.findTimelineEventByTag(timelineEvents, 'impact mitigated');

  // Start time: "Start time" tag → createdAt
  const startTime = startEvent?.occurredAt || incident.createdAt;

  // End time: "End time" tag → "Impact mitigated" tag → closedAt
  const endTime = endEvent?.occurredAt || mitigatedEvent?.occurredAt || incident.closedAt;

  if (!endTime || !startTime) {
    return 0;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  return (end - start) / (1000 * 60 * 60); // Hours
}

// Add helper method to get actual incident start time (for CFR filtering)
static getActualStartTime(incident, timelineEvents = []) {
  const startEvent = this.findTimelineEventByTag(timelineEvents, 'start time');
  return startEvent?.occurredAt || incident.createdAt;
}
```

**Phase 4: Update Change Failure Rate Filtering**
```javascript
// Where CFR is calculated (likely in MetricsService)
// BEFORE: Filter incidents by createdAt
const relevantIncidents = incidents.filter(incident => {
  const created = new Date(incident.createdAt);
  return created >= periodStart && created <= periodEnd;
});

// AFTER: Filter incidents by actual start time from timeline events
const relevantIncidents = incidents.filter(incident => {
  const actualStart = IncidentAnalyzer.getActualStartTime(
    incident,
    incident.timelineEvents || []
  );
  const startTime = new Date(actualStart);
  return startTime >= periodStart && startTime <= periodEnd;
});

const cfr = ChangeFailureRateCalculator.calculate(relevantIncidents, deployments);
```

### Potential Challenges

**1. Timeline Events May Not Exist**
- Not all incidents may have timeline events tagged
- Users might not use the standard tags ("Start time", "End time")
- Need robust fallback to `createdAt`/`closedAt`

**2. Multiple Events with Same Tag**
- What if multiple "Start time" or "End time" events exist?
- Strategy: Use first occurrence of each tag type

**3. Performance Impact**
- Fetching timeline events adds extra GraphQL requests
- Could significantly increase API calls (1 extra request per incident)
- Mitigation: Batch timeline event fetching, use parallel requests

**4. GitLab Edition Requirements**
- Timeline events require GitLab Ultimate
- Need to handle gracefully for teams without Ultimate license

**5. Tag Name Variations**
- Tags might have slight variations ("Start time" vs "Start Time" vs "start time")
- Need case-insensitive matching and flexibility

### Success Criteria
- ✅ MTTR calculated using timeline event `occurredAt` when available
- ✅ Graceful fallback to `createdAt`/`closedAt` when timeline events missing
- ✅ Tests cover both timeline event and fallback scenarios
- ✅ No breaking changes to existing functionality
- ✅ Performance impact minimized (parallel fetching)
- ✅ Clear logging when using fallback vs timeline events

---

## 📋 Implementation Plan

### Phase 1: Investigation ✅ COMPLETE
- [x] Explore GitLab GraphQL API documentation for incident fields
- [x] Check current GraphQL query for incidents
- [x] Verify what fields are currently available
- [x] Check current MTTR calculation implementation
- [x] Check current Change Failure Rate calculation
- [x] Discover timeline events API and tag structure

### Phase 2: Add Timeline Events Fetching (Infrastructure Layer)
- [ ] Create `fetchIncidentTimelineEvents(incidentId)` in GitLabClient
- [ ] Add GraphQL query for timeline events with tags
- [ ] Add helper method `findTimelineEventByTag(events, tagName)`
- [ ] Test timeline events query against real GitLab instance
- [ ] Write unit tests for new GitLabClient methods
- [ ] Handle errors gracefully (GitLab edition limitations)

### Phase 3: Update Incident Data Flow
- [ ] Modify `fetchIncidents()` to optionally fetch timeline events
- [ ] Decision: Fetch timeline events inline or as separate calls?
  - Option A: Fetch separately for each incident (flexible, more API calls)
  - Option B: Enhance incident objects with timeline events during fetch
- [ ] Add timeline events to incident objects returned from API
- [ ] Update data model/interface documentation

### Phase 4: Update MTTR Calculation (Core Layer)
- [ ] Update `IncidentAnalyzer.calculateDowntime()` signature
  - Add optional `timelineEvents` parameter
- [ ] Add `findTimelineEventByTag()` helper to IncidentAnalyzer
- [ ] Implement cascading fallback logic:
  - Start: "Start time" tag → `createdAt`
  - End: "End time" tag → "Impact mitigated" tag → `closedAt`
- [ ] Add `getActualStartTime()` helper method (for CFR filtering)
- [ ] Add logging to indicate which timing source was used
- [ ] Update `calculateMTTR()` to pass timeline events
- [ ] Write comprehensive unit tests:
  - Test with timeline events present (all tags)
  - Test with timeline events missing (fallback to createdAt/closedAt)
  - Test with partial timeline events (only start, only end, only mitigated)
  - Test cascading fallback (no end time, falls back to impact mitigated)
  - Test with multiple events of same tag type (use first)
  - Test with tag name variations (case insensitive)

### Phase 5: Update Change Failure Rate (Core Layer)
- [ ] Find where CFR incident filtering happens (likely MetricsService)
- [ ] Update incident filtering to use `getActualStartTime()` instead of `createdAt`
- [ ] Write tests for CFR with timeline-based filtering:
  - Test incident that occurred in period (counted)
  - Test incident created in period but occurred before (not counted)
  - Test incident created before period but occurred during (counted)
- [ ] Verify CFR calculations are more accurate with real data

### Phase 6: Update MetricsService Integration
- [ ] Update MetricsService to fetch timeline events
- [ ] Pass timeline events to IncidentAnalyzer
- [ ] Ensure backward compatibility
- [ ] Update integration tests

### Phase 6: Testing & Validation
- [ ] Test with real GitLab data (if available)
- [ ] Compare old MTTR vs new MTTR calculations
- [ ] Verify timeline event fallback works correctly
- [ ] Test edge cases:
  - Incidents without timeline events
  - Incidents with non-standard tag names
  - GitLab Free/Premium (no timeline events)
  - Empty timeline events array
- [ ] Performance testing (measure API call overhead)
- [ ] Run full test suite with coverage check (≥85%)

### Phase 7: Documentation & Deployment
- [ ] Update JSDoc comments in modified files
- [ ] Update README if needed
- [ ] Document timeline event tag requirements
- [ ] Add migration notes (how this changes MTTR calculations)
- [ ] Create PR with detailed description
- [ ] Manual verification by user

---

## 💭 Notes & Updates

### 2025-01-18 15:07 - Document Created
- Created working document for incident timing fix
- User wants to abandon sprint selector UX change
- New focus: Fix MTTR and Change Failure Rate to use incident start/end times
- Need to investigate GitLab API fields and current calculation logic

### 2025-01-18 15:15 - Added GitHub Outage Workflow
- Copied GitHub outage instructions from sprint-selector document
- Adapted for incident metrics timing fix context
- Branch will be created from `fix/117-incident-date-filtering`
- Will push to GitHub when outage is resolved

### 2025-01-18 15:30 - Investigation Complete: Timeline Events Discovery! ✅
**Major Discovery:** GitLab uses incident timeline events with tags, not direct incident fields!

**What We Found:**
1. GitLab doesn't have `start_time`/`end_time` as direct incident fields
2. Instead, incidents have **timeline events** with specific tags:
   - "Start time" - Actual incident start
   - "End time" - Actual incident resolution
   - "Impact detected", "Response initiated", "Impact mitigated"
3. Timeline events have `occurredAt` field = actual event timestamp
4. Current code uses `createdAt`/`closedAt` which are GitLab issue timestamps (inaccurate)

**Current Implementation (src/lib/core/services/IncidentAnalyzer.js):**
```javascript
// WRONG: Uses when issue was created/closed in GitLab
calculateDowntime(incident) {
  const created = new Date(incident.createdAt);
  const closed = new Date(incident.closedAt);
  return (closed - created) / (1000 * 60 * 60);
}
```

**New Implementation Approach:**
```javascript
// RIGHT: Uses timeline events with tags
calculateDowntime(incident, timelineEvents = []) {
  const startEvent = findTimelineEventByTag(timelineEvents, 'start time');
  const endEvent = findTimelineEventByTag(timelineEvents, 'end time');

  const startTime = startEvent?.occurredAt || incident.createdAt;  // Fallback
  const endTime = endEvent?.occurredAt || incident.closedAt;        // Fallback

  return (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
}
```

**Files Analyzed:**
- ✅ `src/lib/infrastructure/api/GitLabClient.js` - Current incident fetching (lines 709-841)
- ✅ `src/lib/core/services/IncidentAnalyzer.js` - MTTR calculation (lines 20-66)
- ✅ `src/lib/core/services/ChangeFailureRateCalculator.js` - CFR calculation (doesn't need timing)

**GraphQL API Research:**
- ✅ Timeline events available via `incidentManagementTimelineEvents` query
- ✅ Events have `occurredAt`, `timelineEventTags`, and `note` fields
- ✅ Requires GitLab Ultimate for full timeline event functionality
- ✅ Reference: GitLab blog post (Jan 2023) about incident metrics visualization

**Implementation Plan Updated:**
- Phase 1: Investigation ✅ COMPLETE
- Phase 2-7: Detailed implementation steps documented above
- Ready to begin implementation when GitHub outage resolves

**Next Steps:**
1. Wait for GitHub outage to resolve
2. Create new branch from `fix/117-incident-date-filtering`
3. Begin Phase 2: Add timeline events fetching to GitLabClient
4. Follow TDD approach (tests first!)

### 2025-01-18 16:00 - Test Script Success + Cascading Fallback Strategy ✅
**Test Results:**
- ✅ Created test script `_performance-investigation/scripts/test-incident-timeline-events.js`
- ✅ Fixed bug: Was querying GROUP path instead of PROJECT path for timeline events
- ✅ Successfully fetched timeline events for Incident #14
- ✅ Verified timeline event structure matches expectations

**Incident #14 Data:**
- Start time (tagged): `2025-07-25T15:03:00Z` (actual incident start)
- End time (tagged): `2025-07-29T10:09:00Z` (actual resolution)
- Created in GitLab: `2025-07-30T21:42:38Z` (1 day AFTER incident ended!)
- **This proves the value**: Issue created after incident was resolved!

**User Decision - Cascading Fallback Strategy:**

**Start Time (priority order):**
1. Timeline event "Start time" tag → `occurredAt`
2. Fallback: `incident.createdAt`

**End Time (priority order):**
1. Timeline event "End time" tag → `occurredAt`
2. Timeline event "Impact mitigated" tag → `occurredAt`
3. Fallback: `incident.closedAt`

**Why This Approach:**
- Maximizes accuracy when timeline events exist
- "Impact mitigated" is better than "closedAt" (impact might cease before formal closure)
- Always has a fallback (never returns null/undefined)
- Works with partial timeline event data

**Ready to Implement!**
All research complete, strategy agreed upon, API verified. Next: TDD implementation.

### 2025-01-18 16:10 - Extended Scope: Change Failure Rate ✅
**User Decision:** Timeline events should also be used for Change Failure Rate calculations.

**Problem with Current CFR:**
- Currently counts incidents based on `createdAt` timestamp
- May count incidents that didn't actually occur during the deployment period
- Example: Incident occurred July 25, but issue created July 30 - wrong period attribution!

**Solution:**
- Use `getActualStartTime()` helper to determine when incident **actually occurred**
- Filter incidents based on timeline event "Start time" (with `createdAt` fallback)
- Only count incidents that **started** during the measurement period

**Impact:**
- More accurate CFR calculations
- Incidents attributed to correct time period
- Consistent with MTTR timing improvements

**Implementation:**
- Add `IncidentAnalyzer.getActualStartTime(incident, timelineEvents)` helper
- Update incident filtering logic in MetricsService (or wherever CFR is calculated)
- Add tests for timeline-based incident filtering

**Scope Updated:**
- Phase 5 added: Update Change Failure Rate filtering
- Both MTTR and CFR will use accurate incident timing
- Consistent approach across all incident metrics

### 2025-01-18 16:20 - GitHub Back Online + Branch Created ✅
**GitHub Outage Resolved!**
- ✅ Pushed `fix/117-incident-date-filtering` branch to GitHub
- ✅ Created PR #119 for InProgress detection improvements
- ✅ Created new branch `fix/incident-metrics-timing` from `fix/117`

**Starting Phase 2 Implementation:**
- 🚧 Now on branch `fix/incident-metrics-timing`
- 🚧 Beginning TDD implementation for timeline events fetching
- 📝 Will update this document after each phase completion

**Next:**
- Phase 2.1: Write tests for `GitLabClient.fetchIncidentTimelineEvents()`
- Follow TDD: Tests first, then implementation

### 2025-01-18 16:35 - Phase 2 Complete ✅ (Timeline Events Fetching)
**Completed:**
- ✅ Phase 2.1: Added 7 tests for `fetchIncidentTimelineEvents()` (RED phase - all failed)
- ✅ Phase 2.2: Implemented `fetchIncidentTimelineEvents()` method in `GitLabClient.js:938-995`
- ✅ Phase 2.3: Added 6 tests for `extractProjectPath()` helper (RED phase - all failed)
- ✅ Phase 2.4: Implemented `extractProjectPath()` helper in `GitLabClient.js:910-926`
- ✅ GREEN phase: All 75 tests passing (13 new tests + 62 existing)

**Implementation Details:**
```javascript
// GitLabClient.js:910-926
extractProjectPath(webUrl) {
  // Extracts project path from GitLab URL
  // Example: https://gitlab.com/group/project/-/issues/123 → group/project
  const url = new URL(webUrl);
  const pathParts = url.pathname.split('/-/')[0];
  return pathParts.substring(1);
}

// GitLabClient.js:938-995
async fetchIncidentTimelineEvents(incident) {
  // Extract project path from incident webUrl
  // Query GitLab GraphQL API for timeline events
  // Returns array of timeline events with tags
  // Falls back to empty array on error
}
```

**Test Coverage:**
- Successful timeline events fetch
- Empty timeline events array
- Missing project handling
- GraphQL error handling
- Project path extraction from different URL formats
- Invalid URL handling
- Events without tags

**Files Modified:**
- `src/lib/infrastructure/api/GitLabClient.js` - Added 2 new methods (87 lines)
- `test/infrastructure/api/GitLabClient.test.js` - Added 13 new tests (257 lines)

**Next: Phase 3 - MTTR Calculation Update (IncidentAnalyzer)**

### 2025-01-18 17:00 - Phase 3 Complete ✅ (MTTR Calculation with Cascading Fallback)
**Completed:**
- ✅ Phase 3.1-3.3: Added 21 tests for new IncidentAnalyzer methods (RED phase - 16 failed)
  - 7 tests for `findTimelineEventByTag()` - case insensitive, partial match, edge cases
  - 5 tests for `getActualStartTime()` - cascading fallback from timeline → createdAt
  - 9 tests for `calculateDowntime()` with timeline events - full cascading fallback strategy
- ✅ Phase 3.4-3.6: Implemented all 3 methods in `IncidentAnalyzer.js`
- ✅ GREEN phase: All 31 tests passing (21 new tests + 10 existing)

**Implementation Details:**
```javascript
// IncidentAnalyzer.js:19-24
static findTimelineEventByTag(timelineEvents, tagName) {
  // Case insensitive, partial match for tag names
  return timelineEvents.find(event =>
    event.timelineEventTags?.nodes?.some(tag =>
      tag.name.toLowerCase().includes(tagName.toLowerCase())
    )
  );
}

// IncidentAnalyzer.js:36-39
static getActualStartTime(incident, timelineEvents = []) {
  // Priority: Timeline "Start time" tag → createdAt fallback
  const startEvent = this.findTimelineEventByTag(timelineEvents, 'start time');
  return startEvent?.occurredAt || incident.createdAt;
}

// IncidentAnalyzer.js:50-71
static calculateDowntime(incident, timelineEvents = []) {
  // Cascading fallback strategy:
  // Start: "Start time" tag → createdAt
  // End: "End time" tag → "Impact mitigated" tag → closedAt
  const startEvent = this.findTimelineEventByTag(timelineEvents, 'start time');
  const endEvent = this.findTimelineEventByTag(timelineEvents, 'end time');
  const mitigatedEvent = this.findTimelineEventByTag(timelineEvents, 'impact mitigated');

  const startTime = startEvent?.occurredAt || incident.createdAt;
  const endTime = endEvent?.occurredAt || mitigatedEvent?.occurredAt || incident.closedAt;

  // Calculate downtime in hours
  return (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
}
```

**Test Coverage:**
- Tag finding with case insensitivity and partial matches
- Graceful handling of missing timeline events
- Graceful handling of missing tags or tag arrays
- Cascading fallback for start time (timeline → createdAt)
- Triple cascading fallback for end time (end tag → mitigated tag → closedAt)
- Complex scenarios with multiple timeline events
- Backward compatibility (works without timeline events)

**Files Modified:**
- `src/lib/core/services/IncidentAnalyzer.js` - Added 3 new methods, updated calculateDowntime (35 lines)
- `test/core/services/IncidentAnalyzer.test.js` - Added 21 new tests (399 lines)

**Remaining Work:**
- Phase 4: Update Change Failure Rate filtering (use getActualStartTime)
- Phase 5: Update MetricsService to fetch/pass timeline events
- Phase 6: Full test suite + coverage verification
- Phase 7: Manual testing with real GitLab data

**Next: Commit Phase 2 & 3 work before continuing**

---

**Last Updated:** 2025-01-18 17:00
**Next Review:** After Phase 2 completion
**Claude:** Keep this document updated as we progress! Add findings, decisions, and updates to the "Notes & Updates" section with timestamps.
