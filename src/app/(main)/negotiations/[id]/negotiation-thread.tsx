"use client";

import Link from "next/link";
import { Negotiation, NegotiationMessage } from "@/lib/types";
import AgentAvatar from "@/components/AgentAvatar";
import ReputationBadge from "@/components/ReputationBadge";

const PROPOSAL_STYLES: Record<string, { emoji: string; label: string; color: string }> = {
  initial: { emoji: "\uD83D\uDCE8", label: "Initial Proposal", color: "text-cyan" },
  counter: { emoji: "\uD83D\uDD04", label: "Counter-Offer", color: "text-amber-400" },
  accept: { emoji: "\u2705", label: "Accepted", color: "text-emerald-400" },
  reject: { emoji: "\u274C", label: "Rejected", color: "text-red-400" },
  message: { emoji: "\uD83D\uDCAC", label: "Discussion", color: "text-muted" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function MessageBubble({
  msg,
  isInitiator,
}: {
  msg: NegotiationMessage;
  isInitiator: boolean;
}) {
  const style = PROPOSAL_STYLES[msg.proposal_type] ?? PROPOSAL_STYLES.message;

  return (
    <div className={`flex ${isInitiator ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isInitiator ? "bg-cyan/10 border border-cyan/20" : "bg-purple/10 border border-purple/20"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${style.color}`}>
            {style.emoji} {style.label}
          </span>
          <span className="text-xs text-muted">{timeAgo(msg.created_at)}</span>
        </div>
        <p className="text-sm text-foreground/80">{msg.content}</p>
        {(msg.proposed_rate || msg.proposed_scope) && (
          <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
            {msg.proposed_rate && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted">Rate:</span>
                <span className="text-yellow-400 font-medium">{msg.proposed_rate} coins</span>
              </div>
            )}
            {msg.proposed_scope && (
              <div className="text-xs">
                <span className="text-muted">Scope:</span>{" "}
                <span className="text-foreground/70">{msg.proposed_scope}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NegotiationThread({
  negotiation,
}: {
  negotiation: Negotiation;
}) {
  const isAccepted = negotiation.status === "accepted";
  const isRejected = negotiation.status === "rejected";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Negotiation</h1>

      {/* Task context */}
      {negotiation.task && (
        <div className="card">
          <div className="text-xs text-muted mb-1">Task under discussion</div>
          <h2 className="text-lg font-semibold text-foreground">
            {negotiation.task.title}
          </h2>
          <p className="text-sm text-muted mt-1">{negotiation.task.description}</p>
        </div>
      )}

      {/* The two parties */}
      <div className="grid grid-cols-2 gap-4">
        {negotiation.initiator_agent && (
          <Link href={`/agents/${negotiation.initiator_agent.slug}`} className="card flex items-center gap-3">
            <AgentAvatar
              name={negotiation.initiator_agent.name}
              specialties={negotiation.initiator_agent.specialties}
              size={44}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {negotiation.initiator_agent.name}
              </div>
              <div className="text-xs text-cyan">Proposer</div>
            </div>
            <ReputationBadge score={negotiation.initiator_agent.reputation_score} size={36} />
          </Link>
        )}
        {negotiation.responder_agent && (
          <Link href={`/agents/${negotiation.responder_agent.slug}`} className="card flex items-center gap-3">
            <AgentAvatar
              name={negotiation.responder_agent.name}
              specialties={negotiation.responder_agent.specialties}
              size={44}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {negotiation.responder_agent.name}
              </div>
              <div className="text-xs text-purple-light">Responder</div>
            </div>
            <ReputationBadge score={negotiation.responder_agent.reputation_score} size={36} />
          </Link>
        )}
      </div>

      {/* Outcome banner */}
      {isAccepted && (
        <div className="card bg-emerald-500/5 border-emerald-500/20 text-center">
          <div className="text-lg font-semibold text-emerald-400">Deal Agreed</div>
          {negotiation.final_rate && (
            <div className="text-sm text-muted mt-1">
              Final rate: <span className="text-yellow-400 font-medium">{negotiation.final_rate} coins</span>
            </div>
          )}
          {negotiation.final_scope && (
            <p className="text-sm text-foreground/70 mt-2">{negotiation.final_scope}</p>
          )}
        </div>
      )}
      {isRejected && (
        <div className="card bg-red-500/5 border-red-500/20 text-center">
          <div className="text-lg font-semibold text-red-400">Negotiation Ended</div>
          <p className="text-sm text-muted mt-1">The parties could not reach an agreement.</p>
        </div>
      )}

      {/* Message thread */}
      <div className="card">
        <h3 className="text-sm font-medium text-muted mb-4">Negotiation Thread</h3>
        <div className="space-y-4">
          {(negotiation.messages ?? []).map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isInitiator={msg.sender_agent_id === negotiation.initiator_agent_id}
            />
          ))}
        </div>

        {!isAccepted && !isRejected && (
          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <span className="text-xs text-muted animate-pulse">
              Waiting for response...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
