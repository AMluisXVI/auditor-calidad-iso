# Architecture — Auditor de Calidad ISO

## Design Decisions

### 1. Deterministic over Generative

We deliberately chose NOT to use generative AI for the analysis. Here's why:
- **Reproducibility:** Same input → same output, every time
- **Auditability:** You can trace exactly why a score was given
- **Speed:** Pattern matching runs in milliseconds, no API calls
- **Cost:** Zero AI token costs
- **Reliability:** No hallucinations, no inconsistency

### 2. Monorepo with Workspace Dependencies

```
packages/
├── shared/              # Types + catalog templates (shared contract)
│   └── src/
│       ├── types/       # ISO 25010, OWASP, Finding types
│       └── templates/   # Recommendations, maturity checks (JSON)
├── lambdas/
│   ├── ingesta/         # Step 1: Clone repos to S3
│   │   └── src/
│   │       ├── clone.ts     # git clone --depth 1 via execFile
│   │       ├── s3.ts        # Upload to S3
│   │       └── cleanup.ts   # Temp file removal
│   ├── analyzer/        # Step 2: Run all analysis modules
│   │   └── src/
│   │       ├── orchestrator.ts    # Core pipeline coordinator
│   │       ├── analyzers/         # 4 pure-function analyzers
│   │       ├── scoring/           # ISO 25010 weighted scorer
│   │       ├── s3-reader.ts       # Read code from S3
│   │       └── dynamo.ts          # Persist results
│   └── report-generator/ # Step 3: Generate Markdown + JSON reports
│       └── src/
│           ├── generator.ts       # Report assembly
│           └── index.ts           # Lambda handlers (generate + get)
└── frontend/            # React UI (Vite + TypeScript)
    └── src/
        ├── App.tsx
        └── components/
```

Each package is independently deployable and testable. `@auditor/shared` defines the contract that all packages follow.

### 3. Pipeline Architecture

The analysis flow is a linear pipeline with 3 independent Lambda stages:

```
POST /analyze → IngestaLambda → S3 (code stored temporarily)
POST /analyze/run → AnalyzerLambda → DynamoDB (results persisted)
POST /report/generate → ReportGeneratorLambda → S3 (report stored)
GET /report/{id} → GetReportLambda → Returns report content
```

Each step is a separate Lambda = separate scaling, separate error handling, separate IAM permissions (principle of least privilege).

### 4. Analysis Modules

```
┌──────────────────────────────────────────────────┐
│              Orchestrator (orchestrator.ts)        │
├──────────────┬──────────────┬──────────┬─────────┤
│ Complexity   │ Duplication  │ Security │ Maturity│
│ (escomplex)  │ (sha-256)    │ (regex)  │ (glob)  │
└──────────────┴──────────────┴──────────┴─────────┘
        │              │             │          │
        └──────────────┴─────────────┴──────────┘
                           │
                  ┌────────▼────────┐
                  │  ISO Scorer     │
                  │  (weighted avg) │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │ Recommendations │
                  │ (template match)│
                  └─────────────────┘
```

Each module:
- Is a **pure function** (no side effects, no I/O during analysis)
- Receives data as parameters (file content as `Map<string, string>`)
- Returns typed results conforming to `@auditor/shared`
- Is independently testable with `node:test`

#### Complexity Analyzer
- Uses `typhonjs-escomplex` for AST-based cyclomatic complexity
- Reports per-function metrics (name, line, complexity score)
- Generates findings when complexity exceeds thresholds (>10: minor, >15: major, >20: critical)

#### Duplication Analyzer
- Custom implementation with zero external dependencies
- **Algorithm:** Line-based sliding window with SHA-256 content hashing
- Normalizes code (strips comments, whitespace) before comparison
- Detects clones across files and within the same file
- Configurable: minimum lines (default: 5), minimum tokens (default: 50), threshold (default: 10%)

#### Security Analyzer
- 16 regex patterns covering 4 OWASP categories (A02, A03, A07)
- Maps each finding to CWE identifiers and ISO 25010 sub-characteristics
- Skips comment lines to reduce false positives
- Each pattern includes a remediation suggestion
- Categories covered:
  - A03:2021 Injection: eval, Function(), exec, innerHTML, SQL concatenation, dangerouslySetInnerHTML
  - A02:2021 Crypto Failures: Math.random, MD5, SHA1, HTTP URLs, SSL disabled
  - A07:2021 Auth Failures: hardcoded passwords, secrets, API keys

#### Maturity Analyzer
- 12 checks defined in `maturity-checks.json` (configurable)
- Checks file existence via glob patterns against the repository file list
- Categories: documentation, automation, quality, security
- Each check has a weight contributing to the Reliability characteristic

### 5. Scoring Algorithm

