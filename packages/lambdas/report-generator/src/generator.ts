import type {
  Finding,
  ISOScore,
  Recommendation,
  RecommendationTemplate,
  ComplexityMetrics,
  DuplicationResult,
  MaturityResult,
} from '@auditor/shared';
import { recommendations as catalog } from '@auditor/shared';
import { randomUUID } from 'node:crypto';

export interface ReportInput {
  requestId: string;
  findings: Finding[];
  score: ISOScore;
  complexity?: ComplexityMetrics;
  duplication?: DuplicationResult;
  maturity?: MaturityResult[];
}

export interface GeneratedReport {
  id: string;
  requestId: string;
  generatedAt: string;
  markdown: string;
  json: object;
  recommendations: Recommendation[];
}

/**
 * Matches findings to recommendation templates from the catalog.
 * For each finding, searches for a template whose findingType matches the finding's rule.
 */
function matchRecommendations(findings: Finding[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const finding of findings) {
    const template = (catalog as RecommendationTemplate[]).find(
      (t) => t.findingType === finding.rule,
    );
    if (template) {
      recommendations.push({
        id: template.id,
        findingId: finding.id,
        description: template.description,
        priority: template.priority,
        effort: template.effort,
        example: template.example,
      });
    }
  }

  return recommendations;
}

/**
 * Renders a visual score bar using unicode blocks.
 * Example: 80% → "████████░░"
 */
function renderScoreBar(percentage: number, width = 10): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Generates the Markdown report content.
 */
function generateMarkdown(
  input: ReportInput,
  recommendations: Recommendation[],
  generatedAt: string,
): string {
  const lines: string[] = [];

  // Title
  lines.push('# 🔍 ISO 25010 Quality Audit Report');
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Overall Score**: ${input.score.overall}%`);
  lines.push(`- **Generated At**: ${generatedAt}`);
  lines.push(`- **Request ID**: ${input.requestId}`);
  lines.push(`- **Total Findings**: ${input.findings.length}`);
  lines.push(`- **Recommendations**: ${recommendations.length}`);
  lines.push('');

  // Score Table
  lines.push('## Quality Scores by Characteristic');
  lines.push('');
  lines.push('| Characteristic | Score | Visual |');
  lines.push('|---|---|---|');
  for (const [characteristic, score] of Object.entries(input.score.characteristics)) {
    lines.push(`| ${characteristic} | ${score}% | ${renderScoreBar(score)} |`);
  }
  lines.push('');

  // Findings Section
  lines.push('## Findings');
  lines.push('');
  if (input.findings.length === 0) {
    lines.push('No findings detected. Code meets all quality thresholds.');
  } else {
    // Group by characteristic
    const grouped: Record<string, Finding[]> = {};
    for (const finding of input.findings) {
      if (!grouped[finding.characteristic]) {
        grouped[finding.characteristic] = [];
      }
      grouped[finding.characteristic].push(finding);
    }

    const severityOrder: Record<string, number> = {
      critical: 0,
      major: 1,
      minor: 2,
      info: 3,
    };

    for (const [characteristic, findings] of Object.entries(grouped)) {
      lines.push(`### ${characteristic}`);
      lines.push('');
      const sorted = findings.sort(
        (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4),
      );
      for (const finding of sorted) {
        const lineRef = finding.line ? `:${finding.line}` : '';
        lines.push(
          `- **[${finding.severity.toUpperCase()}]** ${finding.message} — \`${finding.file}${lineRef}\` (rule: \`${finding.rule}\`)`,
        );
      }
      lines.push('');
    }
  }

  // Recommendations Section
  lines.push('## Recommendations');
  lines.push('');
  if (recommendations.length === 0) {
    lines.push('No specific recommendations. Keep up the good work!');
  } else {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const sorted = [...recommendations].sort(
      (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
    );
    for (const rec of sorted) {
      lines.push(`### ${rec.id} (Priority: ${rec.priority}, Effort: ${rec.effort})`);
      lines.push('');
      lines.push(rec.description);
      if (rec.example) {
        lines.push('');
        lines.push('```');
        lines.push(rec.example);
        lines.push('```');
      }
      lines.push('');
    }
  }

  // Maturity Section
  if (input.maturity && input.maturity.length > 0) {
    lines.push('## Maturity Assessment');
    lines.push('');
    const passed = input.maturity.filter((m) => m.passed).length;
    const total = input.maturity.length;
    lines.push(`**Score**: ${passed}/${total} checks passed`);
    lines.push('');
    for (const result of input.maturity) {
      const icon = result.passed ? '✅' : '❌';
      const detail = result.evidence || result.details || '';
      lines.push(`- ${icon} \`${result.checkId}\`${detail ? ` — ${detail}` : ''}`);
    }
    lines.push('');
  }

  // Complexity Summary
  if (input.complexity) {
    lines.push('## Complexity Summary');
    lines.push('');
    lines.push(`- **Average Complexity**: ${input.complexity.aggregate.avg}`);
    lines.push(`- **Max Complexity**: ${input.complexity.aggregate.max}`);
    lines.push(`- **Total**: ${input.complexity.aggregate.total}`);
    lines.push('');
    if (input.complexity.functions.length > 0) {
      lines.push('**Top 5 Most Complex Functions:**');
      lines.push('');
      const top5 = [...input.complexity.functions]
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 5);
      lines.push('| Function | Complexity | LOC |');
      lines.push('|---|---|---|');
      for (const fn of top5) {
        lines.push(`| ${fn.name} | ${fn.complexity} | ${fn.loc} |`);
      }
      lines.push('');
    }
  }

  // Duplication Summary
  if (input.duplication) {
    lines.push('## Duplication Summary');
    lines.push('');
    lines.push(`- **Total Clones**: ${input.duplication.statistics.totalClones}`);
    lines.push(`- **Duplicated Lines**: ${input.duplication.statistics.duplicatedLines}`);
    lines.push(`- **Duplication Percentage**: ${input.duplication.statistics.percentage}%`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates the structured JSON output for the report.
 */
function generateJson(
  input: ReportInput,
  recommendations: Recommendation[],
  reportId: string,
  generatedAt: string,
): object {
  return {
    id: reportId,
    requestId: input.requestId,
    generatedAt,
    score: input.score,
    findings: input.findings,
    recommendations,
    complexity: input.complexity ?? null,
    duplication: input.duplication ?? null,
    maturity: input.maturity ?? null,
  };
}

/**
 * Generates a complete audit report from analysis inputs.
 * Pure function except for crypto.randomUUID() and new Date().
 */
export function generateReport(input: ReportInput): GeneratedReport {
  const id = randomUUID();
  const generatedAt = new Date().toISOString();
  const recommendations = matchRecommendations(input.findings);
  const markdown = generateMarkdown(input, recommendations, generatedAt);
  const json = generateJson(input, recommendations, id, generatedAt);

  return {
    id,
    requestId: input.requestId,
    generatedAt,
    markdown,
    json,
    recommendations,
  };
}
