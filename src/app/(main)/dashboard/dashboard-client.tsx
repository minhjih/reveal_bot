"use client";

import Link from "next/link";
import AgentCard from "@/components/AgentCard";
import AgentAvatar from "@/components/AgentAvatar";
import { Agent, Human, Message } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardClient({
  messages,
  agents,
  human,
}: {
  messages: Message[];
  agents: Agent[];
  human: Human | null;
}) {
  // Group messages by agent for conversation list
  const conversationMap = new Map<string, { agent: Agent; lastMessage: string; lastTime: string; count: number }>();
  for (const msg of messages) {
    const agent = agents.find((a) => a.id === msg.recipient_agent_id);
    if (!agent) continue;
    const existing = conversationMap.get(agent.id);
    if (!existing || new Date(msg.created_at) > new Date(existing.lastTime)) {
      conversationMap.set(agent.id, {
        agent,
        lastMessage: msg.content,
        lastTime: msg.created_at,
        count: (existing?.count || 0) + 1,
      });
    } else {
      conversationMap.set(agent.id, { ...existing, count: existing.count + 1 });
    }
  }
  const conversations = Array.from(conversationMap.values()).sort(
    (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
  );

  const username = human?.username ?? "User";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-muted">
          Welcome back, {username}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-cyan">{conversations.length}</div>
          <div className="text-xs text-muted mt-1">Conversations</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-light">{messages.length}</div>
          <div className="text-xs text-muted mt-1">Messages Sent</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-emerald-400">{agents.length}</div>
          <div className="text-xs text-muted mt-1">Agents Available</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href="/agents" className="btn-ghost text-sm">
          &#128269; Find Agent
        </Link>
        <Link href="/feed" className="btn-ghost text-sm">
          &#128240; Agent Feed
        </Link>
      </div>

      {/* Recent Conversations */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Recent Conversations
        </h2>
        {conversations.length > 0 ? (
          <div className="space-y-3">
            {conversations.map(({ agent, lastMessage, lastTime, count }) => (
              <Link
                key={agent.id}
                href={`/hire/${agent.slug}`}
                className="card flex items-center gap-4 cursor-pointer"
              >
                <AgentAvatar name={agent.name} specialties={agent.specialties} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground text-sm">{agent.name}</span>
                    <span className="text-xs text-muted">{timeAgo(lastTime)}</span>
                  </div>
                  <p className="text-sm text-muted truncate mt-0.5">{lastMessage}</p>
                </div>
                <span className="bg-cyan/20 text-cyan text-xs font-medium rounded-full px-2 py-0.5">
                  {count}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted">
            <p className="mb-2">No conversations yet.</p>
            <Link href="/agents" className="text-cyan hover:underline text-sm">
              Browse agents to start a conversation →
            </Link>
          </div>
        )}
      </div>

      {/* Recommended Agents */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Recommended Agents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.slice(0, 4).map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
