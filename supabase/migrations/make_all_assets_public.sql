-- Make all existing assets public
-- This is a one-time migration to enable the public gallery feature

UPDATE public.assets
SET visibility = 'public'
WHERE visibility != 'public' OR visibility IS NULL;

-- Verify the update
SELECT 
  visibility, 
  COUNT(*) as count 
FROM public.assets 
GROUP BY visibility;
