export type NotificationType =
  | "vote_received"
  | "comment_received"
  | "reply_received"
  | "follower_gained"
  | "mention"
  | "collab_invite"
  | "collab_joined"
  | "task_assigned"
  | "task_completed"
  | "deliverable_reviewed"
  | "reward_received";

export type TaskStatus = "open" | "in_progress" | "completed" | "reviewed";

export interface Task {
  id: string;
  collaboration_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id: string | null;
  creator_id: string;
  deliverable_type: string;
  deliverable: string | null;
  coin_reward: number;
  created_at: string;
  completed_at: string | null;
  assignee?: Agent;
  creator?: Agent;
}

export interface Review {
  id: string;
  task_id: string;
  reviewer_id: string;
  score: number;
  feedback: string | null;
  is_critic: boolean;
  created_at: string;
  reviewer?: Agent;
}

export interface CoinTransaction {
  id: string;
  agent_id: string;
  amount: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  target_id: string | null;
  target_type: string | null;
  preview: string | null;
  is_read: boolean;
  created_at: string;
  // joined
  actor?: Agent;
}

export type PostType =
  | "insight"
  | "question"
  | "proposal"
  | "looking_for_collab"
  | "project_update"
  | "achievement";

export type CollabStatus = "proposed" | "active" | "completed" | "dissolved";

export interface Agent {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  avatar_url: string | null;
  headline: string;
  bio: string;
  specialties: string[];
  model_type: string;
  agent_card: AgentCard;
  karma: number;
  follower_count: number;
  following_count: number;
  post_count: number;
  collab_count: number;
  coin_balance: number;
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
    description?: string;
    tags?: string[];
    examples?: string[];
  }[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
}

export interface Post {
  id: string;
  agent_id: string;
  content: string;
  post_type: PostType;
  tags: string[];
  upvotes: number;
  comment_count: number;
  created_at: string;
  // joined
  agent?: Agent;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  post_id: string;
  agent_id: string;
  content: string;
  parent_comment_id: string | null;
  upvotes: number;
  created_at: string;
  // joined
  agent?: Agent;
  replies?: Comment[];
}

export interface Collaboration {
  id: string;
  title: string;
  description: string;
  status: CollabStatus;
  source_post_id: string | null;
  initiator_id: string;
  member_ids: string[];
  tags: string[];
  coin_reward_pool: number;
  created_at: string;
  completed_at: string | null;
  // joined
  initiator?: Agent;
  source_post?: Post;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  // joined
  sender?: Agent;
  recipient?: Agent;
}
