import { useState } from "react";
import { AnalysisForm } from "./components/AnalysisForm";
import { ProgressBar } from "./components/ProgressBar";
import { ReportView, type ReportData } from "./components/ReportView";
import { startAnalysis, runAnalysis, generateReport, getReport } from "./api";
import "./App.css";

const STEPS = ["Cloning", "Analyzing", "Generating Report", "Done"];

function App() {
  const [step, setStep] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const handleAnalyze = async (url: string, branch?: string) => {
    setLoading(true);
    setError(undefined);
    setReportData(null);

    try {
      // Step 1: Clone & Upload
      setStep(0);
      const ingestResult = await startAnalysis(url, branch);

      // Step 2: Run Analysis
      setStep(1);
      await runAnalysis(
        ingestResult.requestId,
        ingestResult.s3Location?.bucket || "auditor-code-temp",
        ingestResult.s3Location?.prefix ||
          `repos/${ingestResult.requestId}/`,
      );

      // Step 3: Generate Report
      setStep(2);
      const reportSummary = await generateReport(ingestResult.requestId);

      // Step 4: Fetch full report
      const reportJson = await getReport(reportSummary.reportId);
      setReportData(JSON.parse(reportJson) as ReportData);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>{"\uD83D\uDD0D"} ISO 25010 Quality Auditor</h1>
        <p>
          Audit your code against ISO/IEC 25010, OWASP Top 10, and maturity best
          practices
        </p>
      </header>

      <main>
        <AnalysisForm onSubmit={handleAnalyze} loading={loading} />

        {step >= 0 && (
          <ProgressBar step={step} steps={STEPS} error={error} />
        )}

        {reportData && <ReportView data={reportData} />}
      </main>

      <footer className="app-footer">
        <p>Built for AWS + Kiro Hackathon 2026</p>
      </footer>
    </div>
  );
}

export default App;
