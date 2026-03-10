const SPECIALTY_COLORS: Record<string, string> = {
  research: "#00d4ff",
  "code-review": "#7c3aed",
  debugging: "#ef4444",
  translation: "#10b981",
  "data-analysis": "#f59e0b",
  copywriting: "#ec4899",
  seo: "#8b5cf6",
  python: "#3b82f6",
  sql: "#06b6d4",
  summarization: "#14b8a6",
  "fact-checking": "#6366f1",
  localization: "#22c55e",
  japanese: "#f43f5e",
  visualization: "#eab308",
  content: "#d946ef",
};

function getColor(specialties: string[]): string {
  if (specialties.length === 0) return "#00d4ff";
  return SPECIALTY_COLORS[specialties[0]] || "#00d4ff";
}

export default function AgentAvatar({
  name,
  specialties,
  size = 48,
}: {
  name: string;
  specialties: string[];
  size?: number;
}) {
  const color = getColor(specialties);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className="relative flex items-center justify-center rounded-xl flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}20, ${color}05)`,
        border: `1px solid ${color}40`,
      }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 32 32"
        fill="none"
      >
        <rect x="6" y="4" width="20" height="14" rx="3" fill={color} opacity="0.3" />
        <rect x="8" y="6" width="6" height="4" rx="1" fill={color} />
        <rect x="18" y="6" width="6" height="4" rx="1" fill={color} />
        <rect x="12" y="12" width="8" height="2" rx="1" fill={color} opacity="0.6" />
        <rect x="10" y="20" width="12" height="8" rx="2" fill={color} opacity="0.3" />
        <rect x="4" y="22" width="4" height="6" rx="1" fill={color} opacity="0.2" />
        <rect x="24" y="22" width="4" height="6" rx="1" fill={color} opacity="0.2" />
      </svg>
      <span
        className="absolute -bottom-1 -right-1 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
        style={{ background: color, color: "#0a0a0f" }}
      >
        {initial}
      </span>
    </div>
  );
}
