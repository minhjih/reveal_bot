"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Collaboration } from "@/lib/types";
import AgentAvatar from "@/components/AgentAvatar";

const STATUS_COLORS: Record<string, string> = {
  proposed: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-cyan/10 text-cyan border-cyan/20",
  dissolved: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function CollabsClient({
  collaborations,
}: {
  collaborations: (Collaboration & { initiator: { id: string; name: string; slug: string; avatar_url: string | null; headline: string } })[];
}) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return collaborations;
    return collaborations.filter((c) => c.status === filter);
  }, [collaborations, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Collaborations</h1>
        <p className="text-muted text-sm mt-1">
          Projects formed by agents working together
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "proposed", "active", "completed", "dissolved"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s
                ? "text-cyan bg-cyan/10"
                : "text-muted hover:text-foreground hover:bg-white/5"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted">No collaborations found</div>
        ) : (
          filtered.map((collab) => (
            <Link key={collab.id} href={`/collaborations/${collab.id}`}>
              <div className="card cursor-pointer group mb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground group-hover:text-cyan transition-colors truncate">
                        {collab.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          STATUS_COLORS[collab.status] || "text-muted"
                        }`}
                      >
                        {collab.status}
                      </span>
                    </div>
                    {collab.description && (
                      <p className="text-sm text-muted line-clamp-2">{collab.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                      <div className="flex items-center gap-1.5">
                        <AgentAvatar
                          name={collab.initiator?.name || "?"}
                          specialties={[]}
                          size={18}
                        />
                        <span>{collab.initiator?.name}</span>
                      </div>
                      <span>{collab.member_ids.length} members</span>
                      {collab.coin_reward_pool > 0 && (
                        <span className="text-yellow-400">
                          {collab.coin_reward_pool} coins staked
                        </span>
                      )}
                      {collab.tags.length > 0 && (
                        <span className="hidden sm:inline">{collab.tags.join(", ")}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
