-- Tool Compatibility Tracking
-- Tracks which AI tools work with Asset-Bridge URLs and allows user voting

-- Table for AI tools
CREATE TABLE IF NOT EXISTS ai_tools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- 'web_app', 'html', 'chat', 'ide'
  url VARCHAR(255),
  icon_emoji VARCHAR(10) DEFAULT '🤖',
  icon_slug VARCHAR(50), -- For Simple Icons API (e.g., 'chatgpt', 'cursor')
  works BOOLEAN DEFAULT NULL, -- NULL = unknown, true = works, false = doesn't work
  verified BOOLEAN DEFAULT FALSE, -- Admin verified
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for user votes on tool compatibility
CREATE TABLE IF NOT EXISTS tool_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID NOT NULL REFERENCES ai_tools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(100), -- For anonymous users
  works BOOLEAN NOT NULL, -- true = works for me, false = doesn't work for me
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Each user/session can only vote once per tool
  UNIQUE(tool_id, user_id),
  UNIQUE(tool_id, session_id)
);

-- Table for user suggestions of new tools
CREATE TABLE IF NOT EXISTS tool_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(255),
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tool_votes_tool ON tool_votes(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_votes_user ON tool_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tools_works ON ai_tools(works);

-- RLS Policies
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_suggestions ENABLE ROW LEVEL SECURITY;

-- Everyone can view tools
DROP POLICY IF EXISTS "Anyone can view tools" ON ai_tools;
CREATE POLICY "Anyone can view tools" ON ai_tools
  FOR SELECT USING (true);

-- Only admin can modify tools directly (check by email)
DROP POLICY IF EXISTS "Admin can manage tools" ON ai_tools;
CREATE POLICY "Admin can manage tools" ON ai_tools
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'tzipi.walles@gmail.com'
  );

-- Anyone can add a tool (for user suggestions)
DROP POLICY IF EXISTS "Anyone can suggest tools" ON ai_tools;
CREATE POLICY "Anyone can suggest tools" ON ai_tools
  FOR INSERT WITH CHECK (true);

-- Anyone can view votes
DROP POLICY IF EXISTS "Anyone can view votes" ON tool_votes;
CREATE POLICY "Anyone can view votes" ON tool_votes
  FOR SELECT USING (true);

-- Anyone can vote
DROP POLICY IF EXISTS "Anyone can vote" ON tool_votes;
CREATE POLICY "Anyone can vote" ON tool_votes
  FOR INSERT WITH CHECK (true);

-- Users can update their own votes
DROP POLICY IF EXISTS "Users can update own votes" ON tool_votes;
CREATE POLICY "Users can update own votes" ON tool_votes
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Tool suggestions policies
DROP POLICY IF EXISTS "Anyone can view suggestions" ON tool_suggestions;
CREATE POLICY "Anyone can view suggestions" ON tool_suggestions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can suggest" ON tool_suggestions;
CREATE POLICY "Anyone can suggest" ON tool_suggestions
  FOR INSERT WITH CHECK (true);

-- Insert initial tools based on testing
INSERT INTO ai_tools (name, category, url, icon_emoji, icon_slug, works, verified) VALUES
  ('Google AI Studio', 'web_app', 'https://aistudio.google.com', '🔷', 'google', true, true),
  ('Gemini Chat', 'chat', 'https://gemini.google.com', '✨', 'googlegemini', true, true),
  ('Base44', 'web_app', 'https://base44.com', '🟦', NULL, true, true),
  ('Cursor', 'ide', 'https://cursor.com', '🖱️', 'cursor', true, true),
  ('ChatGPT', 'chat', 'https://chat.openai.com', '🟢', 'openai', true, true),
  ('v0.dev', 'web_app', 'https://v0.dev', '▲', 'vercel', true, false),
  ('Claude Artifacts', 'chat', 'https://claude.ai', '🟠', 'anthropic', false, true),
  ('Bolt.new', 'web_app', 'https://bolt.new', '⚡', 'stackblitz', NULL, false),
  ('Lovable.dev', 'web_app', 'https://lovable.dev', '💜', NULL, NULL, false),
  ('Replit AI', 'ide', 'https://replit.com', '🔵', 'replit', NULL, false),
  ('Windsurf', 'ide', 'https://codeium.com/windsurf', '🏄', 'codeium', NULL, false),
  ('GitHub Copilot', 'ide', 'https://github.com/features/copilot', '🐙', 'github', NULL, false)
ON CONFLICT (name) DO NOTHING;

-- Function to get tool stats with vote counts
CREATE OR REPLACE FUNCTION get_tool_stats()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  category VARCHAR,
  url VARCHAR,
  icon_emoji VARCHAR,
  icon_slug VARCHAR,
  works BOOLEAN,
  verified BOOLEAN,
  works_votes BIGINT,
  doesnt_work_votes BIGINT,
  total_votes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.category,
    t.url,
    t.icon_emoji,
    t.icon_slug,
    t.works,
    t.verified,
    COUNT(CASE WHEN v.works = true THEN 1 END) as works_votes,
    COUNT(CASE WHEN v.works = false THEN 1 END) as doesnt_work_votes,
    COUNT(v.id) as total_votes
  FROM ai_tools t
  LEFT JOIN tool_votes v ON t.id = v.tool_id
  GROUP BY t.id, t.name, t.category, t.url, t.icon_emoji, t.icon_slug, t.works, t.verified
  ORDER BY t.verified DESC, t.works DESC NULLS LAST, t.name;
END;
$$ LANGUAGE plpgsql;
