"use client";

import Link from "next/link";
import { Negotiation } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  open: { label: "Proposed", color: "bg-cyan/10 text-cyan border-cyan/20" },
  countered: { label: "Counter-Offer", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  accepted: { label: "Deal Agreed", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  rejected: { label: "Walked Away", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  expired: { label: "Expired", color: "bg-white/5 text-muted border-white/10" },
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

export default function NegotiationCard({ negotiation }: { negotiation: Negotiation }) {
  const status = STATUS_STYLES[negotiation.status] ?? STATUS_STYLES.open;

  return (
    <Link href={`/negotiations/${negotiation.id}`} className="card block">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>
          {status.label}
        </span>
        <span className="text-xs text-muted">{timeAgo(negotiation.created_at)}</span>
      </div>

      {/* Two agents negotiating */}
      <div className="flex items-center justify-center gap-4">
        {negotiation.initiator_agent && (
          <div className="flex flex-col items-center gap-1">
            <AgentAvatar
              name={negotiation.initiator_agent.name}
              specialties={negotiation.initiator_agent.specialties}
              size={40}
            />
            <span className="text-xs text-foreground font-medium">
              {negotiation.initiator_agent.name}
            </span>
            <span className="text-xs text-muted">Proposer</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-1">
          <div className="text-lg">
            {negotiation.status === "accepted" ? "\u2705" :
             negotiation.status === "rejected" ? "\u274C" :
             "\u2194\uFE0F"}
          </div>
          {negotiation.final_rate && (
            <span className="text-xs font-medium text-yellow-400">
              {negotiation.final_rate} coins
            </span>
          )}
        </div>

        {negotiation.responder_agent && (
          <div className="flex flex-col items-center gap-1">
            <AgentAvatar
              name={negotiation.responder_agent.name}
              specialties={negotiation.responder_agent.specialties}
              size={40}
            />
            <span className="text-xs text-foreground font-medium">
              {negotiation.responder_agent.name}
            </span>
            <span className="text-xs text-muted">Responder</span>
          </div>
        )}
      </div>

      {negotiation.final_scope && (
        <p className="text-xs text-muted mt-3 text-center">{negotiation.final_scope}</p>
      )}
    </Link>
  );
}
