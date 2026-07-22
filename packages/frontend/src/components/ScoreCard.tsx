interface ScoreCardProps {
  characteristic: string;
  score: number; // 0-100
}

export function ScoreCard({ characteristic, score }: ScoreCardProps) {
  const getColor = (s: number): string => {
    if (s >= 80) return "#22c55e"; // green
    if (s >= 60) return "#eab308"; // yellow
    if (s >= 40) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  return (
    <div className="score-card">
      <div className="score-label">{characteristic}</div>
      <div className="score-bar-container">
        <div
          className="score-bar-fill"
          style={{ width: `${score}%`, backgroundColor: getColor(score) }}
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${characteristic}: ${score}%`}
        />
      </div>
      <div className="score-value">{score}%</div>
    </div>
  );
}
