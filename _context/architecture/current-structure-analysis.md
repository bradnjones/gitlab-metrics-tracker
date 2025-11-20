# Current Folder Structure Analysis
**Date:** 2025-11-19
**Project:** GitLab Sprint Metrics Tracker

## Current Structure Overview

```
src/
├── lib/                    # Backend business logic (Clean Architecture)
│   ├── core/              # Domain layer
│   │   ├── entities/      # Business entities
│   │   ├── interfaces/    # Repository interfaces
│   │   ├── services/      # Business logic services
│   │   └── use-cases/     # Application use cases
│   └── infrastructure/    # Implementation layer
│       ├── adapters/      # External service adapters
│       ├── api/           # GitLab API client
│       └── repositories/  # Data persistence
├── public/                # Frontend (React)
│   ├── components/        # React components (37 files)
│   ├── hooks/             # Custom React hooks (4 files)
│   ├── styles/            # Theme and global styles
│   ├── utils/             # Frontend utilities
│   └── js/                # Entry point (main.jsx)
├── server/                # Backend API layer
│   ├── app.js            # Express server setup
│   ├── routes/           # API endpoints (4 files)
│   ├── services/         # Service factory
│   └── middleware/       # (empty)
├── data/                  # Runtime data (JSON files, cache)
└── test/                  # Test setup
```

## Identified Issues

### 🔴 CRITICAL: Structure Confusion

#### 1. **Unclear Layer Boundaries**
**Problem:** It's not immediately obvious which code is:
- Backend business logic (`src/lib/`)
- Backend API layer (`src/server/`)
- Frontend UI (`src/public/`)

**Why it's confusing:**
- `src/lib/` could mean "shared library" (frontend + backend)
- `src/public/` typically means "static assets" in web development
- Relationship between `src/server/` and `src/lib/` is unclear

#### 2. **Duplicate "Services" Concept**
**Problem:** Two different "services" directories:
- `src/lib/core/services/` - Business logic services (MetricsService, VelocityCalculator, etc.)
- `src/server/services/` - Service factory for DI

**Why it's confusing:**
- Same name, different purposes
- Not clear which is which without reading code

#### 3. **Mixed Responsibilities in `src/server/`**
**Problem:** `src/server/` has:
- Express setup (`app.js`)
- API routes (`routes/`)
- Service factory (`services/ServiceFactory.js`)

**Why it's confusing:**
- Service factory is infrastructure/DI concern, not API concern
- Routes are presentation layer, but service factory is infrastructure layer
- Violates Clean Architecture layer separation

#### 4. **Runtime Data in `src/`**
**Problem:** `src/data/` contains runtime JSON files and cache

**Why it's confusing:**
- `src/` should contain source code, not runtime data
- Cache files shouldn't be in version control directory structure
- Mixes code with data

### 🟡 MODERATE: Naming Confusion

#### 5. **`src/lib/` Name is Ambiguous**
**Problem:** "lib" suggests:
- Could be frontend library
- Could be backend library
- Could be shared code

**Reality:** It's backend-only business logic with Clean Architecture

**Better names:**
- `src/backend/domain/` (emphasizes backend + domain logic)
- `src/core/` (if truly shared)
- `src/business/` (emphasizes business logic)

#### 6. **`src/public/` Name is Misleading**
**Problem:** In web development, "public" typically means:
- Static assets (HTML, CSS, images)
- Files served directly by web server
- No build step required

**Reality:** It's React source code requiring build/transpilation

