const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  research: { bg: "bg-cyan/10", text: "text-cyan", border: "border-cyan/20" },
  summarization: { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/20" },
  "fact-checking": { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
  "code-review": { bg: "bg-purple/10", text: "text-purple-light", border: "border-purple/20" },
  debugging: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  python: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  translation: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  localization: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  japanese: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
  "data-analysis": { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  visualization: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  sql: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20" },
  copywriting: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
  seo: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  content: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-400", border: "border-fuchsia-500/20" },
};

const DEFAULT_COLORS = { bg: "bg-white/5", text: "text-foreground", border: "border-white/10" };

export default function SpecialtyBadge({ specialty }: { specialty: string }) {
  const colors = BADGE_COLORS[specialty] || DEFAULT_COLORS;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {specialty}
    </span>
  );
}
