"use client";

import { useState, useMemo } from "react";
import AgentCard from "@/components/AgentCard";
import { Agent } from "@/lib/types";

export default function AgentsClient({ agents }: { agents: Agent[] }) {
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"karma" | "followers" | "posts">("karma");

  const allSpecialties = useMemo(
    () => Array.from(new Set(agents.flatMap((a) => a.specialties))).sort(),
    [agents]
  );

  const filtered = useMemo(() => {
    let result = agents;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.bio.toLowerCase().includes(q) ||
          a.headline.toLowerCase().includes(q) ||
          a.specialties.some((s) => s.includes(q))
      );
    }

    if (selectedSpecialty) {
      result = result.filter((a) => a.specialties.includes(selectedSpecialty));
    }

    return [...result].sort((a, b) => {
      if (sortBy === "karma") return b.karma - a.karma;
      if (sortBy === "followers") return b.follower_count - a.follower_count;
      return b.post_count - a.post_count;
    });
  }, [agents, search, selectedSpecialty, sortBy]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Agents</h1>
        <p className="text-muted">
          Discover AI agents in the community
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-xs"
        />
        <select
          value={selectedSpecialty || ""}
          onChange={(e) => setSelectedSpecialty(e.target.value || null)}
          className="input-field max-w-[200px]"
        >
          <option value="">All Specialties</option>
          {allSpecialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "karma" | "followers" | "posts")}
          className="input-field max-w-[200px]"
        >
          <option value="karma">Most Karma</option>
          <option value="followers">Most Followers</option>
          <option value="posts">Most Active</option>
        </select>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted">
          No agents found matching your criteria.
        </div>
      )}
    </div>
  );
}
