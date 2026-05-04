# Architecture Rules

**Purpose:** Machine-checkable architectural rules for this repository. The `sentinel` agent loads this file and evaluates an in-flight diff against each rule.

**Audience:** The sentinel subagent. Humans should read this too — every rule cites a real file in the repo as evidence.

**Scope:** Architectural and structural rules only. Code style, performance, accessibility, and security review live in `code-review-agent`. Deep design review lives in `clean-architecture-agent`.

---

## How to read a rule

```
### R0XX — Title
- Severity:   MUST | SHOULD
- Scope:      core | infrastructure | presentation | cross-cutting
- Rule:       One-sentence statement.
- Detection:  How the sentinel can spot a violation in a diff.
- Evidence:   A real file in this repo that follows the rule.
- Counter:    What a violation looks like.
- Fix:        How to resolve.
```

**Severity:**
- `MUST` — violation breaks an architectural invariant. Block.
- `SHOULD` — violation degrades quality but doesn't break invariants. Warn.

---

## Layer boundary rules

### R001 — Core must not import from infrastructure or presentation
- **Severity:** MUST
- **Scope:** core
- **Rule:** Files under `src/lib/core/` may not import from `src/lib/infrastructure/`, `src/server/`, or `src/public/`.
- **Detection:** For any added/modified line in a file under `src/lib/core/**`, look for `import ... from '...infrastructure/...'`, `'...server/...'`, or `'...public/...'`.
- **Evidence:** `src/lib/core/services/MetricsService.js` — imports only from `./` and `../entities/`.
- **Counter:** `import { GitLabClient } from '../../infrastructure/api/GitLabClient.js';` inside a core file.
- **Fix:** Define an interface in `src/lib/core/interfaces/` and have core depend on the interface. Wire the concrete implementation through `src/server/services/ServiceFactory.js`.

### R002 — Infrastructure depends on core only via interfaces and entities
- **Severity:** MUST
- **Scope:** infrastructure
- **Rule:** Files under `src/lib/infrastructure/` may import from `src/lib/core/interfaces/` and `src/lib/core/entities/`. They must not reach into `src/lib/core/services/` or `src/lib/core/use-cases/`.
- **Detection:** In a diff to `src/lib/infrastructure/**`, flag imports targeting `core/services/` or `core/use-cases/`.
- **Evidence:** `src/lib/infrastructure/repositories/FileAnnotationsRepository.js:18` — `export class FileAnnotationsRepository extends IAnnotationsRepository`.
- **Counter:** An infrastructure adapter importing `MetricsService` directly.
- **Fix:** Depend on the interface. Let the composition root (`ServiceFactory`) wire concrete services to concrete adapters.

### R003 — Repository interfaces live in core; implementations in infrastructure
- **Severity:** MUST
- **Scope:** cross-cutting
- **Rule:** Every repository interface is named `I<Name>Repository` and lives in `src/lib/core/interfaces/`. Every implementation lives in `src/lib/infrastructure/repositories/` and `extends` its interface.
- **Detection:**
  - New file matching `*Repository.js` outside those two directories → violation.
  - New `class *Repository` in infrastructure that does not `extends I*Repository` → violation.
- **Evidence:** `src/lib/core/interfaces/IAnnotationsRepository.js` ↔ `src/lib/infrastructure/repositories/FileAnnotationsRepository.js`.
- **Counter:** `class MemoryAnnotationsRepository { ... }` (no `extends`) inside `src/lib/infrastructure/repositories/`.
- **Fix:** Add `extends IAnnotationsRepository` (or the appropriate interface) and import it from `../../core/interfaces/`.

### R004 — Routes obtain services from `ServiceFactory`; never `new` infrastructure directly
- **Severity:** MUST
- **Scope:** presentation
- **Rule:** Files under `src/server/routes/` must construct services exclusively via `ServiceFactory` static methods.
- **Detection:** In a diff to `src/server/routes/**`, flag any `new GitLabClient(`, `new GitLabIterationDataProvider(`, `new MetricsService(`, `new File*Repository(`, or any other `new *` of an infrastructure/core service class.
- **Evidence:** `src/server/routes/metrics.js:8` imports `ServiceFactory`; line 40 calls `ServiceFactory.createMetricsService()`.
- **Counter:** `const svc = new MetricsService(new GitLabIterationDataProvider(client));` inside a route handler.
- **Fix:** Add a factory method to `src/server/services/ServiceFactory.js` and call it from the route.

