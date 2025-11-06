# GitLab Sprint Metrics Tracker

**Version 2.0** - Clean Architecture Edition

A robust, local-first tool for tracking and analyzing GitLab sprint metrics. Built with Clean Architecture, SOLID principles, and Test-Driven Development.

## 🎯 Project Goals

- **Clean Architecture** - Maintainable, testable, well-structured code
- **TDD First** - Write tests before implementation (≥85% coverage)
- **Agent-Driven Development** - Leverage specialized AI agents
- **Preserve Proven UX** - Maintain prototype's working UI/UX
- **Local-First** - File system storage, no external databases
- **Defer Decisions** - Make architectural choices when circumstances require it

## 🚀 Features

### Core Metrics
- **Velocity** - Story points completed per sprint
- **Throughput** - Issues closed per sprint
- **Cycle Time** - Time from issue start to close (Avg, P50, P90)
- **Deployment Frequency** - Deployments per day
- **Lead Time** - Commit to production (Avg, P50, P90)
- **MTTR** - Mean time to recovery from incidents

### Annotation System
- Add contextual annotations for events impacting metrics
- Five event types: Process, Team, Tooling, External, Incident
- Impact tracking: Positive, Negative, Neutral
- Correlation analysis and pattern detection
- Visual timeline markers on charts

### Insights & Analysis
- Before/after event impact detection
- Pattern recognition across event types
- Actionable recommendations
- Consistency scoring

## 💻 Tech Stack

**Backend:**
- Node.js 18+ (ES Modules)
- Express.js
- graphql-request (GitLab GraphQL)
- simple-statistics
- File system storage (JSON)

**Frontend:**
- React 18 (Vite)
- styled-components
- Chart.js
- JSDoc (NO TypeScript)

**Testing:**
- Jest (≥85% coverage required)
- React Testing Library
- TDD approach (RED-GREEN-REFACTOR)

## 📋 Prerequisites

- Node.js >= 18.0.0
- GitLab account with API access
- GitLab Personal Access Token (`read_api` scope)

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=your_personal_access_token
GITLAB_PROJECT_PATH=group/project
PORT=3000
NODE_ENV=development
DATA_DIR=./src/data
```

### 3. Run Tests (Recommended)

```bash
npm test
npm run test:coverage  # Verify ≥85% coverage
```

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

## 🧪 Testing

### Run Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### TDD Workflow

1. **🔴 RED** - Write failing test FIRST
2. **🟢 GREEN** - Minimal code to pass test
3. **🔄 REFACTOR** - Clean up (tests stay green)

**Coverage Requirements:**
- Target: ≥85% (statements, branches, functions, lines)
- Test count: 3-10 strategic tests per module
- Test types: 80-90% unit tests, 10-20% integration tests

## 🏗️ Project Structure

```
gitlab-metrics-tracker/
├── .claude/                    # Claude Code agents
│   ├── CLAUDE.md              # Main context file
│   └── agents/                # Specialized agents
│       ├── product-owner.md
│       ├── gitlab-graphql-integration.md
│       ├── ux-ui-design-agent.md
│       ├── clean-architecture-agent.md
│       ├── test-coverage-agent.md
│       └── code-review-agent.md
├── _context/                   # Context documentation
│   ├── architecture/          # ADRs, patterns
│   ├── coding/                # Conventions
│   ├── testing/               # Test strategy
│   ├── workflow/              # Development process
│   ├── domain/                # Business knowledge
│   ├── reference/             # Prototype learnings
│   └── stories/               # Story backlog
├── src/
│   ├── server/                # Express server + API
│   ├── lib/                   # Core business logic
│   │   ├── core/              # Pure business logic (no deps)
│   │   └── infrastructure/    # External dependencies
│   ├── public/                # React frontend
│   └── data/                  # JSON file storage
└── docs/                      # Additional documentation
```

## 🤖 Agent-Driven Development

This project uses specialized AI agents for guidance:

- **Product Owner** - Validates requirements against prototype
- **GitLab Integration** - Expert on GitLab GraphQL API
- **UX/UI Design** - Preserves prototype UI/UX
- **Clean Architecture** - Enforces architecture + SOLID
- **Test Coverage** - Plans TDD strategy, validates tests
- **Code Review** - Reviews for quality and patterns

**See:** `.claude/agents/` for agent definitions

## 📖 Documentation

- **Main Context:** `.claude/CLAUDE.md`
- **Full Index:** `_context/README.md`
- **Agent Usage:** `_context/workflow/agent-usage.md`
- **Metric Formulas:** `_context/domain/metrics-formulas.md`
- **Prototype Lessons:** `_context/reference/prototype-lessons.md`

## 🎨 UI/UX

The UI/UX is preserved from the working prototype at `/Users/brad/dev/smi/gitlab-sprint-metrics/`.

**Design System:**
- Clean, modern card-based layout
- Blue primary color scheme
- System fonts
- Chart.js visualizations
- Keyboard shortcuts (Ctrl+N for new annotation)

**See:** `_context/reference/ui-design-system.md`

## 🗄️ Data Storage

**Current:** File system (JSON files)
- `src/data/metrics.json`
- `src/data/annotations.json`
- `src/data/analysis-runs.json`

**Why not SQLite/MongoDB?**
We're deferring this decision until circumstances require it. File system is simple, works locally, and can be migrated later if needed (Clean Architecture makes this easy).

## 🔐 Security

- ❌ NEVER commit .env files
- ❌ NEVER log sensitive data (tokens, credentials)
- ✅ Use environment variables for config
- ✅ Validate all user input
- ✅ Sanitize data before storage

## 📊 Performance

- Group-level GraphQL queries (vs. per-project)
- Caching (10-minute project cache)
- Rate limiting (100ms delays, batch processing)
- Parallel batch processing (10 concurrent requests)

## 🤝 Contributing

1. Launch appropriate agents before starting work
2. Write tests FIRST (TDD)
3. Ensure ≥85% test coverage
4. Follow Clean Architecture + SOLID
5. Use JSDoc for type annotations
6. Update context documentation

**Workflow:** See `_context/workflow/agent-usage.md`

## 📝 Story Management

- **Backlog:** `_context/stories/backlog.md`
- **In Progress:** `_context/stories/in-progress.md` (ONE at a time)
- **Completed:** `_context/stories/completed.md`

## 🐛 Troubleshooting

**Tests failing?**
- Check test setup: `src/test/setup.js`
- Verify environment variables are mocked
- Run `npm test` -- --verbose` for details

**Can't connect to GitLab?**
- Verify `GITLAB_TOKEN` has `read_api` scope
- Check `GITLAB_PROJECT_PATH` is correct
- Ensure GitLab instance is accessible

**Port conflicts?**
- Change `PORT` in `.env`
- Kill existing processes on port 3000

## 📜 License

MIT License

## 🙏 Acknowledgments

Built on lessons learned from the lightweight prototype at `/Users/brad/dev/smi/gitlab-sprint-metrics/`.

---

**Remember:** Agent-driven, TDD-first, Clean Architecture development. Launch agents BEFORE proposing work. Write tests FIRST. Defer decisions until needed. Build incrementally with discipline. 🚀
