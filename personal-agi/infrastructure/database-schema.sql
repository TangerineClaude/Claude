-- Personal AGI Database Schema
-- PostgreSQL with pgvector extension for semantic search

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Conversations table - stores all user-agent interactions
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  user_message TEXT NOT NULL,
  agent_response TEXT,
  model_used VARCHAR(50),
  task_category VARCHAR(50),
  related_project VARCHAR(100),
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 6),
  embedding vector(1536),  -- OpenAI/Claude embedding dimension
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Memory nodes - semantic memory storage
CREATE TABLE memory_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  category VARCHAR(50),
  tags TEXT[],
  source VARCHAR(100),  -- 'conversation', 'ios_reminder', 'manual', etc.
  importance INTEGER DEFAULT 5,  -- 1-10 scale
  related_nodes UUID[],
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Credentials - encrypted credential storage
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(100) NOT NULL UNIQUE,
  username VARCHAR(255),
  encrypted_data TEXT NOT NULL,  -- Encrypted JSON containing credentials
  last_used TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  session_data JSONB,  -- Store cookies, tokens, etc.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tasks - track all tasks the agent performs
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, failed, cancelled
  priority INTEGER DEFAULT 5,  -- 1-10 scale
  verification_required BOOLEAN DEFAULT false,
  verification_status VARCHAR(20),  -- none, pending, approved, rejected
  verification_method VARCHAR(20),  -- sms, nfc, auto
  subtasks JSONB,  -- Array of subtask objects
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  assigned_model VARCHAR(50),
  estimated_time INTEGER,  -- seconds
  actual_time INTEGER,  -- seconds
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Verifications - track all verification requests
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id),
  method VARCHAR(20) NOT NULL,  -- sms, nfc
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, expired
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP,
  expires_at TIMESTAMP,
  verification_code VARCHAR(10),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Projects - track ongoing projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',  -- active, paused, completed, archived
  category VARCHAR(50),
  related_tasks UUID[],
  related_memories UUID[],
  repository_url VARCHAR(500),
  deployment_url VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Model usage - track API usage and costs
CREATE TABLE model_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name VARCHAR(50) NOT NULL,
  task_id UUID REFERENCES tasks(id),
  conversation_id UUID REFERENCES conversations(id),
  tokens_used INTEGER,
  cost DECIMAL(10, 6),
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_timestamp ON conversations(timestamp DESC);
CREATE INDEX idx_conversations_category ON conversations(task_category);
CREATE INDEX idx_conversations_project ON conversations(related_project);
CREATE INDEX idx_memory_nodes_category ON memory_nodes(category);
CREATE INDEX idx_memory_nodes_tags ON memory_nodes USING GIN(tags);
CREATE INDEX idx_memory_nodes_created ON memory_nodes(created_at DESC);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX idx_verifications_status ON verifications(status);
CREATE INDEX idx_projects_status ON projects(status);

-- Vector similarity search indexes
CREATE INDEX idx_conversations_embedding ON conversations USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_memory_nodes_embedding ON memory_nodes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memory_nodes_updated_at BEFORE UPDATE ON memory_nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW active_tasks AS
SELECT * FROM tasks
WHERE status IN ('pending', 'in_progress')
ORDER BY priority DESC, created_at ASC;

CREATE VIEW recent_conversations AS
SELECT * FROM conversations
ORDER BY timestamp DESC
LIMIT 100;

CREATE VIEW model_cost_summary AS
SELECT
  model_name,
  COUNT(*) as usage_count,
  SUM(tokens_used) as total_tokens,
  SUM(cost) as total_cost,
  AVG(latency_ms) as avg_latency_ms,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as success_rate
FROM model_usage
GROUP BY model_name;

-- Insert default categories
INSERT INTO memory_nodes (content, category, importance, embedding) VALUES
('System initialized - Personal AGI MVP', 'system', 10, array_fill(0, ARRAY[1536])::vector);

COMMENT ON TABLE conversations IS 'Stores all user-agent conversations with semantic embeddings';
COMMENT ON TABLE memory_nodes IS 'Long-term semantic memory storage';
COMMENT ON TABLE credentials IS 'Encrypted credential storage for platform integrations';
COMMENT ON TABLE tasks IS 'Task tracking and orchestration';
COMMENT ON TABLE verifications IS 'Security verification audit log';
COMMENT ON TABLE projects IS 'Project tracking and context management';
COMMENT ON TABLE model_usage IS 'API usage tracking for cost management';
