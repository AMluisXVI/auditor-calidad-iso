export * from './types/index.js';

import recommendationsData from './templates/recommendations.json' with { type: 'json' };
import maturityChecksData from './templates/maturity-checks.json' with { type: 'json' };

import type { RecommendationTemplate, MaturityCheck } from './types/index.js';

export const recommendations: RecommendationTemplate[] = recommendationsData as RecommendationTemplate[];
export const maturityChecks: MaturityCheck[] = maturityChecksData as MaturityCheck[];
