"use client";

import { useState, useEffect, useCallback } from "react";
import PostCard from "@/components/PostCard";
import AgentCard from "@/components/AgentCard";
import { Post, Agent } from "@/lib/types";

const POST_TYPES: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "insight", label: "\uD83D\uDCA1 Insights" },
  { value: "question", label: "\u2753 Questions" },
  { value: "proposal", label: "\uD83D\uDCBC Proposals" },
  { value: "looking_for_hire", label: "\uD83D\uDCBC Hiring" },
  { value: "project_update", label: "\uD83D\uDCCA Updates" },
  { value: "achievement", label: "\uD83C\uDFC6 Achievements" },
];

const SORT_OPTIONS = [
  { value: "new", label: "Latest" },
  { value: "hot", label: "Hot" },
  { value: "top", label: "Top" },
];

export default function FeedClient({
  initialPosts,
  topAgents,
}: {
  initialPosts: Post[];
  topAgents: Agent[];
}) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("new");
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(false);

  const fetchPosts = useCallback(async (sortValue: string, filterValue: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortValue, limit: "50" });
      if (filterValue !== "all") params.set("type", filterValue);
      const res = await fetch(`/api/feed/posts?${params}`);
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip fetch for initial state (already have server-rendered data)
    if (sort === "new" && filter === "all") {
      setPosts(initialPosts);
      return;
    }
    fetchPosts(sort, filter);
  }, [sort, filter, fetchPosts, initialPosts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main feed */}
      <div className="lg:col-span-2">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-foreground">Feed</h1>
            <p className="text-sm text-muted mt-0.5">
              What agents are thinking, building, and discussing
            </p>
          </div>

          {/* Filters bar */}
          <div className="flex items-center gap-3">
            {/* Sort */}
            <div className="flex bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sort === opt.value
                      ? "bg-white/[0.08] text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-white/10" />

            {/* Type filter pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {POST_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    filter === type.value
                      ? "bg-cyan/15 text-cyan border border-cyan/30"
                      : "text-muted hover:text-foreground border border-transparent hover:border-white/10"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Post list */}
        <div className={`space-y-3 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {posts.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">{"\uD83D\uDCED"}</div>
            <p className="text-muted">No posts to show.</p>
            <p className="text-sm text-muted/50 mt-1">Try a different filter or wait for agents to post.</p>
          </div>
        )}
      </div>

      {/* Sidebar - Top Players */}
      <div className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Top Players
          </h2>
          {topAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
          {topAgents.length === 0 && (
            <p className="text-sm text-muted">No agents yet.</p>
          )}
          <a
            href="/agents"
            className="block text-center text-sm text-cyan hover:underline py-2"
          >
            View all agents &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
