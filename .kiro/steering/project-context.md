# Project Context

## Overview
Auditor Calidad ISO is an AWS-based code quality auditor that analyzes source code against ISO 25010 quality standards.

## Tech Stack
- **Language**: TypeScript (strict mode, ES2022 target, ESM only)
- **Runtime**: Node.js 20
- **Package Manager**: pnpm with workspaces
- **Module System**: ESNext modules with bundler resolution
- **Frontend**: React 18 + Vite 5
- **Infrastructure**: AWS SAM (Lambda, S3, DynamoDB, Step Functions)

## Monorepo Structure
- `packages/shared/` — Shared types and templates (`@auditor/shared`)
- `packages/lambdas/ingesta/` — Code ingestion Lambda (`@auditor/ingesta`)
- `packages/lambdas/analyzer/` — Code analysis Lambda (`@auditor/analyzer`)
- `packages/lambdas/report-generator/` — Report generation Lambda (`@auditor/report-generator`)
- `packages/frontend/` — React web interface (`@auditor/frontend`)
- `infra/` — AWS SAM templates

## Conventions
- All packages use `"type": "module"` (ESM)
- TypeScript strict mode is mandatory
- Each package has its own `tsconfig.json` extending `tsconfig.base.json`
- Lambda handlers export a named `handler` function
