# Sprint Selector UX Improvement

**Status:** ⛔ ABANDONED - Modal UX is already optimal
**Created:** 2025-01-18
**Branch:** TBD (will branch from `fix/117-incident-date-filtering` when ready)
**Goal:** Move Sprint Selector from hamburger menu to main dashboard for easier interaction

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

2. **Second: Push this sprint selector branch**
   ```bash
   git checkout feat/sprint-selector-dashboard
   git push
   gh pr create --title "feat: Move sprint selector to dashboard for easier access"
   ```

3. **Result:**
   - First PR will show: InProgress detection + navigation simplification
   - Second PR will show: BOTH previous work + sprint selector changes
   - Once first PR is merged, second PR will automatically update to show only sprint selector changes

**Alternative (if desired):**
- After first PR is merged, rebase second branch onto updated main to clean history
- This is optional - git will handle it automatically when reviewing PRs

---

## 🎯 Objective

**Current UX Pain Point:**
- Users must click hamburger menu (☰) → "Change Sprints" → Modal opens → Select sprints → Close
- Too many clicks for a frequently-used action
- Sprint selection is hidden behind menu

**Desired UX:**
- Sprint selector visible/accessible directly from dashboard
- Minimal clicks to change sprint selection
- Maintain clean, uncluttered dashboard design

---

## 🔍 Current Implementation Analysis

### Current Flow
1. User clicks **Hamburger Menu (☰)** in header
2. Clicks **"Change Sprints"** menu item
3. **IterationSelectionModal** opens (full-screen modal)
4. User selects sprints (background prefetch starts)
5. Clicks "Apply" (or "Cancel" to discard)
6. Modal closes, dashboard updates

### Component Hierarchy
```
VelocityApp (Root - State Container)
├── selectedIterations: [] (Array<{id, title, iterationCadence, dueDate, iid}>)
├── CompactHeaderWithIterations
│   ├── HamburgerMenu → Opens IterationSelectionModal
│   ├── IterationChipsSection (Shows selected iterations as chips)
│   │   └── Each chip has X button to remove
│   └── CacheManagementSection (Cache status + refresh)
├── IterationSelectionModal (When open)
│   ├── tempSelectedIds (temporary state during editing)
│   ├── IterationSelector (Multi-select list component)
│   ├── Background prefetch (downloads data for selected iterations)
│   └── Apply/Cancel buttons
└── Charts/Content (Dashboard, Data Explorer, etc.)
    └── Receive selectedIterations prop
```

### State Management Pattern
**Parent-Controlled State with Two-Phase Commit:**
- **VelocityApp** holds canonical `selectedIterations` state
- **IterationSelectionModal** maintains temporary `tempSelectedIds` during editing
- Modal doesn't commit changes until "Apply" clicked
- "Cancel" discards temp state without affecting parent
- State persists in localStorage: `'gitlab-metrics-selected-iterations'`

### Key Technical Findings

**1. Data Flow:**
```javascript
// VelocityApp.jsx
const [selectedIterations, setSelectedIterations] = useState([]);

// Opens modal
handleOpenModal() → setSelectedIterations([]) + setIsModalOpen(true)

// User selects in modal
Modal: tempSelectedIds updates → background prefetch starts

// User clicks Apply
handleApplyIterations(selectedIterations) →
  setSelectedIterations(selectedIterations) →
  Save to localStorage →
  Modal closes
```

**2. Existing Display Patterns:**
- **Header Chips**: Already displays selected iterations as compact chips
- **Format**: `"DS 10/26"` (Cadence Initials + End Date)
- **Tooltip**: Full title `"Devs Sprint (10/25)"`
- **Remove Button**: Each chip has X button for quick removal
- **Empty State**: "No sprints selected" message when empty

**3. Background Prefetch Strategy:**
- Modal automatically fetches data as user makes selections
- Tracks download progress per iteration
- Apply button disabled until all selected iterations ready
- Smooth UX - no waiting after clicking Apply

**4. Components Involved:**
- `VelocityApp.jsx` - Root state management, localStorage persistence
- `IterationSelectionModal.jsx` - Modal container, temp state, prefetch logic
- `IterationSelector.jsx` - Multi-select list, filtering, search
- `CompactHeaderWithIterations.jsx` - Header display, iteration chips
- `HamburgerMenu.jsx` - Menu with "Change Sprints" trigger

