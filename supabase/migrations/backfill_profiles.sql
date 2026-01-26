-- Backfill profiles for existing users who don't have one
-- Run this AFTER running fix_user_creation.sql

-- Create profiles for all users that don't have one yet
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') as full_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Show how many profiles were created
SELECT COUNT(*) as profiles_created 
FROM auth.users u
WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

SELECT COUNT(*) as total_users FROM auth.users;
