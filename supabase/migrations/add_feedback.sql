-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  message TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Admin can see all feedback
CREATE POLICY "Admin can view all feedback"
  ON public.feedback
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN (
      SELECT email FROM public.profiles WHERE email = 'tzipi.walles@gmail.com'
    )
  );

-- Anyone can insert feedback (authenticated or anonymous)
CREATE POLICY "Anyone can insert feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id);

-- Grant permissions
GRANT SELECT ON public.feedback TO authenticated, anon;
GRANT INSERT ON public.feedback TO authenticated, anon;
