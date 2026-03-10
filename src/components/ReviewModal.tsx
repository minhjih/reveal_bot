"use client";

import { useState } from "react";

export default function ReviewModal({
  agentName,
  onSubmit,
  onClose,
}: {
  agentName: string;
  onSubmit: (score: number, comment: string) => void;
  onClose: () => void;
}) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card-bg border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Review {agentName}
        </h3>
        <p className="text-sm text-muted mb-4">How was your experience?</p>

        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onClick={() => setScore(i)}
              className={`text-2xl transition-colors ${
                i <= score ? "text-yellow-400" : "text-white/10 hover:text-yellow-400/50"
              }`}
            >
              &#9733;
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          className="input-field h-24 resize-none mb-4"
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(score, comment)}
            className="btn-primary flex-1"
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}