**5. Memoization & Performance:**
- `CompactHeaderWithIterations` wrapped in `React.memo()`
- Custom comparison prevents unnecessary re-renders
- Only updates when iteration IDs or callbacks change

---

## 💡 Design Options to Explore

### Option 1: Inline Sprint Selector Bar
**Concept:** Add a compact sprint selector bar below the header
```
┌─────────────────────────────────────────┐
│  Header                          [☰]    │
├─────────────────────────────────────────┤
│  🔍 Select Sprints: [▼ 2024-Q4] [+]    │ ← NEW
├─────────────────────────────────────────┤
│  [Dashboard] [Data Explorer]            │
│  Content...                             │
└─────────────────────────────────────────┘
```
**Pros:** Always visible, quick access
**Cons:** Takes vertical space, may clutter on mobile

### Option 2: Compact Dropdown in Header
**Concept:** Replace hamburger menu or add sprint dropdown to header
```
┌─────────────────────────────────────────┐
│  Header  [Sprints ▼] [Dashboard ▼] [☰] │ ← MODIFIED
└─────────────────────────────────────────┘
```
**Pros:** Minimal space, always visible
**Cons:** May crowd header on mobile

### Option 3: Floating Action Button (FAB)
**Concept:** Add a floating "+ Change Sprints" button on dashboard
```
┌─────────────────────────────────────────┐
│  Dashboard Content                      │
│                                         │
│                                    [🔄] │ ← Floating button
└─────────────────────────────────────────┘
```
**Pros:** Doesn't clutter layout, modern UX
**Cons:** May overlap content, less discoverable

### Option 4: Collapsible Sprint Bar (Hybrid)
**Concept:** Collapsible bar that expands on click/hover
```
Default (collapsed):
┌─────────────────────────────────────────┐
│  Sprints: Q4 2024 (3 selected) [▼]     │ ← Compact bar
└─────────────────────────────────────────┘

Expanded:
┌─────────────────────────────────────────┐
│  🔍 Select Sprints:                     │
│  ☑ Sprint 1  ☑ Sprint 2  ☐ Sprint 3    │
│  [Apply] [Cancel]                   [▲] │
└─────────────────────────────────────────┘
```
**Pros:** Flexible, space-efficient
**Cons:** More complex to implement

---

## 🎨 UX Considerations

### Must Haves
- [ ] Quick access (1-2 clicks max to change sprints)
- [ ] Visual indication of currently selected sprints
- [ ] Works on mobile (responsive)
- [ ] Doesn't obscure dashboard content
- [ ] Keyboard accessible

### Nice to Haves
- [ ] Preview sprint selection before applying
- [ ] Recent/favorite sprints quick access
- [ ] Keyboard shortcuts (e.g., Ctrl+K for quick sprint search)
- [ ] Smooth animations/transitions

---

## 📋 Implementation Plan (Draft)

### Phase 1: Investigation & Prototyping
- [x] Review current component hierarchy ✅ (2025-01-18)
- [ ] Identify best placement option (choose from options above)
- [ ] Create quick visual mockup/sketch
- [ ] Validate with user (Brad)

### Phase 2: Component Refactoring
- [ ] Extract sprint selector logic into reusable component
- [ ] Update `VelocityApp.jsx` to support new UX pattern
- [ ] Modify/remove hamburger menu "Change Sprints" option
- [ ] Update state management if needed

### Phase 3: UI Implementation
- [ ] Build new sprint selector UI component
- [ ] Add to dashboard layout
- [ ] Style for desktop and mobile
- [ ] Add animations/transitions

### Phase 4: Testing & Polish
- [ ] Test on different screen sizes
- [ ] Verify keyboard navigation
- [ ] Ensure accessibility (ARIA labels, etc.)
- [ ] Performance check (no unnecessary re-renders)

---

## 🔧 Technical Notes

### Files to Modify (Estimated)
- `VelocityApp.jsx` - Update sprint selection triggering
- `CompactHeaderWithIterations.jsx` - Add button/trigger for modal
- `HamburgerMenu.jsx` - Keep or update "Change Sprints" option
- `IterationSelectionModal.jsx` - Already well-architected, may not need changes
- Possibly new component depending on chosen design

### Architectural Strengths (Can Leverage)
✅ **Header already displays selected iterations** - Chips are visible, have remove buttons
✅ **Modal is well-designed** - Background prefetch, progress tracking, Apply/Cancel pattern
✅ **State management is clean** - Parent-controlled with two-phase commit
✅ **LocalStorage persistence** - Selections survive page refresh
✅ **Memoization in place** - Performance optimized

