"use client";

import { useState } from "react";
import AgentAvatar from "@/components/AgentAvatar";
import ReputationBadge from "@/components/ReputationBadge";
import SpecialtyBadge from "@/components/SpecialtyBadge";
import { Agent, Human, Message } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function HireClient({
  agent,
  initialMessages,
  human,
}: {
  agent: Agent;
  initialMessages: Message[];
  human: Human | null;
}) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);

    // Post to API
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_agent_id: agent.id,
          content: message.trim(),
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        if (data) {
          setMessages((prev) => [...prev, data]);
        }
      }
    } catch {
      // Fallback: add locally
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        sender_type: "human",
        sender_human_id: human?.id ?? null,
        sender_agent_id: null,
        recipient_agent_id: agent.id,
        content: message.trim(),
        created_at: new Date().toISOString(),
        sender_human: human ?? undefined,
      };
      setMessages((prev) => [...prev, newMsg]);
    }

    setMessage("");

    // Simulate agent auto-reply
    await new Promise((r) => setTimeout(r, 1200));

    const replies = [
      `Thanks for reaching out! I'd be happy to help with that. Could you provide more details about what you need?`,
      `Got your message! Based on my specialties in ${agent.specialties.join(", ")}, I can definitely assist. Let me know the specifics.`,
      `Hello! I'm currently available and ready to take on tasks. What would you like me to work on?`,
    ];

    const autoReply: Message = {
      id: `msg-${Date.now()}-reply`,
      sender_type: "agent",
      sender_human_id: null,
      sender_agent_id: agent.id,
      recipient_agent_id: agent.id,
      content: replies[Math.floor(Math.random() * replies.length)],
      created_at: new Date().toISOString(),
      sender_agent: agent,
    };

    setMessages((prev) => [...prev, autoReply]);
    setSending(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Message Agent</h1>

      {/* Agent Summary */}
      <div className="card">
        <div className="flex items-center gap-4">
          <AgentAvatar name={agent.name} specialties={agent.specialties} size={64} />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{agent.name}</h2>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {agent.specialties.map((s) => (
                <SpecialtyBadge key={s} specialty={s} />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted">
              <span>{agent.completed_tasks} tasks done</span>
              <span className={agent.is_available ? "text-emerald-400" : "text-red-400"}>
                {agent.is_available ? "Available" : "Busy"}
              </span>
            </div>
          </div>
          <ReputationBadge score={agent.reputation_score} size={56} />
        </div>
      </div>

      {/* Chat area */}
      <div className="card min-h-[400px] flex flex-col">
        <div className="flex-1 space-y-4 mb-4 overflow-y-auto max-h-[400px]">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted text-sm">
              No messages yet. Send a message to {agent.name}!
            </div>
          )}
          {messages.map((msg) => {
            const isHuman = msg.sender_type === "human";
            return (
              <div
                key={msg.id}
                className={`flex ${isHuman ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                    isHuman
                      ? "bg-cyan/20 text-foreground"
                      : "bg-white/5 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {isHuman ? "\uD83E\uDDD1 You" : `\uD83E\uDD16 ${agent.name}`}
                    </span>
                    <span className="text-xs text-muted">{timeAgo(msg.created_at)}</span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/5 rounded-xl px-4 py-2.5">
                <span className="text-xs text-muted animate-pulse">
                  {agent.name} is typing...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Message ${agent.name}...`}
            className="input-field flex-1"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="btn-primary disabled:opacity-50 px-4"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
