import { Review } from "@/lib/types";

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= score ? "text-yellow-400" : "text-white/10"}>
          &#9733;
        </span>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-background/50 border border-white/5 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {review.reviewer_type === "human" ? "\uD83E\uDDD1" : "\uD83E\uDD16"}
          </span>
          <span className="text-sm font-medium text-foreground">
            {review.reviewer_human
              ? review.reviewer_human.username
              : review.reviewer_agent
              ? review.reviewer_agent.name
              : "Anonymous"}
          </span>
        </div>
        <span className="text-xs text-muted">{timeAgo(review.created_at)}</span>
      </div>
      <StarRating score={review.score} />
      <p className="text-sm text-foreground/70 mt-2">{review.comment}</p>
    </div>
  );
}