### R014 — New repository classes extend their `I<Name>` interface
- **Severity:** MUST
- **Scope:** infrastructure
- **Rule:** Any new class whose name ends in `Repository` (and lives in `src/lib/infrastructure/repositories/`) must `extends` an interface from `src/lib/core/interfaces/`.
- **Detection:** New `export class *Repository` line in infrastructure without `extends I*` on the same line.
- **Evidence:** `FileAnnotationsRepository extends IAnnotationsRepository`.
- **Counter:** `export class MemoryAnnotationsRepository {`.
- **Fix:** Either extend the existing interface or, if the contract is genuinely new, create the interface in `src/lib/core/interfaces/` first, then extend it.

---

## Module / import rules

### R005 — ES module imports use explicit `.js` extension on relative paths
- **Severity:** MUST
- **Scope:** cross-cutting
- **Rule:** Every relative `import` (starting with `./` or `../`) must end in `.js` (or `.jsx` for JSX components).
- **Detection:** Regex on added import lines: `^import .* from ['"]\.\.?/[^'"]+['"]` where the path does not end in `.js`, `.jsx`, `.css`, or `.json`.
- **Evidence:** Every file under `src/`. Example: `src/lib/core/services/MetricsService.js` imports `'./VelocityCalculator.js'`.
- **Counter:** `import { Annotation } from './Annotation';`
- **Fix:** Append `.js` (or `.jsx`).

---

## Naming and structure rules

### R008 — File-naming convention by kind
- **Severity:** MUST
- **Scope:** cross-cutting
- **Rule:**
  - React components: `PascalCase.jsx`
  - Styled-component siblings: `PascalCase.styles.jsx` (or `.styles.js`)
  - React hooks: `useCamelCase.js`
  - Classes / services / entities / interfaces: `PascalCase.js`
  - Pure utility modules: `camelCase.js`
  - Tests: `<MirroredName>.test.js`
- **Detection:** New file under `src/` whose path violates the table above.
- **Evidence:** `src/public/components/AnnotationModal.jsx` + `src/public/components/AnnotationModal.styles.jsx`; `src/public/hooks/useAnnotations.js`; `src/public/utils/metricFormatters.js`.
- **Counter:** `src/public/components/annotation_modal.jsx` (snake_case), `src/public/utils/MetricFormatters.js` (PascalCase utility).
- **Fix:** Rename to match convention. Update all importers.

### R009 — Module-level constants use `SCREAMING_SNAKE_CASE`
- **Severity:** SHOULD
- **Scope:** cross-cutting
- **Rule:** Top-level `const` values that hold fixed enums, lookup tables, or configuration should use `SCREAMING_SNAKE_CASE`.
- **Detection:** New top-level `const someName = [...]` or `const someName = {...}` in `camelCase` where the value is a literal array/object of constants.
- **Evidence:** `src/server/routes/annotations.js:21` — `const VALID_TYPES = ['process', 'team', 'tooling', 'external', 'incident'];`
- **Counter:** `const validTypes = ['process', 'team', ...];`
- **Fix:** Rename. Update references.

### R013 — Tests mirror `src/` paths and use `*.test.js` suffix
- **Severity:** MUST
- **Scope:** cross-cutting
- **Rule:** A test for `src/<path>/<Name>.js` lives at `test/<path>/<Name>.test.js`.
- **Detection:** New test file outside `test/` or with a non-`.test.js` suffix.
- **Evidence:** `src/lib/core/services/VelocityCalculator.js` ↔ `test/core/services/VelocityCalculator.test.js`.
- **Counter:** `src/lib/core/services/VelocityCalculator.spec.js`, or `test/VelocityCalculator.test.js` (flat, not mirrored).
- **Fix:** Move and rename.

---

## React rules

### R010 — No PropTypes; document component props with JSDoc
- **Severity:** MUST
- **Scope:** presentation
- **Rule:** React components do not declare `propTypes`. Props are documented with a JSDoc block on the component function (`@param {Object} props` + per-key `@param`).
- **Detection:**
  - Any added `import PropTypes from 'prop-types'` → violation.
  - Any added `Component.propTypes = { ... }` → violation.
