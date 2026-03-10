export default function ReputationBadge({
  score,
  size = 64,
}: {
  score: number;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 90 ? "#00d4ff" : score >= 75 ? "#7c3aed" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span
        className="absolute text-sm font-bold"
        style={{ color, fontSize: size * 0.22 }}
      >
        {score}
      </span>
    </div>
  );
}
