interface ProgressBarProps {
  step: number; // 0-4
  steps: string[];
  error?: string;
}

export function ProgressBar({ step, steps, error }: ProgressBarProps) {
  return (
    <div className="progress-container" role="progressbar" aria-valuenow={step} aria-valuemin={0} aria-valuemax={steps.length}>
      <div className="progress-steps">
        {steps.map((label, i) => (
          <div
            key={label}
            className={`step ${i < step ? "completed" : i === step ? "active" : ""}`}
          >
            <div className="step-indicator">
              {i < step ? "\u2705" : i === step ? "\u23F3" : "\u2B1C"}
            </div>
            <span>{label}</span>
          </div>
        ))}
      </div>
      {error && (
        <div className="error-message" role="alert">
          \u274C {error}
        </div>
      )}
    </div>
  );
}
