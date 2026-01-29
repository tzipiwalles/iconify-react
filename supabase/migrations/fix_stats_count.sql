-- Fix stats counting by creating a function that bypasses RLS
-- This is safe because it only returns aggregate counts, not individual data

-- Create a function to get public stats
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  icon_count INTEGER;
  logo_count INTEGER;
  result JSON;
BEGIN
  -- Count all profiles (bypasses RLS due to SECURITY DEFINER)
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Count assets by mode
  SELECT COUNT(*) INTO icon_count FROM public.assets WHERE mode = 'icon';
  SELECT COUNT(*) INTO logo_count FROM public.assets WHERE mode = 'logo';
  
  -- Build the result
  result := json_build_object(
    'users', user_count,
    'icons', icon_count,
    'logos', logo_count,
    'totalAssets', icon_count + logo_count
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO authenticated;
