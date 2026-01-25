-- =============================================
-- Add API Key support to profiles
-- Run this in Supabase SQL Editor
-- =============================================

-- Add api_key column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- Create index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_profiles_api_key ON public.profiles(api_key);

-- Function to generate a new API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT AS $$
DECLARE
  key TEXT;
BEGIN
  -- Generate a random key with sk_ prefix (32 chars total)
  key := 'sk_' || encode(gen_random_bytes(20), 'hex');
  RETURN key;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh user's API key
CREATE OR REPLACE FUNCTION public.refresh_api_key(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
BEGIN
  new_key := public.generate_api_key();
  
  UPDATE public.profiles
  SET api_key = new_key, updated_at = NOW()
  WHERE id = user_id;
  
  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-generate API key for new users (update the trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, api_key)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    public.generate_api_key()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate API keys for existing users who don't have one
UPDATE public.profiles
SET api_key = public.generate_api_key()
WHERE api_key IS NULL;
