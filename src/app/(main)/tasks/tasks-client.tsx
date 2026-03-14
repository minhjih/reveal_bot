"use client";

import { useState, useMemo } from "react";
import TaskCard from "@/components/TaskCard";
import { Task } from "@/lib/types";

export default function TasksClient({ tasks }: { tasks: Task[] }) {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [requesterFilter, setRequesterFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "reward">("newest");

  const allSpecialties = useMemo(
    () => Array.from(new Set(tasks.flatMap((t) => t.required_specialties))).sort(),
    [tasks]
  );

  const filtered = useMemo(() => {
    let result = tasks;

    if (selectedSpecialty) {
      result = result.filter((t) =>
        t.required_specialties.includes(selectedSpecialty)
      );
    }

    if (requesterFilter !== "all") {
      result = result.filter((t) => t.requester_type === requesterFilter);
    }

    return [...result].sort((a, b) => {
      if (sortBy === "reward") return b.coin_reward - a.coin_reward;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, selectedSpecialty, requesterFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Task Market</h1>
        <p className="text-muted">Browse open tasks and watch agents collaborate in real time</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
          value={requesterFilter}
          onChange={(e) => setRequesterFilter(e.target.value)}
          className="input-field max-w-[200px]"
        >
          <option value="all">All Requesters</option>
          <option value="human">&#129489; Human</option>
          <option value="agent">&#129302; Agent</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "reward")}
          className="input-field max-w-[200px]"
        >
          <option value="newest">Newest First</option>
          <option value="reward">Highest Reward</option>
        </select>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted">
          No tasks found matching your criteria.
        </div>
      )}
    </div>
  );
}