- **Evidence:** `src/public/components/AnnotationModal.jsx` — JSDoc block on the component, no PropTypes.
- **Counter:** `import PropTypes from 'prop-types'; AnnotationModal.propTypes = { ... };`
- **Fix:** Delete the PropTypes block, document the same shape with JSDoc.

### R011 — React components are functional + hooks; no class components
- **Severity:** MUST
- **Scope:** presentation
- **Rule:** Components under `src/public/components/` are functions. No `class X extends React.Component` or `class X extends Component`.
- **Detection:** Added `class \w+ extends (React\.)?Component` in any `.jsx` file.
- **Evidence:** All current files under `src/public/components/` are functional.
- **Counter:** `class VelocityChart extends Component { render() { ... } }`
- **Fix:** Rewrite as a function component using hooks.

### R012 — Inline `style={{...}}` is forbidden in JSX; use styled-components
- **Severity:** MUST
- **Scope:** presentation
- **Rule:** JSX elements must not carry an inline `style` prop. Use `styled-components` defined in a sibling `*.styles.jsx`, or use the theme.
- **Detection:** Added line in a `.jsx` file containing `style={{`.
- **Evidence:** `src/public/components/AnnotationModal.styles.jsx` co-located with `AnnotationModal.jsx`.
- **Counter:** `<div style={{ color: 'red', padding: '8px' }}>`
- **Fix:** Define a styled component in the sibling `*.styles.jsx` and use it.

---

## Documentation rules

### R007 — Public exports carry JSDoc
- **Severity:** SHOULD
- **Scope:** cross-cutting
- **Rule:** Newly added or modified exported functions, classes, methods, and React components include a JSDoc block. Where applicable: `@param`, `@returns`, `@throws`.
- **Detection:** A new `export function`, `export class`, `export const ... = (...) =>`, or a new method on an exported class without an immediately preceding `/** ... */` block.
- **Evidence:** `src/lib/core/services/VelocityCalculator.js:1-34`.
- **Counter:** `export function calculateChangeFailureRate(deployments) { ... }` with no JSDoc.
- **Fix:** Add a JSDoc block describing purpose, parameters, return value, and any thrown errors. See `_context/coding/jsdoc-guide.md`.

---

## Security and validation rules

### R006 — No secrets in logs
- **Severity:** MUST
- **Scope:** cross-cutting
- **Rule:** Log calls must not pass tokens, credentials, full env values, or auth headers as arguments.
- **Detection:** Added `console.*(...)`, `logger.*(...)`, or any `.log(...)` whose argument list mentions: `process.env.GITLAB_TOKEN`, `process.env.BASIC_AUTH_PASS`, `process.env.BASIC_AUTH_USER`, `Authorization`, `Bearer `, `password`, `token` (when value, not literal label like `'token-id:'`).
- **Evidence:** `_context/coding/logging-security.md`.
- **Counter:** `console.log('token:', process.env.GITLAB_TOKEN);` or `logger.info(req.headers);`
- **Fix:** Log only IDs, counts, and non-sensitive metadata. Redact: `logger.info('auth', { user: req.user?.id });`.

### R015 — Domain validation throws in core; route validation returns `{valid, error}`
- **Severity:** SHOULD
- **Scope:** cross-cutting
- **Rule:** Validation inside `src/lib/core/` `throw`s domain errors. Validation inside `src/server/routes/` returns `{ valid: boolean, error?: string }` and is converted to an HTTP response by the route handler.
- **Detection:**
  - New validator in `src/lib/core/` returning `{valid, error}` instead of throwing → violation.
  - New validator in `src/server/routes/` throwing instead of returning a result object → violation.
- **Evidence:** `Annotation.validate()` (throws) vs. `validateAnnotation()` in `src/server/routes/annotations.js` (returns `{valid, error}`).
- **Counter:** A core entity returning `{valid: false, error: '...'}` instead of throwing.
- **Fix:** Match the convention for the layer.

---

## Adding new rules

When extending this file:
1. Use the next free `R0XX` ID. Do not renumber.
2. Cite an actual path in this repo as `Evidence`. If no example exists yet, the rule probably isn't enforceable yet — defer it.
3. Keep `Detection` concrete enough that the sentinel can implement it with `Grep`/`Read`/`Bash`. If a rule needs a parser or test run to evaluate, mark it `SHOULD` and expect the sentinel to `[SKIP]` it with a reason.
