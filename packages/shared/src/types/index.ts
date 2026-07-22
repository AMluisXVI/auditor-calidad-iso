export type {
  ISO25010Characteristic,
  ISO25010SubCharacteristic,
  ISO25010Weight,
  ISO25010QualityModel,
} from './iso25010.js';

export {
  ISO25010_CHARACTERISTICS,
  ISO25010_SUB_CHARACTERISTICS,
  DEFAULT_CHARACTERISTIC_WEIGHTS,
  ISO25010_QUALITY_MODEL,
} from './iso25010.js';

export type { OWASPCategory, OWASPCategoryInfo } from './owasp.js';

export { OWASP_CATEGORIES, OWASP_TOP_10 } from './owasp.js';

// --- Analysis Status ---

export type AnalysisStatus =
  | 'pending'
  | 'cloning'
  | 'analyzing'
  | 'generating'
  | 'completed'
  | 'failed';

// --- Core Interfaces ---

export interface AnalysisRequest {
  repositoryUrl: string;
  branch?: string;
  language: string;
  scope?: string[];
}

export interface AnalysisResult {
  requestId: string;
  timestamp: string;
  status: AnalysisStatus;
  findings: Finding[];
  recommendations: Recommendation[];
  score: ISOScore;
  complexity?: ComplexityMetrics;
  duplication?: DuplicationResult;
  maturity?: MaturityResult[];
}

export interface Finding {
  id: string;
  characteristic: string;
  subcharacteristic: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  file: string;
  line?: number;
  message: string;
  rule: string;
}

export interface SecurityFinding extends Finding {
  owaspCategory: string;
  cwe?: string;
  remediation?: string;
}

export interface Recommendation {
  id: string;
  findingId: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  example?: string;
}

export interface Report {
  id: string;
  requestId: string;
  generatedAt: string;
  summary: string;
  result: AnalysisResult;
  format: 'json' | 'html' | 'pdf';
}

export interface ISOScore {
  overall: number;
  characteristics: Record<string, number>;
}

// --- Maturity ---

export interface MaturityCheck {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: string;
  filePatterns: string[];
}

export interface MaturityResult {
  checkId: string;
  passed: boolean;
  evidence?: string;
  details?: string;
}

// --- Complexity ---

export interface FunctionComplexity {
  name: string;
  complexity: number;
  loc: number;
}

export interface ComplexityMetrics {
  file: string;
  functions: FunctionComplexity[];
  aggregate: {
    avg: number;
    max: number;
    total: number;
  };
}

// --- Duplication ---

export interface CloneInstance {
  sourceFile: string;
  sourceLine: number;
  targetFile: string;
  targetLine: number;
  lines: number;
  tokens: number;
}

export interface DuplicationResult {
  clones: CloneInstance[];
  statistics: {
    totalClones: number;
    duplicatedLines: number;
    percentage: number;
  };
}

// --- Configuration ---

export interface AnalysisConfig {
  thresholds: {
    maxComplexity: number;
    maxDuplication: number;
    maxFileLength: number;
    maxFunctionLength: number;
  };
  enabledAnalyzers: string[];
}

// --- Recommendation Templates ---

export interface RecommendationTemplate {
  id: string;
  findingType: string;
  characteristic: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  example?: string;
  references?: string[];
}
