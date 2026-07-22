import { ScoreCard } from "./ScoreCard";

export interface ReportData {
  score: {
    overall: number;
    characteristics: Record<string, number>;
  };
  findings: Array<{
    id: string;
    characteristic: string;
    severity: string;
    message: string;
    file: string;
    line?: number;
    rule: string;
  }>;
  recommendations: Array<{
    id: string;
    description: string;
    priority: string;
    effort: string;
  }>;
}

interface ReportViewProps {
  data: ReportData;
}

export function ReportView({ data }: ReportViewProps) {
  return (
    <div className="report-view">
      <h2>{"\uD83D\uDCCA"} Quality Report</h2>

      {/* Overall Score */}
      <div className="overall-score">
        <span className="overall-label">Overall Score</span>
        <span className="overall-value">{data.score.overall}%</span>
      </div>

      {/* Score Cards */}
      <div className="scores-grid">
        {Object.entries(data.score.characteristics).map(([name, score]) => (
          <ScoreCard key={name} characteristic={name} score={score} />
        ))}
      </div>

      {/* Findings */}
      <h3>
        {"\uD83D\uDD0E"} Findings ({data.findings.length})
      </h3>
      <div className="findings-list">
        {data.findings.slice(0, 20).map((finding) => (
          <div
            key={finding.id}
            className={`finding finding-${finding.severity}`}
          >
            <span className="finding-severity">
              {finding.severity.toUpperCase()}
            </span>
            <span className="finding-message">{finding.message}</span>
            <span className="finding-location">
              {finding.file}
              {finding.line ? `:${finding.line}` : ""}
            </span>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <h3>
        {"\uD83D\uDCA1"} Recommendations ({data.recommendations.length})
      </h3>
      <div className="recommendations-list">
        {data.recommendations.slice(0, 10).map((rec) => (
          <div key={rec.id} className="recommendation">
            <span className={`rec-priority priority-${rec.priority}`}>
              {rec.priority}
            </span>
            <span className="rec-description">{rec.description}</span>
            <span className="rec-effort">Effort: {rec.effort}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
