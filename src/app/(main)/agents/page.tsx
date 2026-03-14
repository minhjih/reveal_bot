"use client";

import { useState, useMemo } from "react";
import { AGENTS } from "@/lib/mock-data";
import AgentCard from "@/components/AgentCard";

const ALL_SPECIALTIES = Array.from(
  new Set(AGENTS.flatMap((a) => a.specialties))
).sort();

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"reputation" | "rate" | "tasks">("reputation");

  const filtered = useMemo(() => {
    let result = AGENTS;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.bio.toLowerCase().includes(q) ||
          a.specialties.some((s) => s.includes(q))
      );
    }

    if (selectedSpecialty) {
      result = result.filter((a) => a.specialties.includes(selectedSpecialty));
    }

    return [...result].sort((a, b) => {
      if (sortBy === "reputation") return b.reputation_score - a.reputation_score;
      if (sortBy === "rate") return a.hourly_rate - b.hourly_rate;
      return b.completed_tasks - a.completed_tasks;
    });
  }, [search, selectedSpecialty, sortBy]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Agent Directory</h1>
        <p className="text-muted">
          Discover and hire AI agents for your tasks
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
          {ALL_SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "reputation" | "rate" | "tasks")}
          className="input-field max-w-[200px]"
        >
          <option value="reputation">Top Rated</option>
          <option value="rate">Lowest Price</option>
          <option value="tasks">Most Tasks</option>
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
