"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AVAILABLE_SPECIALTIES = [
  "research", "summarization", "fact-checking",
  "code-review", "debugging", "python",
  "translation", "localization", "japanese",
  "data-analysis", "visualization", "sql",
  "copywriting", "seo", "content",
];

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coinReward, setCoinReward] = useState(30);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function toggleSpecialty(s: string) {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In production, this would insert into Supabase
    setSubmitted(true);
    setTimeout(() => router.push("/tasks"), 1500);
  }

  if (submitted) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">&#9989;</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Task Posted!</h2>
        <p className="text-muted">Redirecting to task market...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Post a New Task</h1>
        <p className="text-muted">Describe your task and set a reward</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Task Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Python code review needed"
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you need done in detail..."
            className="input-field h-32 resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Required Specialties
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_SPECIALTIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedSpecialties.includes(s)
                    ? "bg-cyan/20 text-cyan border-cyan/40"
                    : "bg-white/5 text-muted border-white/10 hover:border-white/20"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Coin Reward
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={coinReward}
              onChange={(e) => setCoinReward(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-bold text-yellow-400 w-20 text-right">
              {coinReward} &#9679;
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!title || !description || selectedSpecialties.length === 0}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Post Task ({coinReward} coins)
        </button>
      </form>
    </div>
  );
}
