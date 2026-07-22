# 🔍 Auditor de Calidad y Cumplimiento ISO

> Agente determinista que audita repositorios de código contra ISO/IEC 25010,
> OWASP Top 10 y checklist de madurez organizacional — 100% serverless en AWS.

[![CI](https://github.com/AMluisXVI/auditor-calidad-iso/actions/workflows/ci.yml/badge.svg)](https://github.com/AMluisXVI/auditor-calidad-iso/actions)

## 🎯 Problema que Resuelve

Las auditorías de calidad de software son costosas, subjetivas y lentas. Equipos pequeños rara vez pueden pagar un auditor ISO certificado.

**Este agente automatiza y democratiza la auditoría de calidad:**
- Evalúa código contra el estándar internacional ISO/IEC 25010 (8 características de calidad)
- Detecta vulnerabilidades OWASP Top 10 sin depender de IA generativa
- Verifica madurez organizacional (CI/CD, documentación, tests, seguridad)
- Genera informes accionables con recomendaciones priorizadas

**Diferenciador clave:** Es completamente **determinista** — siempre produce los mismos resultados para el mismo input, sin variabilidad de LLMs.

## 🏗️ Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend  │────▶│ API Gateway  │────▶│  Lambda Ingesta  │
│  (Amplify)  │     │   (HTTP)     │     │  Clone + S3      │
└─────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
                                         ┌─────────▼──────────┐
                                         │  Lambda Analyzer    │
                                         │  • Complejidad      │
                                         │  • Duplicación      │
                                         │  • Seguridad OWASP  │
                                         │  • Madurez          │
                                         │  • Scoring ISO      │
                                         └────────┬────────────┘
                                                   │
                    ┌──────────────┐     ┌─────────▼──────────┐
                    │  S3 Reports  │◀────│  Lambda Report Gen  │
                    │  (Markdown)  │     │  Informe + Recs     │
                    └──────────────┘     └────────────────────┘
                                                   │
                                         ┌─────────▼──────────┐
                                         │    DynamoDB         │
                                         │  (Resultados)       │
                                         └────────────────────┘
```

**Servicios AWS (todos free tier):**

| Servicio | Uso | Límite Free Tier |
|----------|-----|-----------------|
| Lambda | 4 funciones (Ingesta, Analyzer, ReportGen, GetReport) | 1M invocaciones/mes |
| API Gateway HTTP | REST endpoints (5 rutas) | 1M llamadas/mes |
| S3 | Código temporal (TTL 24h) + informes persistentes | 5 GB |
| DynamoDB | Resultados de análisis (PAY_PER_REQUEST) | 25 GB + 25 RCU/WCU |
| Amplify Hosting | Frontend React | 1000 min build/mes |
| CloudWatch | Logs + métricas | 5 GB ingest |

## 🚀 Innovación

1. **Determinismo total:** A diferencia de herramientas basadas en IA generativa, nuestro agente produce resultados reproducibles y auditables. Mismo repo → mismo score, siempre.
2. **Catálogo de recomendaciones versionado:** Las sugerencias no se "inventan" — vienen de un catálogo de 15 templates curados basados en mejores prácticas de la industria.
3. **Scoring ISO 25010 configurable:** La rúbrica es transparente y ajustable por organización. Los pesos de cada característica son JSON versionado.
4. **Zero-dependency security scanner:** Detección OWASP sin instalar Semgrep ni herramientas pesadas — usa pattern matching puro con 16 patrones de vulnerabilidad (ejecuta en <100ms).
5. **Arquitectura event-driven desacoplada:** Cada Lambda es independiente, testeable, y escalable con principio de mínimo privilegio (IAM por función).

## ✨ Funcionalidades

### Analizadores

| Módulo | Técnica | Qué detecta |
|--------|---------|-------------|
| **Complejidad ciclomática** | `typhonjs-escomplex` AST | Funciones complejas, per-function metrics |
| **Código duplicado** | Sliding window + SHA-256 | Clones de código sin dependencias externas |
| **Vulnerabilidades OWASP** | 16 regex patterns | Injection, crypto, credentials, XSS, SSRF |
| **Madurez organizacional** | 12 checks por glob | README, LICENSE, CI, tests, SECURITY.md... |
| **Scoring ISO 25010** | Weighted average | 8 características con pesos configurables |

### Informe
- Markdown legible con barras visuales de porcentaje
- JSON estructurado para integración con otras herramientas
- Recomendaciones priorizadas por impacto y esfuerzo (15 templates)
- Almacenado en S3 para acceso permanente

### Frontend
- Formulario simple: pegar URL → obtener auditoría
- Progress bar en 4 pasos (Clone → Analyze → Score → Report)
- Visualización de scores por característica ISO
- Lista de hallazgos con severidad y remediación
- Tema oscuro, responsive, sin frameworks CSS

## 🛠️ Tecnologías

| Categoría | Tecnologías |
|-----------|-------------|
| **IDE** | Kiro (SDD, Steering Files, Hooks) |
| **Runtime** | Node.js 20, TypeScript 5 (strict mode) |
| **Backend** | AWS Lambda, API Gateway HTTP, SAM |
| **Storage** | S3, DynamoDB (PAY_PER_REQUEST) |
| **Frontend** | React 18, Vite 5, CSS custom (sin frameworks) |
| **Hosting** | AWS Amplify |
| **CI/CD** | GitHub Actions (typecheck + lint) |
| **Analysis** | typhonjs-escomplex, crypto SHA-256 nativo |
| **Testing** | node:test (built-in, zero deps) |
| **Monorepo** | pnpm workspaces |

## 📋 Cómo Ejecutar

### Prerequisitos
- Node.js 20+ (ver `.nvmrc`)
- pnpm 9+
- AWS CLI configurado
- AWS SAM CLI

### Instalación local
```bash
git clone https://github.com/AMluisXVI/auditor-calidad-iso.git
cd auditor-calidad-iso
pnpm install
```

### Correr tests
```bash
pnpm test             # Todos los tests (shared + analyzer + report + ingesta)
pnpm test:shared      # Solo shared types/templates
pnpm test:analyzer    # Solo el analyzer (complejidad, duplicación, seguridad)
pnpm test:report      # Solo report generator
pnpm test:ingesta     # Solo ingesta
```

### Typecheck y lint
```bash
pnpm typecheck        # TypeScript strict check
pnpm lint             # ESLint
```

### Development frontend
```bash
pnpm dev:frontend     # Vite dev server en localhost:5173
```

### Deploy a AWS
```bash
pnpm deploy:guided    # Primera vez (interactivo, configura stack)
pnpm deploy           # Subsiguientes (usa samconfig.toml)
pnpm validate         # Validar template SAM sin deploy
```

## 📊 Rúbrica ISO 25010

Ver [RUBRICA.md](./RUBRICA.md) para la rúbrica completa de evaluación.

Cada característica se evalúa de 0-100% con estos pesos:

| Característica | Peso | Qué evalúa |
|----------------|------|-------------|
| Security | 18% | OWASP patterns, credenciales, crypto |
| Maintainability | 16% | Complejidad, duplicación, modularidad |
| Reliability | 15% | Madurez, manejo de errores |
| Functional Suitability | 15% | Completitud funcional |
| Performance Efficiency | 10% | Uso de recursos |
| Usability | 10% | Documentación, UX |
| Compatibility | 8% | Interoperabilidad |
| Portability | 8% | Adaptabilidad |

## 🧪 Tests

```
> Unit tests across all packages (node:test built-in, zero dependencies)
> TypeScript strict mode throughout
> CI pipeline validates typecheck + lint en cada push
```

Tests cubren:
- Análisis de complejidad con fixtures conocidos
- Detección de duplicados con bloques controlados (sliding window + SHA-256)
- Scanner de seguridad con 16 patrones de vulnerabilidad (código vulnerable vs seguro)
- Maturity checks con repos simulados (12 checks por glob pattern)
- Scoring ISO con combinaciones de findings (weighted average + severity penalties)
- Generador de informes con datos mock (Markdown + JSON)
- Handlers Lambda con validación de input

## 🏛️ Arquitectura Detallada

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para el deep-dive técnico completo.

## 🌍 Impacto Potencial

- **Democratización:** Cualquier equipo puede ejecutar una auditoría ISO sin contratar consultores
- **Costo cero:** Opera completamente dentro del free tier de AWS
- **Educativo:** El informe no solo señala problemas — enseña cómo solucionarlos con ejemplos de código
- **Integrable:** JSON output permite integración con CI/CD, dashboards, y otras herramientas
- **Escalable:** Arquitectura serverless escala automáticamente de 0 a miles de auditorías

## 👥 Equipo

[Nombres de los integrantes del equipo]

## 📄 Licencia

MIT — Ver [LICENSE](./LICENSE)
