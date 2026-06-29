-- Add platform configuration columns to organizations

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS platform_name TEXT DEFAULT 'BizlInbox',
  ADD COLUMN IF NOT EXISTS platform_logo TEXT,
  ADD COLUMN IF NOT EXISTS enable_public_registration BOOLEAN NOT NULL DEFAULT true;
