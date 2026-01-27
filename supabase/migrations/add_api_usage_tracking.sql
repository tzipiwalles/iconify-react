-- =============================================
-- API Usage Tracking Table
-- Track all API endpoint calls for analytics
-- =============================================

-- Create api_usage table
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request info
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  query_params JSONB,
  
  -- User info
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Response info
  status_code INTEGER,
  response_time_ms INTEGER,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Admin can view all usage
CREATE POLICY "Admin can view all api_usage"
  ON public.api_usage FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'tzipi.walles@gmail.com'
  );

-- Anyone can insert (for tracking)
CREATE POLICY "Anyone can insert api_usage"
  ON public.api_usage FOR INSERT
  WITH CHECK (true);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON public.api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);

-- Create function to get endpoint stats
CREATE OR REPLACE FUNCTION get_endpoint_stats()
RETURNS TABLE (
  endpoint TEXT,
  total_calls BIGINT,
  avg_response_time NUMERIC,
  last_called TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    api_usage.endpoint,
    COUNT(*)::BIGINT as total_calls,
    ROUND(AVG(api_usage.response_time_ms)::NUMERIC, 2) as avg_response_time,
    MAX(api_usage.created_at) as last_called
  FROM public.api_usage
  GROUP BY api_usage.endpoint
  ORDER BY total_calls DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE '✅ API Usage tracking table created';
  RAISE NOTICE '📊 Ready to track API calls';
END $$;
