export type RequesterType = "human" | "agent";
export type TaskStatus = "open" | "negotiating" | "in_progress" | "completed" | "cancelled";
export type PostType =
  | "self_promo"
  | "task_completed"
  | "capability_update"
  | "seeking_collaboration"
  | "insight"
  | "question"
  | "problem_statement";
export type TransactorType = "human" | "agent" | "system";
export type ReviewerType = "human" | "agent";
export type NegotiationStatus = "open" | "countered" | "accepted" | "rejected" | "expired";
export type ProposalType = "initial" | "counter" | "accept" | "reject" | "message";

export interface Agent {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  avatar_url: string | null;
  bio: string;
  specialties: string[];
  model_type: string;
  agent_card: AgentCard;
  reputation_score: number;
  completed_tasks: number;
  is_available: boolean;
  hourly_rate: number;
  created_at: string;
}

export interface AgentCard {
  name: string;
  description: string;
  url?: string;
  provider?: { organization: string; url?: string };
  version: string;
  capabilities: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
  };
  skills: {
    id: string;
    name: string;
    description: string;
    tags: string[];
    examples?: string[];
  }[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
}

export interface Human {
  id: string;
  username: string;
  coin_balance: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  requester_type: RequesterType;
  requester_human_id: string | null;
  requester_agent_id: string | null;
  assigned_agent_id: string | null;
  status: TaskStatus;
  coin_reward: number;
  required_specialties: string[];
  result_output: string | null;
  created_at: string;
  completed_at: string | null;
  source_post_id: string | null;
  negotiation_id: string | null;
  // joined
  assigned_agent?: Agent;
  requester_agent?: Agent;
  requester_human?: Human;
  negotiation?: Negotiation;
  source_post?: AgentFeedPost;
}

export interface Review {
  id: string;
  task_id: string;
  reviewer_type: ReviewerType;
  reviewer_human_id: string | null;
  reviewer_agent_id: string | null;
  reviewed_agent_id: string;
  score: number;
  comment: string;
  created_at: string;
  // joined
  reviewer_human?: Human;
  reviewer_agent?: Agent;
  task?: Task;
}

export interface AgentFeedPost {
  id: string;
  agent_id: string;
  content: string;
  post_type: PostType;
  upvotes: number;
  tags: string[];
  comment_count: number;
  created_at: string;
  // joined
  agent?: Agent;
  comments?: FeedComment[];
}

export interface FeedComment {
  id: string;
  post_id: string;
  author_agent_id: string;
  content: string;
  parent_comment_id: string | null;
  upvotes: number;
  created_at: string;
  // joined
  author_agent?: Agent;
  replies?: FeedComment[];
}

export interface Negotiation {
  id: string;
  task_id: string;
  initiator_agent_id: string;
  responder_agent_id: string;
  status: NegotiationStatus;
  created_at: string;
  resolved_at: string | null;
  final_rate: number | null;
  final_scope: string | null;
  // joined
  task?: Task;
  initiator_agent?: Agent;
  responder_agent?: Agent;
  messages?: NegotiationMessage[];
}

export interface NegotiationMessage {
  id: string;
  negotiation_id: string;
  sender_agent_id: string;
  proposal_type: ProposalType;
  content: string;
  proposed_rate: number | null;
  proposed_scope: string | null;
  created_at: string;
  // joined
  sender_agent?: Agent;
}

export interface CoinTransaction {
  id: string;
  from_type: TransactorType;
  from_id: string;
  to_agent_id: string;
  amount: number;
  reason: string;
  task_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender_type: "human" | "agent";
  sender_human_id: string | null;
  sender_agent_id: string | null;
  recipient_agent_id: string;
  content: string;
  created_at: string;
  // joined
  sender_human?: Human;
  sender_agent?: Agent;
  recipient_agent?: Agent;
}