### Potential Challenges
- Maintaining two-phase commit pattern if moving away from modal
- Responsive design on mobile (limited header space)
- Not disrupting existing prefetch/download patterns
- Ensuring smooth UX without jarring layout shifts
- Deciding whether to keep modal or create inline alternative

### Key Insight: Header Chips Already Solve Half the Problem!
The header already shows selected iterations as chips with remove buttons. The main pain point is just **accessing the modal to ADD iterations**. We may not need to replace the entire modal - just make it easier to open.

---

## 📝 Questions to Answer

1. **Which design option feels best?** (Need to validate with user)
2. **Should we replace the modal entirely or offer both options?**
3. **Where exactly in the dashboard should it live?**
   - Above navigation tabs?
   - Below header?
   - Integrated into header?
4. **How should mobile experience differ from desktop?**
5. **Do we need to show sprint names or just count?** (e.g., "3 sprints selected" vs "Q4-Sprint1, Q4-Sprint2...")

---

## 🎯 Success Criteria

**This feature is successful if:**
- ✅ Users can change sprint selection in ≤2 clicks
- ✅ Currently selected sprints are always visible
- ✅ Dashboard remains uncluttered and clean
- ✅ Works smoothly on mobile and desktop
- ✅ No regressions in existing functionality

---

## 📌 Next Steps

1. **Explore component hierarchy** - Understand current architecture
2. **Create visual mockups** - Sketch out design options
3. **Choose design approach** - Validate with user preference
4. **Create new branch** - `feat/sprint-selector-inline` or similar
5. **Implement incrementally** - Start with basic functionality, polish later

---

## 💭 Notes & Updates

### 2025-01-18 14:50 - Initial Planning
- Created this document during GitHub outage
- Identified 4 potential design approaches
- Need to explore codebase before deciding on implementation
- **Decision:** Breaking workflow - branching from current branch instead of main due to GitHub outage
- Added instructions for Claude to keep this document updated as living documentation

### 2025-01-18 14:52 - Document Structure Updated
- Added "Instructions for Claude" section for maintaining this document
- Added "GitHub Outage - Workflow Exception" section with recovery plan
- Document now serves as persistent working context across sessions

### 2025-01-18 15:05 - DECISION: ABANDON THIS CHANGE ⛔
**Reason:** After thorough analysis, the existing modal UX is already optimal. The modal provides excellent features (background prefetch, progress tracking, filters, search, two-phase commit). Adding a button to the header would only save 1 click, which doesn't justify the code changes.

**User Decision:** Keep current hamburger menu → "Change Sprints" → modal flow. It works well.

**New Priority:** Focus on fixing incident metrics calculation (MTTR, Change Failure Rate) to use incident start_time/end_time instead of creation/close timestamps.

---

### 2025-01-18 15:00 - Architecture Exploration Complete ✅
**Explored Components:**
- `VelocityApp.jsx` - Root state management
- `IterationSelectionModal.jsx` - Modal with prefetch logic
- `IterationSelector.jsx` - Multi-select component
- `CompactHeaderWithIterations.jsx` - Header display
- `HamburgerMenu.jsx` - Menu with "Change Sprints" trigger

**Key Findings:**
1. **Header already displays selected iterations as chips** with remove buttons
2. **Modal is well-architected** with background prefetch and two-phase commit
3. **State management is clean** - parent-controlled pattern
4. **Main pain point is ACCESS** - getting to the modal requires too many clicks

**Critical Insight:**
The header chips already solve the "visibility" problem. Users can SEE what's selected and REMOVE individual iterations easily. The UX problem is specifically **adding/changing iterations** requires hamburger menu → "Change Sprints" → modal.

**Recommendation Direction:**
Rather than rebuild the modal inline, we should make the modal **easier to open**. The existing modal has excellent UX (prefetch, progress, filters, search). We just need 1-click access to it.

**Updated Design Thinking:**
- **Option 2 (Header Button)** seems most promising - add "Sprints" button to header
- **Option 3 (FAB)** could work - floating button to open modal
- **Options 1 & 4** may be over-engineering - we already have good chips and good modal

---

**Last Updated:** 2025-01-18 15:00
**Next Review:** After design decision and user validation
**Claude:** Keep this document updated as we progress! Add findings, decisions, and updates to the "Notes & Updates" section with timestamps.