**Better names:**
- `src/frontend/` (clear it's frontend)
- `src/client/` (client-side code)
- `src/ui/` (user interface layer)

### 🟢 MINOR: Organizational Issues

#### 7. **Test Setup Location**
**Problem:** `src/test/setup.js` is in `src/` but tests are in `test/`

**Why it's confusing:**
- Orphaned file in src/
- Not co-located with tests

#### 8. **Empty Middleware Directory**
**Problem:** `src/server/middleware/` exists but is empty

**Why it's confusing:**
- Suggests middleware exists when it doesn't
- Adds noise to structure

## Clean Architecture Violations

### Current Layer Dependencies

```
Presentation Layer (src/server/routes/)
         ↓
Application Layer (src/lib/core/use-cases/)
         ↓
Domain Layer (src/lib/core/services/, entities/)
         ↓
Infrastructure Layer (src/lib/infrastructure/)
```

**Issues:**
1. ✅ **GOOD:** Core doesn't depend on Infrastructure (uses interfaces)
2. ✅ **GOOD:** Infrastructure depends on Core (implements interfaces)
3. ❌ **BAD:** Routes directly instantiate services (no DI container)
4. ❌ **BAD:** Service factory in wrong layer (should be in infrastructure)
5. ❌ **BAD:** Frontend components call backend API directly (no frontend service layer)

## Proposed Improvements

### Option A: Backend/Frontend Split (Simple)

```
src/
├── backend/           # All backend code
│   ├── core/         # Business logic (domain layer)
│   ├── infrastructure/  # External services, DB, APIs
│   ├── api/          # Express routes (presentation)
│   └── server.js     # Entry point
├── frontend/          # All frontend code
│   ├── components/
│   ├── hooks/
│   ├── services/     # Frontend API service layer
│   ├── styles/
│   └── main.jsx
└── shared/            # Truly shared code (if any)
```

**Pros:**
- Crystal clear: backend vs frontend
- Easy to navigate
- Follows common conventions

**Cons:**
- Loses Clean Architecture naming (core/infrastructure)
- May need to nest Clean Architecture inside backend/

### Option B: Clean Architecture First (Purist)

```
src/
├── core/              # Domain layer (pure business logic)
│   ├── entities/
│   ├── services/
│   └── use-cases/
├── infrastructure/    # Implementation layer
│   ├── persistence/  # File repos, DB repos
│   ├── external/     # GitLab client
│   └── di/           # Dependency injection
├── presentation/      # Presentation layer
│   ├── api/          # Express API (backend presentation)
│   └── web/          # React UI (frontend presentation)
└── main/              # Entry points
    ├── server.js
    └── client.jsx
```

**Pros:**
- True Clean Architecture structure
- Clear layer separation
- Follows Uncle Bob's conventions

**Cons:**
- Frontend/backend split is less obvious
- Requires understanding Clean Architecture

### Option C: Hybrid (SELECTED ✅)

```
src/
├── backend/
│   ├── core/              # Business logic
│   │   ├── domain/        # Entities, value objects
│   │   ├── services/      # Business services
│   │   └── use-cases/     # Application use cases
│   ├── infrastructure/    # External dependencies
│   │   ├── gitlab/        # GitLab API client
│   │   ├── persistence/   # File/DB repositories
│   │   └── di/            # Dependency injection
│   ├── api/               # Express API layer
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── controllers/   # Route handlers
│   └── server.js          # Entry point
├── frontend/
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── services/          # API client services
│   ├── styles/            # Theme, global styles
│   ├── utils/             # Utilities
│   └── main.jsx           # Entry point
├── shared/                # Shared types/constants (if needed)
└── data/                  # Move outside src/ (runtime data)
```

**Pros:**
- Clear backend/frontend split
- Preserves Clean Architecture in backend
- Industry-standard conventions
- Easy for new developers

**Cons:**
- More folders/nesting
- Requires file moves

## Recommended Actions

### Phase 1: Pre-Refactor (DO FIRST)
1. ✅ Ensure ≥85% test coverage (Test Coverage Agent)
2. ✅ Document current architecture (This document)
3. ✅ Run Clean Architecture Agent review
4. ✅ Run Code Review Agent analysis

### Phase 2: Restructure (After tests pass)
1. **Move runtime data out of src/**
   ```bash
   mv src/data/ data/
   # Update paths in code
   ```

2. **Rename top-level directories**
   ```bash
   mv src/lib/ src/backend-temp/
   mv src/server/ src/backend-temp/api/
   mv src/public/ src/frontend/
   mv src/backend-temp/ src/backend/
   ```

3. **Reorganize backend structure**
   - Move `src/backend/core/` as-is (already good)
   - Move `src/backend/infrastructure/` as-is (already good)
   - Rename `src/backend/api/` (was `server/`)
   - Move `ServiceFactory` to `src/backend/infrastructure/di/`

4. **Add frontend service layer**
   - Create `src/frontend/services/` for API calls
   - Extract API calls from components

5. **Clean up**
   - Delete empty `middleware/` folder
   - Move `test/setup.js` to `test/`

### Phase 3: Post-Refactor
1. Update all import paths
2. Run all tests (should pass - we have coverage!)
3. Update documentation
4. Update build scripts (Vite, etc.)

## Migration Risks

### High Risk (Need careful handling)
1. **Import paths** - Will break everywhere
   - Mitigation: Use find/replace, run tests frequently

2. **Build configuration** - Vite, Jest configs need updates
   - Mitigation: Update configs first, test builds

3. **API routes** - Paths to services will change
   - Mitigation: Update ServiceFactory first

### Low Risk
1. **Test files** - Already in separate `test/` directory
2. **Frontend components** - Self-contained
3. **Core business logic** - No external dependencies

## Metrics

### Current State
- Total files: ~87 JavaScript/JSX files
- Backend files: ~30 (lib/ + server/)
- Frontend files: ~50 (public/)
- Test files: ~60+ (in test/)

### Expected Changes
- Files to move: ~87 files
- Import statements to update: ~500+ (estimate)
- Config files to update: ~5 (vite.config, jest.config, etc.)

## Decision: Hybrid Structure (Option C) ✅

**Date:** 2025-11-19
**Decision Made By:** Product Owner

We will implement **Option C: Hybrid Structure** as the target architecture.

### Rationale

This approach provides the best balance of:
1. **Clarity** - Clear backend/frontend split for easy navigation
2. **Clean Architecture** - Preserves CA principles in backend
3. **Industry Standards** - Follows common conventions (easy onboarding)
4. **Maintainability** - Proper layer separation with abstractions

### Target Structure

```
src/
├── backend/
│   ├── core/              # Business logic (domain layer)
│   │   ├── domain/        # Entities, value objects
│   │   ├── services/      # Business services
│   │   └── use-cases/     # Application use cases
│   ├── infrastructure/    # External dependencies
│   │   ├── gitlab/        # GitLab API client
│   │   ├── persistence/   # File/DB repositories
│   │   └── di/            # Dependency injection
│   ├── api/               # Express API layer (presentation)
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── controllers/   # Route handlers
│   └── server.js          # Entry point
├── frontend/
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── services/          # API client services (NEW)
│   ├── styles/            # Theme, global styles
│   ├── utils/             # Utilities
│   └── main.jsx           # Entry point
├── shared/                # Shared types/constants (if needed)
data/                      # Runtime data (MOVED outside src/)
```

### Key Changes from Current Structure

1. **`src/lib/` → `src/backend/`** - Clear it's backend code
2. **`src/server/` → `src/backend/api/`** - Part of backend, presentation layer
3. **`src/public/` → `src/frontend/`** - Clear it's frontend code
4. **Add `src/frontend/services/`** - API client layer (NEW)
5. **Move `src/data/` → `data/`** - Runtime data outside source
6. **Move ServiceFactory → `src/backend/infrastructure/di/`** - Correct layer

## Next Steps

1. ✅ **Wait for Test Coverage Agent** - Ensure strong tests before refactoring (IN PROGRESS)
2. ⏳ **Run Clean Architecture Agent** - Get detailed architecture review
3. ⏳ **Run Code Review Agent** - Identify coupling and code smells
4. ⏳ **Create refactoring plan** - Prioritize changes based on agent feedback
5. ⏳ **Execute incrementally** - Small PRs, keep tests passing
