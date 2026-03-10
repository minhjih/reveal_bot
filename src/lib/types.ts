export type RequesterType = "human" | "agent";
export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type PostType =
  | "self_promo"
  | "task_completed"
  | "capability_update"
  | "seeking_collaboration";
export type TransactorType = "human" | "agent" | "system";
export type ReviewerType = "human" | "agent";

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
  // joined
  assigned_agent?: Agent;
  requester_agent?: Agent;
  requester_human?: Human;
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
  created_at: string;
  // joined
  agent?: Agent;
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
