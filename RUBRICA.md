# Rúbrica de Evaluación ISO 25010

## Modelo de Calidad

Este auditor evalúa software según **ISO/IEC 25010:2011**, el estándar internacional
para modelos de calidad de producto de software.

El modelo define 8 características de calidad, cada una con sub-características
que cubren diferentes aspectos del software evaluado.

## Características y Pesos

| # | Característica | Peso | Sub-características evaluadas |
|---|----------------|------|-------------------------------|
| 1 | **Security** | 18% | Confidentiality, Integrity, Non-repudiation, Accountability, Authenticity |
| 2 | **Maintainability** | 16% | Modularity, Reusability, Analysability, Modifiability, Testability |
| 3 | **Reliability** | 15% | Maturity, Availability, Fault Tolerance, Recoverability |
| 4 | **Functional Suitability** | 15% | Functional Completeness, Functional Correctness, Functional Appropriateness |
| 5 | **Performance Efficiency** | 10% | Time Behaviour, Resource Utilization, Capacity |
| 6 | **Usability** | 10% | Appropriateness Recognizability, Learnability, Operability, User Error Protection, UI Aesthetics, Accessibility |
| 7 | **Compatibility** | 8% | Co-existence, Interoperability |
| 8 | **Portability** | 8% | Adaptability, Installability, Replaceability |

## Algoritmo de Scoring

```
score_característica = 100 - Σ(penalizaciones por finding)
score_característica = max(0, score_característica)

score_final = Σ(score_característica × peso_característica) / Σ(pesos)
```

Cada característica inicia en 100 puntos. Por cada hallazgo (finding), se deduce
una penalización según la severidad. El piso es 0 — ninguna característica puede
tener score negativo.

## Penalizaciones por Severidad

| Severidad | Deducción | Criterio |
|-----------|-----------|----------|
| **Critical** | -20 puntos | Vulnerabilidad explotable, secreto hardcodeado, complejidad >20, SSL deshabilitado |
| **Major** | -10 puntos | Riesgo medio, crypto débil, complejidad >15, clones >50 líneas, XSS |
| **Minor** | -5 puntos | Mejora recomendada, complejidad >10, clones >20 líneas, HTTP sin TLS |
| **Info** | -2 puntos | Sugerencia, buenas prácticas |

## Detección OWASP Top 10 (2021)

El scanner detecta patrones en las siguientes categorías:

| Categoría OWASP | Patrones Detectados | CWE | Severidad |
|-----------------|--------------------|----|-----------|
| **A02 - Cryptographic Failures** | `Math.random()` | CWE-338 | Major |
| | `createHash('md5')` | CWE-328 | Critical |
| | `createHash('sha1')` | CWE-328 | Major |
| | `http://` URLs | CWE-319 | Minor |
| | `rejectUnauthorized: false` | CWE-295 | Critical |
| **A03 - Injection** | `eval()` | CWE-95 | Critical |
| | `new Function()` | CWE-95 | Critical |
| | `child_process` usage | CWE-78 | Major |
| | `exec()` calls | CWE-78 | Major |
| | `innerHTML =` | CWE-79 | Major |
| | `dangerouslySetInnerHTML` | CWE-79 | Major |
| | SQL string concatenation | CWE-89 | Critical |
| **A07 - Auth Failures** | `password = '...'` | CWE-798 | Critical |
| | `secret = '...'` | CWE-798 | Critical |
| | `api_key = '...'` | CWE-798 | Critical |

**Notas:**
- El scanner ignora líneas de comentario para reducir falsos positivos
- Cada hallazgo incluye remediación específica y referencia CWE
- 16 patrones activos cubriendo las categorías más impactantes

## Checklist de Madurez

El análisis de madurez verifica la presencia de archivos y configuraciones que
indican prácticas organizacionales maduras:

| ID | Check | Peso | Categoría | Qué verifica |
|----|-------|------|-----------|--------------|
| MAT-001 | Has README | 3 | Documentación | README.md, README.rst, README.txt |
| MAT-002 | Has LICENSE | 2 | Documentación | LICENSE, LICENCE, LICENSE.md |
| MAT-003 | Has Contributing Guide | 1 | Documentación | CONTRIBUTING.md, DEVELOPMENT.md |
| MAT-004 | Has CI/CD Pipeline | 3 | Automatización | .github/workflows/*.yml, .gitlab-ci.yml, Jenkinsfile |
| MAT-005 | Has Tests | 3 | Calidad | __tests__/, tests/, test/, spec/, *.test.ts |
| MAT-006 | Has Security Policy | 2 | Seguridad | SECURITY.md, .github/SECURITY.md |
| MAT-007 | Has Environment Docs | 1 | Documentación | .env.example, .env.sample, .env.template |
| MAT-008 | Has Changelog | 1 | Documentación | CHANGELOG.md, CHANGES.md, HISTORY.md |
| MAT-009 | Has Linting Config | 2 | Calidad | eslint.config.js, .eslintrc*, .prettierrc*, biome.json |
| MAT-010 | Has Container Config | 2 | Automatización | Dockerfile, docker-compose.yml, compose.yml |
| MAT-011 | Has Dependency Lockfile | 2 | Calidad | package-lock.json, pnpm-lock.yaml, yarn.lock |
| MAT-012 | Has Type Checking | 2 | Calidad | tsconfig.json, .flowconfig, pyrightconfig.json |

**Peso total:** 24 puntos posibles

Checks fallidos generan findings en la característica **Reliability** (sub: Maturity).

## Catálogo de Recomendaciones

El sistema incluye 15 templates de recomendación curados, cada uno con:
- Título descriptivo
- Descripción del problema y solución
- Prioridad (high / medium / low)
- Esfuerzo estimado (low / medium / high)
- Ejemplo de código antes/después
- Referencias a documentación oficial

Las recomendaciones se asignan por **template matching** — no por IA generativa.
Cada finding se mapea determinísticamente a un template basado en `findingType` o `characteristic`.

## Transparencia y Configuración

Esta rúbrica es pública y configurable. Las organizaciones pueden:

- **Ajustar pesos por característica** — Modificar `DEFAULT_CHARACTERISTIC_WEIGHTS` en `iso25010.ts`
- **Modificar penalizaciones por severidad** — Pasar `severityPenalties` al scorer
- **Agregar checks de madurez** — Extender `maturity-checks.json` con nuevas entradas
- **Extender patrones de seguridad** — Agregar regex patterns al array `SECURITY_PATTERNS`
- **Personalizar recomendaciones** — Añadir templates a `recommendations.json`

Todos los criterios están versionados en `packages/shared/src/templates/` como JSON,
lo que permite trazabilidad completa via git.

## Ejemplo de Cálculo

Para un repositorio con los siguientes findings:
- 2 vulnerabilidades críticas (Security): -40 puntos
- 3 hallazgos de complejidad mayor (Maintainability): -30 puntos
- 1 duplicación menor (Maintainability): -5 puntos
- 2 checks de madurez fallidos (Reliability): -10 puntos

```
Security:             100 - 40 = 60
Maintainability:      100 - 35 = 65
Reliability:          100 - 10 = 90
Functional Suitability: 100 (sin findings)
Performance:          100 (sin findings)
Usability:            100 (sin findings)
Compatibility:        100 (sin findings)
Portability:          100 (sin findings)

Score Final = (60×0.18) + (65×0.16) + (90×0.15) + (100×0.15)
            + (100×0.10) + (100×0.10) + (100×0.08) + (100×0.08)
            = 10.8 + 10.4 + 13.5 + 15 + 10 + 10 + 8 + 8
            = 85.7 / 100
```
