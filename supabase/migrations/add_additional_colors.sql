-- Add additional_colors column to assets table
-- These are brand colors that appear in prompts but don't affect the logo itself

ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS additional_colors TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.assets.additional_colors IS 'Brand colors added by user that appear in AI prompts but do not modify the logo SVG';
