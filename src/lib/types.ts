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
