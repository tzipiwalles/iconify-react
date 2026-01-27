-- =============================================
-- Fix Assets RLS Policies (Security Critical!)
-- Ensure users can only see their own assets
-- =============================================

-- Enable RLS on assets table
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can view public assets" ON public.assets;
DROP POLICY IF EXISTS "Users can view organization assets" ON public.assets;
DROP POLICY IF EXISTS "Users can insert own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can update own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can delete own assets" ON public.assets;

-- 1. Users can ONLY view their own assets
CREATE POLICY "Users can view own assets"
  ON public.assets FOR SELECT
  USING (user_id = auth.uid());

-- 2. Users can view public assets (for sharing)
CREATE POLICY "Users can view public assets"
  ON public.assets FOR SELECT
  USING (visibility = 'public');

-- 3. Users can view organization assets (if in same org)
CREATE POLICY "Users can view organization assets"
  ON public.assets FOR SELECT
  USING (
    visibility = 'organization' AND
    user_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- 4. Users can insert their own assets
CREATE POLICY "Users can insert own assets"
  ON public.assets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 5. Users can update ONLY their own assets
CREATE POLICY "Users can update own assets"
  ON public.assets FOR UPDATE
  USING (user_id = auth.uid());

-- 6. Users can delete ONLY their own assets
CREATE POLICY "Users can delete own assets"
  ON public.assets FOR DELETE
  USING (user_id = auth.uid());

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies for assets table have been configured';
  RAISE NOTICE '🔒 Users can now only see their own assets';
END $$;
