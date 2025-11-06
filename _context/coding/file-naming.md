# File Naming Conventions

**Version:** 1.0
**Last Updated:** 2025-11-06

## Overview

Consistent file naming conventions improve code readability and maintainability. This document outlines the naming standards used throughout the gitlab-metrics-tracker project.

## General Principles

- Use descriptive, meaningful names
- Be consistent within each category
- Avoid abbreviations unless widely understood
- Keep names reasonably concise

## Conventions by File Type

### JavaScript Files

**Utilities and Services (kebab-case)**
```
metrics-calculator.js
file-repository.js
gitlab-api-client.js
date-utils.js
```

**React Components (PascalCase)**
```
MetricsDisplay.jsx
SprintSelector.jsx
IssueList.jsx
ErrorBoundary.jsx
```

**Configuration Files (kebab-case)**
```
jest.config.js
babel.config.js
webpack.config.js
```

### Test Files

**Unit Tests (.test.js)**
```
metrics-calculator.test.js
file-repository.test.js
MetricsDisplay.test.jsx
```

**Integration Tests (.integration.test.js)**
```
gitlab-api.integration.test.js
file-storage.integration.test.js
```

**End-to-End Tests (.e2e.test.js)**
```
sprint-workflow.e2e.test.js
```

### Styled Components

**Separate styled files (styled.js)**
```
MetricsDisplay.styled.js
SprintSelector.styled.js
```

**Inline in component file**
```
// For simple components with minimal styles
MetricsCard.jsx (contains both component and styles)
```

### Documentation Files

**Markdown files (kebab-case)**
```
clean-architecture.md
tdd-workflow.md
api-integration.md
```

## Directory Structure Conventions

### Source Code

```
src/
├── core/                    # Domain logic (kebab-case)
│   ├── entities/
│   │   ├── sprint.js
│   │   └── issue.js
│   └── use-cases/
│       └── calculate-metrics.js
├── infrastructure/          # External concerns (kebab-case)
│   ├── api/
│   │   └── gitlab-client.js
│   └── storage/
│       └── file-repository.js
└── presentation/            # UI layer (PascalCase for components)
    ├── components/
    │   ├── MetricsDisplay.jsx
    │   └── SprintSelector.jsx
    └── pages/
        └── Dashboard.jsx
```

### Test Structure (mirrors source)

```
src/
├── core/
│   └── use-cases/
│       ├── calculate-metrics.js
│       └── calculate-metrics.test.js
└── presentation/
    └── components/
        ├── MetricsDisplay.jsx
        └── MetricsDisplay.test.jsx
```

## Examples by Layer

### Core Layer
```
# Entities
issue.js
sprint.js
team-member.js

# Use Cases
calculate-velocity.js
calculate-cycle-time.js
generate-sprint-report.js

# Tests
calculate-velocity.test.js
sprint.test.js
```

### Infrastructure Layer
```
# API Clients
gitlab-api-client.js
gitlab-graphql-queries.js

# Repositories
file-repository.js
cache-repository.js

# Tests
gitlab-api-client.test.js
file-repository.test.js
```

### Presentation Layer
```
# Components
MetricsChart.jsx
MetricsChart.styled.js
MetricsChart.test.jsx

SprintDashboard.jsx
SprintDashboard.styled.js
SprintDashboard.test.jsx

# Pages
Dashboard.jsx
Settings.jsx

# Hooks
useSprintData.js
useMetricsCalculation.js
```

## Special Cases

### Index Files
```
index.js  # Re-exports from directory
```

### Constants and Configuration
```
constants.js
config.js
theme.js
```

### Type Definitions (JSDoc)
```
types.js         # Shared type definitions
sprint-types.js  # Domain-specific types
```

### Utilities
```
date-utils.js
array-utils.js
validation-utils.js
```

## Anti-Patterns to Avoid

**Don't use:**
- `util.js` (too generic)
- `helper.js` (too vague)
- `stuff.js` (meaningless)
- `test.js` (missing context)
- `component1.jsx` (numbered files)
- `temp.js` (temporary files in repo)
- Mixed casing like `fileRepository.js` for non-components

**Instead use:**
- `date-utils.js` (specific purpose)
- `metrics-calculator.js` (descriptive)
- `calculate-metrics.test.js` (clear context)

## Related Documentation

- **Architecture:** `_context/architecture/clean-architecture.md`
- **Testing:** `_context/testing/test-structure.md`
- **React Components:** `_context/coding/react-patterns.md`
- **Styled Components:** `_context/coding/styled-components.md`

## Quick Reference

| File Type | Convention | Example |
|-----------|-----------|---------|
| Component | PascalCase.jsx | `MetricsDisplay.jsx` |
| Service/Utility | kebab-case.js | `metrics-calculator.js` |
| Test | .test.js suffix | `metrics-calculator.test.js` |
| Styled | .styled.js suffix | `MetricsDisplay.styled.js` |
| Config | kebab-case.js | `jest.config.js` |
| Docs | kebab-case.md | `file-naming.md` |
