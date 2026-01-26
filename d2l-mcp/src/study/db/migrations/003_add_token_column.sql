-- Add token column to user_credentials table for storing D2L tokens
-- This allows storing tokens directly from WebView login instead of credentials

alter table public.user_credentials 
add column if not exists token text;

-- Make password nullable since we can now use tokens instead
alter table public.user_credentials 
alter column password drop not null;