```
For each finding:
  characteristic_score -= severity_penalty

  Penalties:
    critical: -20 points
    major:    -10 points
    minor:     -5 points
    info:      -2 points

  Each characteristic starts at 100, floor at 0

overall = Σ (characteristic_score × weight) / Σ weights
```

Weights are defined in `packages/shared/src/types/iso25010.ts`:
- Security: 18%
- Maintainability: 16%
- Reliability: 15%
- Functional Suitability: 15%
- Performance Efficiency: 10%
- Usability: 10%
- Compatibility: 8%
- Portability: 8%

Weights are configurable — the scorer accepts an optional `weights` override.

### 6. Recommendation Engine

Instead of generating recommendations with AI, we use a **template matching** approach:
- 15 curated recommendation templates in `recommendations.json`
- Each template maps to a `findingType` or `characteristic`
- Templates include: title, description, priority, effort estimate, code example, and references
- Matching is deterministic: same findings → same recommendations

### 7. Security Design

- **No secrets in code** — all config via environment variables (injected by SAM)
- **No exec()** — `execFile` only with explicit argument arrays (shell injection prevention)
- **Input validation** — all Lambda handlers validate request body before processing
- **S3 lifecycle** — temporary code auto-deletes after 24h (`ExpirationInDays: 1`)
- **IAM least privilege** — each Lambda gets only the permissions it needs:
  - Ingesta: S3 write only to code bucket
  - Analyzer: S3 read from code + DynamoDB write
  - Report Generator: DynamoDB read + S3 write to reports
  - Get Report: S3 read from reports only
- **DynamoDB PAY_PER_REQUEST** — no provisioned capacity to exploit
- **CORS configured** — API Gateway restricts origins

## Data Flow

```
User → POST /analyze { repositoryUrl }
  → IngestaLambda
    → git clone --depth 1 (execFile, explicit args)
    → Filter files (skip .git, node_modules, binaries)
    → Upload to S3 code bucket
    → Return { requestId, s3Location }

User → POST /analyze/run { requestId, s3Location }
  → AnalyzerLambda
    → Read files from S3
    → Filter to .js/.ts/.jsx/.tsx (CODE_EXTENSIONS set)
    → Run pipeline: complexity → duplication → security → maturity
    → Calculate ISO score (weighted average)
    → Generate recommendations (template matching)
    → Save full AnalysisResult to DynamoDB
    → Return { requestId, status, score }

User → POST /report/generate { requestId }
  → ReportGeneratorLambda
    → Read AnalysisResult from DynamoDB
    → Generate Markdown report (visual bars, findings, recommendations)
    → Generate JSON report (structured, machine-readable)
    → Store both in S3 reports bucket
    → Return { reportId, urls }

User → GET /report/{id}?format=json|markdown
  → GetReportLambda
    → Read from S3 reports bucket
    → Return report content (Markdown or JSON)
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/shared/src/types/index.ts` | Central type definitions (Finding, AnalysisResult, etc.) |
| `packages/shared/src/types/iso25010.ts` | ISO 25010 quality model (8 characteristics, weights) |
| `packages/shared/src/types/owasp.ts` | OWASP-specific type definitions |
| `packages/shared/src/templates/recommendations.json` | 15 curated recommendation templates |
| `packages/shared/src/templates/maturity-checks.json` | 12 maturity verification checks |
| `packages/lambdas/analyzer/src/orchestrator.ts` | Core analysis pipeline coordinator |
| `packages/lambdas/analyzer/src/analyzers/complexity.ts` | Cyclomatic complexity (escomplex) |
| `packages/lambdas/analyzer/src/analyzers/duplication.ts` | Clone detection (SHA-256 hashing) |
| `packages/lambdas/analyzer/src/analyzers/security.ts` | OWASP vulnerability scanner (16 patterns) |
| `packages/lambdas/analyzer/src/analyzers/maturity.ts` | Organizational maturity (12 checks) |
| `packages/lambdas/analyzer/src/scoring/iso-scorer.ts` | ISO 25010 weighted scoring engine |
| `packages/lambdas/ingesta/src/clone.ts` | Git clone via execFile |
| `packages/lambdas/ingesta/src/s3.ts` | Upload code to S3 |
| `packages/lambdas/report-generator/src/generator.ts` | Report assembly (Markdown + JSON) |
| `packages/frontend/src/App.tsx` | React frontend entry |
| `infra/template.yaml` | SAM infrastructure (all AWS resources) |
| `.github/workflows/ci.yml` | CI pipeline (typecheck + lint) |

## Infrastructure as Code

All infrastructure is defined in `infra/template.yaml` (AWS SAM):
- 4 Lambda functions with specific memory/timeout per use case
- 1 HTTP API Gateway with CORS
- 2 S3 buckets (code with TTL, reports persistent)
- 1 DynamoDB table (PAY_PER_REQUEST)
- IAM policies following least privilege

Deploy with a single command: `pnpm deploy`
