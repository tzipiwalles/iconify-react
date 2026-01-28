-- =============================================
-- User Events Tracking Table
-- Track important user actions like "Generate" clicks
-- =============================================

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event info
  event_type TEXT NOT NULL,  -- 'generate_click', 'save_asset', 'share_asset', etc.
  
  -- User info
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,  -- For anonymous tracking
  
  -- Event metadata
  metadata JSONB DEFAULT '{}',  -- mode, file_type, file_size, etc.
  
  -- Request info
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Admin can view all events
CREATE POLICY "Admin can view all events"
  ON public.events FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'tzipi.walles@gmail.com'
  );

-- Anyone can insert events (for tracking)
CREATE POLICY "Anyone can insert events"
  ON public.events FOR INSERT
  WITH CHECK (true);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);

-- Create function to get event stats
CREATE OR REPLACE FUNCTION get_event_stats()
RETURNS TABLE (
  event_type TEXT,
  total_count BIGINT,
  unique_users BIGINT,
  last_occurred TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.event_type,
    COUNT(*)::BIGINT as total_count,
    COUNT(DISTINCT COALESCE(e.user_id::TEXT, e.session_id))::BIGINT as unique_users,
    MAX(e.created_at) as last_occurred
  FROM public.events e
  GROUP BY e.event_type
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE '✅ Events tracking table created';
  RAISE NOTICE '📊 Ready to track user events';
END $$;
