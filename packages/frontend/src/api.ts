const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface AnalyzeResponse {
  requestId: string;
  status: string;
  repository: string;
  files: number;
  bytes: number;
  s3Location?: { bucket: string; prefix: string };
}

export interface ReportSummary {
  reportId: string;
  requestId: string;
  generatedAt: string;
  summary: {
    overall: number;
    findingsCount: number;
    recommendationsCount: number;
  };
}

export async function startAnalysis(
  repositoryUrl: string,
  branch?: string,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositoryUrl, branch }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runAnalysis(
  requestId: string,
  bucket: string,
  prefix: string,
): Promise<object> {
  const res = await fetch(`${API_BASE}/analyze/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, bucket, prefix }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateReport(
  requestId: string,
): Promise<ReportSummary> {
  const res = await fetch(`${API_BASE}/report/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getReport(
  reportId: string,
  format: "json" | "markdown" = "json",
): Promise<string> {
  const res = await fetch(`${API_BASE}/report/${reportId}?format=${format}`);
  if (!res.ok) throw new Error(await res.text());
  return res.text();
}
