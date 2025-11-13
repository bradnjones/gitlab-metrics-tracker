# ADR 003: Use localStorage for Selected Iterations Persistence

**Status:** Accepted
**Date:** 2025-11-13
**Decision Makers:** Development Team
**Related Stories:** V9.3 - Cache Management UI

---

## Context

Users select sprint iterations in the GitLab Metrics Tracker dashboard to view metrics charts. When the page is refreshed, the React component state is lost, requiring users to re-select their iterations. This creates a poor user experience, especially when:

- Developing/debugging the application with hot reloads
- Accidentally refreshing the browser
- Returning to the dashboard after closing the tab
- Working with cached iterations (cache persists, but selections don't)

We need a mechanism to persist selected iterations across page refreshes.

---

## Decision

We will use **browser localStorage** to persist selected iteration data across page refreshes.

**Implementation:**
- Store full iteration objects (not just IDs) in localStorage under key `gitlab-metrics-selected-iterations`
- Save automatically whenever `selectedIterations` state changes
- Load automatically on VelocityApp mount
- Clear when all iterations are removed
- Use try/catch to handle localStorage errors gracefully

**Storage Format:**
```javascript
// localStorage.getItem('gitlab-metrics-selected-iterations')
[
  {
    "id": "gid://gitlab/Iteration/123",
    "title": "Devs Sprint",
    "startDate": "2025-10-26",
    "dueDate": "2025-11-15",
    // ... other iteration properties
  }
]
```

---

## Alternatives Considered

### 1. File-Based Storage (Server-Side)
**Approach:** Store selections in `src/data/cache/selected-iterations.json`

**Pros:**
- Server-accessible
- Survives browser data clearing
- Sharable across browsers

**Cons:**
- ❌ **Potential race conditions** with concurrent file writes
- ❌ Requires server endpoint (`/api/cache/selections`)
- ❌ More complex implementation
- ❌ Overkill for single-user local tool
- ❌ Network call overhead

**Verdict:** Rejected - unnecessary complexity for local development tool

### 2. URL Query Parameters
**Approach:** Store selected iteration IDs in URL query string

**Pros:**
- Sharable URLs
- Browser history integration

**Cons:**
- ❌ Long URLs with multiple iterations
- ❌ No full iteration data (need to fetch on load)
- ❌ Browser history pollution
- ❌ Complex state management

**Verdict:** Rejected - poor UX for typical use cases

### 3. IndexedDB
**Approach:** Use browser's IndexedDB for structured storage

**Pros:**
- Larger storage capacity
- Structured queries
- Transactional

**Cons:**
- ❌ Overkill for simple array of objects
- ❌ Async API complexity
- ❌ More code to maintain

**Verdict:** Rejected - localStorage is sufficient

---

## Rationale

**Why localStorage is the right choice:**

1. **Simple & Fast**
   - Synchronous API (no async/await complexity)
   - ~10 lines of code to implement
   - Instant read/write (no network latency)

2. **No Race Conditions**
   - Browser-side only (no server file writes)
   - Single-threaded execution
   - Built-in serialization

3. **Appropriate Scope**
   - This is a **local development tool** for individual developers
   - Single user per browser instance
   - Data doesn't need to be shared across machines
   - Browser data loss is acceptable (easy to re-select)

4. **Fits the Architecture**
   - Clean separation: UI state (localStorage) vs. data cache (file system)
   - VelocityApp owns selection state
   - No server-side changes needed

5. **User Experience**
   - Selections persist across refreshes ✅
   - Works with existing cache system ✅
   - Automatic save/load ✅
   - Fail-safe (graceful degradation) ✅

---

## Consequences

### Positive

- ✅ **Better UX:** Selections survive page refresh
- ✅ **Checkbox state works:** Selected iterations pre-checked in modal
- ✅ **Simple implementation:** Minimal code, no race conditions
- ✅ **Fast:** No network calls, instant load
- ✅ **Maintainable:** Standard browser API, well-documented

### Negative

- ⚠️ **Browser-specific:** Selections don't sync across browsers
- ⚠️ **Data loss risk:** User clears browser data → selections lost
- ⚠️ **Storage limit:** ~5-10MB (sufficient for hundreds of iterations)
- ⚠️ **No server access:** Server-side code can't read selections

### Mitigations

- **Data loss:** Acceptable for development tool; easy to re-select
- **Storage limit:** Unlikely to hit with typical usage (<100 iterations)
- **Browser-specific:** Documented behavior; users understand browser-local state
- **No server access:** Not needed; selections are UI-only concern

---

## Implementation Notes

**When selections are saved:**
- On every `selectedIterations` state change
- Automatic via `useEffect` dependency

**When selections are loaded:**
- On VelocityApp component mount
- One-time during page load

**When selections are cleared:**
- When user removes all iteration chips
- When `selectedIterations` becomes empty array

**Error handling:**
- Try/catch wraps all localStorage operations
- Corrupted data → clear and continue
- Failed writes → warn and continue (fail-safe)

**Storage key:**
```javascript
const STORAGE_KEY = 'gitlab-metrics-selected-iterations';
```

---

## References

- **Related Code:** `src/public/components/VelocityApp.jsx`
- **Related ADRs:**
  - ADR 001: File-Based Cache (cache data persistence)
  - ADR 002: Clean Architecture (layer separation)
- **Browser API:** [MDN - Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)

---

## Future Considerations

If usage patterns change (e.g., multi-user server deployment), we could:
1. Migrate to file-based storage with proper locking
2. Add user profiles with per-user selections
3. Implement selection import/export

For the current single-user local development tool use case, localStorage is the optimal solution.
