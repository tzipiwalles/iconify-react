-- Fix admin access to view all users
-- Add policy for admin to view all profiles

-- Drop existing admin policy if any
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- Create admin policy - admin can view all profiles
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'tzipi.walles@gmail.com'
  );

-- Also ensure regular users can still view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admin can also view all assets
DROP POLICY IF EXISTS "Admin can view all assets" ON public.assets;
CREATE POLICY "Admin can view all assets"
  ON public.assets FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'tzipi.walles@gmail.com'
  );

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'assets')
ORDER BY tablename, policyname;
