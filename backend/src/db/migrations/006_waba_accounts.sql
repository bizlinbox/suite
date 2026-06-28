-- Multi-WABA Support

CREATE TABLE IF NOT EXISTS waba_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    business_account_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    webhook_verify_token TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, phone_number_id),
    UNIQUE(org_id, business_account_id)
);

-- Add FK from flows to waba_accounts (idempotent for fresh and existing DBs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'flows_waba_account_id_fkey'
    AND table_name = 'flows'
  ) THEN
    ALTER TABLE flows
      ADD CONSTRAINT flows_waba_account_id_fkey
      FOREIGN KEY (waba_account_id) REFERENCES waba_accounts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Migration: add webhook_verify_token to existing waba_accounts
ALTER TABLE waba_accounts ADD COLUMN IF NOT EXISTS webhook_verify_token TEXT;

-- Agent-WABA access control
CREATE TABLE IF NOT EXISTS agent_waba_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waba_account_id UUID NOT NULL REFERENCES waba_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, waba_account_id)
);

-- Migrate waba_accounts to add phone_number_id for existing databases
ALTER TABLE waba_accounts ADD COLUMN IF NOT EXISTS phone_number_id TEXT;

-- Migrate whatsapp_numbers to add waba_account_id for linking to waba_accounts
ALTER TABLE whatsapp_numbers ADD COLUMN IF NOT EXISTS waba_account_id UUID REFERENCES waba_accounts(id) ON DELETE SET NULL;

-- Migrate conversations: add waba_account_id for WABA-scoped filtering
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS waba_account_id UUID REFERENCES waba_accounts(id) ON DELETE SET NULL;

-- Migrate conversations: add is_private for restricted access
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- Migrate whatsapp_numbers to add business_account_id for existing databases
ALTER TABLE whatsapp_numbers ADD COLUMN IF NOT EXISTS business_account_id TEXT;

-- Indexes for WABA queries
CREATE INDEX IF NOT EXISTS idx_waba_accounts_org_id ON waba_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_waba_access_agent_id ON agent_waba_access(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_waba_access_waba_account_id ON agent_waba_access(waba_account_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_waba_account_id ON whatsapp_numbers(waba_account_id);
CREATE INDEX IF NOT EXISTS idx_conversations_waba_account_id ON conversations(waba_account_id);
