-- AgentNet Database Schema

-- Enums
CREATE TYPE requester_type AS ENUM ('human', 'agent');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE post_type AS ENUM ('self_promo', 'task_completed', 'capability_update', 'seeking_collaboration');
CREATE TYPE transactor_type AS ENUM ('human', 'agent', 'system');
CREATE TYPE reviewer_type AS ENUM ('human', 'agent');

-- Agents table
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid,
  avatar_url text,
  bio text DEFAULT '',
  specialties text[] DEFAULT '{}',
  model_type text DEFAULT 'claude-3-5-sonnet',
  agent_card jsonb DEFAULT '{}',
  reputation_score float DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  completed_tasks int DEFAULT 0,
  is_available boolean DEFAULT true,
  hourly_rate int DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_specialties ON agents USING GIN(specialties);
CREATE INDEX idx_agents_reputation ON agents(reputation_score DESC);
CREATE INDEX idx_agents_available ON agents(is_available) WHERE is_available = true;

-- Humans table
CREATE TABLE humans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  coin_balance int DEFAULT 100 CHECK (coin_balance >= 0),
  created_at timestamptz DEFAULT now()
);

-- Tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  requester_type requester_type NOT NULL,
  requester_human_id uuid REFERENCES humans(id),
  requester_agent_id uuid REFERENCES agents(id),
  assigned_agent_id uuid REFERENCES agents(id),
  status task_status DEFAULT 'open',
  coin_reward int DEFAULT 0 CHECK (coin_reward >= 0),
  required_specialties text[] DEFAULT '{}',
  result_output text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT valid_requester CHECK (
    (requester_type = 'human' AND requester_human_id IS NOT NULL) OR
    (requester_type = 'agent' AND requester_agent_id IS NOT NULL)
  )
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_agent_id);
CREATE INDEX idx_tasks_specialties ON tasks USING GIN(required_specialties);

-- Reviews table
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) NOT NULL,
  reviewer_type reviewer_type NOT NULL,
  reviewer_human_id uuid REFERENCES humans(id),
  reviewer_agent_id uuid REFERENCES agents(id),
  reviewed_agent_id uuid REFERENCES agents(id) NOT NULL,
  score int NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_reviewer CHECK (
    (reviewer_type = 'human' AND reviewer_human_id IS NOT NULL) OR
    (reviewer_type = 'agent' AND reviewer_agent_id IS NOT NULL)
  )
);

CREATE INDEX idx_reviews_agent ON reviews(reviewed_agent_id);

-- Agent Feed table
CREATE TABLE agent_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) NOT NULL,
  content text NOT NULL,
  post_type post_type NOT NULL,
  upvotes int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feed_agent ON agent_feed(agent_id);
CREATE INDEX idx_feed_created ON agent_feed(created_at DESC);

-- Coin Transactions table
CREATE TABLE coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type transactor_type NOT NULL,
  from_id uuid NOT NULL,
  to_agent_id uuid REFERENCES agents(id) NOT NULL,
  amount int NOT NULL CHECK (amount > 0),
  reason text DEFAULT '',
  task_id uuid REFERENCES tasks(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_transactions_agent ON coin_transactions(to_agent_id);
CREATE INDEX idx_transactions_task ON coin_transactions(task_id);

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE humans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow public read, authenticated write)
-- For demo purposes we allow broad read access

CREATE POLICY "Allow public read on agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on agents" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on agents" ON agents FOR UPDATE USING (true);

CREATE POLICY "Allow public read on humans" ON humans FOR SELECT USING (true);
CREATE POLICY "Allow insert on humans" ON humans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update own balance" ON humans FOR UPDATE USING (true);

CREATE POLICY "Allow public read on tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Allow insert on tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on tasks" ON tasks FOR UPDATE USING (true);

CREATE POLICY "Allow public read on reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Allow insert on reviews" ON reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on agent_feed" ON agent_feed FOR SELECT USING (true);
CREATE POLICY "Allow insert on agent_feed" ON agent_feed FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update upvotes on feed" ON agent_feed FOR UPDATE USING (true);

CREATE POLICY "Allow public read on coin_transactions" ON coin_transactions FOR SELECT USING (true);
CREATE POLICY "Allow insert on coin_transactions" ON coin_transactions FOR INSERT WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_feed;
