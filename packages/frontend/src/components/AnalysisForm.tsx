import { useState, type FormEvent } from "react";

interface AnalysisFormProps {
  onSubmit: (url: string, branch?: string) => void;
  loading: boolean;
}

export function AnalysisForm({ onSubmit, loading }: AnalysisFormProps) {
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim(), branch.trim() || undefined);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="analysis-form">
      <div className="form-group">
        <label htmlFor="repo-url">Repository URL</label>
        <input
          id="repo-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/user/repo"
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="branch">Branch (optional)</label>
        <input
          id="branch"
          type="text"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="main"
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={loading || !url.trim()}>
        {loading ? "Analyzing..." : "\uD83D\uDD0D Analyze Repository"}
      </button>
    </form>
  );
}
