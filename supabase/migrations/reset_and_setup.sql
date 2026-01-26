-- Complete setup script - runs everything in correct order
-- Safe to run multiple times

-- =============================================
-- 1. FEEDBACK TABLE SETUP
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Admin can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;

-- Drop indexes if exist
DROP INDEX IF EXISTS public.idx_feedback_created_at;
DROP INDEX IF EXISTS public.idx_feedback_user_id;

-- Create table if not exists
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

-- Create policies
CREATE POLICY "Admin can view all feedback"
  ON public.feedback
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'tzipi.walles@gmail.com'
  );

CREATE POLICY "Anyone can insert feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);

-- Grant permissions
GRANT SELECT ON public.feedback TO authenticated, anon;
GRANT INSERT ON public.feedback TO authenticated, anon;

-- =============================================
-- 2. ADMIN ACCESS TO PROFILES & ASSETS
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all assets" ON public.assets;

-- Profiles policies
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'tzipi.walles@gmail.com'
  );

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Assets policies  
CREATE POLICY "Admin can view all assets"
  ON public.assets FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'tzipi.walles@gmail.com'
  );

-- =============================================
-- 3. BACKFILL MISSING PROFILES
-- =============================================

-- Create profiles for any users that don't have one
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') as full_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 4. VERIFICATION
-- =============================================

-- Show results
SELECT 'Setup Complete!' as status;

SELECT 
  'Users' as table_name,
  (SELECT COUNT(*) FROM auth.users) as count;

SELECT 
  'Profiles' as table_name,
  (SELECT COUNT(*) FROM public.profiles) as count;

SELECT 
  'Feedback' as table_name,
  (SELECT COUNT(*) FROM public.feedback) as count;

SELECT 
  'Assets' as table_name,
  (SELECT COUNT(*) FROM public.assets) as count;

-- Show any users without profiles
SELECT 
  'Users without profile:' as info,
  COUNT(*) as count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
