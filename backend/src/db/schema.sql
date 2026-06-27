-- BizlInbox PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, email)
);

-- Roles and Permissions
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, phone)
);

-- Migrate: add extra contact fields if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'company') THEN
    ALTER TABLE contacts ADD COLUMN company TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'job_title') THEN
    ALTER TABLE contacts ADD COLUMN job_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'notes') THEN
    ALTER TABLE contacts ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'birthday') THEN
    ALTER TABLE contacts ADD COLUMN birthday DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'language') THEN
    ALTER TABLE contacts ADD COLUMN language TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'tags') THEN
    ALTER TABLE contacts ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'address') THEN
    ALTER TABLE contacts ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'city') THEN
    ALTER TABLE contacts ADD COLUMN city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'state') THEN
    ALTER TABLE contacts ADD COLUMN state TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'country') THEN
    ALTER TABLE contacts ADD COLUMN country TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'zip_code') THEN
    ALTER TABLE contacts ADD COLUMN zip_code TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    street TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    country_code TEXT,
    type TEXT DEFAULT 'HOME' CHECK (type IN ('HOME', 'WORK')),
    source TEXT DEFAULT 'whatsapp',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, contact_id, type)
);

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('agent', 'contact', 'system')),
    content TEXT,
    media_url TEXT,
    media_mime_type TEXT,
    filename TEXT,
    voice BOOLEAN DEFAULT false,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'sticker', 'contacts', 'reaction', 'button_reply', 'list_reply', 'interactive', 'order', 'system', 'button', 'nfm_reply', 'address_message', 'cta_url', 'list', 'product_list', 'location_request_message', 'unknown')),
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    external_id TEXT,
    error_message TEXT,
    reaction_to_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate: add reaction_to_message_id if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reaction_to_message_id') THEN
    ALTER TABLE messages ADD COLUMN reaction_to_message_id UUID REFERENCES messages(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_messages_reaction_to ON messages(reaction_to_message_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    waba_account_id UUID REFERENCES waba_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    flow_id TEXT UNIQUE,
    category TEXT,
    status TEXT DEFAULT 'DRAFT',
    flow_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flows_org_id ON flows(org_id);
CREATE INDEX IF NOT EXISTS idx_flows_waba_account_id ON flows(waba_account_id);

CREATE TABLE IF NOT EXISTS flow_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    flow_token TEXT,
    response_json JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_flow_submissions_org_id ON flow_submissions(org_id);
CREATE INDEX IF NOT EXISTS idx_flow_submissions_flow_id ON flow_submissions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_submissions_conversation_id ON flow_submissions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_flow_submissions_flow_token ON flow_submissions(flow_token);

-- Migrate: rename canned_responses to quick_responses if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'canned_responses') THEN
    ALTER TABLE canned_responses RENAME TO quick_responses;
  END IF;
END $$;

-- Migrate: rename index if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_canned_responses_org_id') THEN
    ALTER INDEX idx_canned_responses_org_id RENAME TO idx_quick_responses_org_id;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS quick_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shortcut TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document', 'audio', 'button', 'list')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, shortcut)
);

-- Migrate: add message_type and metadata if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_responses' AND column_name = 'message_type') THEN
    ALTER TABLE quick_responses ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document', 'audio', 'button', 'list'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_responses' AND column_name = 'metadata') THEN
    ALTER TABLE quick_responses ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('message_received', 'conversation_opened', 'conversation_closed', 'contact_created')),
    conditions JSONB DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone_number_id TEXT NOT NULL,
    display_name TEXT,
    business_account_id TEXT,
    access_token TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, phone_number_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_roles_org_id ON roles(org_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_agent_id ON conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_id);
CREATE INDEX IF NOT EXISTS idx_quick_responses_org_id ON quick_responses(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_org_id ON workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_org_id ON whatsapp_numbers(org_id);
CREATE INDEX IF NOT EXISTS idx_addresses_org_id ON addresses(org_id);
CREATE INDEX IF NOT EXISTS idx_addresses_contact_id ON addresses(contact_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- Migrate message_type CHECK constraint for existing databases to support all outgoing interactive subtypes
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'sticker', 'contacts', 'reaction', 'button_reply', 'list_reply', 'interactive', 'order', 'system', 'button', 'nfm_reply', 'address_message', 'cta_url', 'list', 'product_list', 'location_request_message', 'unknown'));

-- Migrate whatsapp_numbers to add business_account_id for existing databases
ALTER TABLE whatsapp_numbers ADD COLUMN IF NOT EXISTS business_account_id TEXT;

-- Invitations table for agent onboarding
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
    used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Migrate messages to add filename column for existing databases
ALTER TABLE messages ADD COLUMN IF NOT EXISTS filename TEXT;

-- ============================================================
-- Multi-WABA Support
-- ============================================================

-- WABA accounts (top-level WhatsApp Business Accounts per organization)
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

-- Migration: add webhook_verify_token to existing waba_accounts
ALTER TABLE waba_accounts ADD COLUMN IF NOT EXISTS webhook_verify_token TEXT;

-- Agent-WABA access control (which agents can access which WABA accounts)
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

-- Indexes for WABA queries
CREATE INDEX IF NOT EXISTS idx_waba_accounts_org_id ON waba_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_waba_access_agent_id ON agent_waba_access(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_waba_access_waba_account_id ON agent_waba_access(waba_account_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_waba_account_id ON whatsapp_numbers(waba_account_id);
CREATE INDEX IF NOT EXISTS idx_conversations_waba_account_id ON conversations(waba_account_id);

-- ============================================================
-- Bulk Campaign Support
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    waba_account_id UUID NOT NULL REFERENCES waba_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('utility', 'marketing')),
    content TEXT NOT NULL,
    template_name TEXT,
    template_variables JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    read_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'read', 'failed')),
    external_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_external_id ON campaign_recipients(external_id);

-- ============================================================
-- WhatsApp Message Templates (synced from Meta)
-- ============================================================

CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    waba_account_id UUID NOT NULL REFERENCES waba_accounts(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
    language TEXT NOT NULL,
    components JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'APPROVED',
    meta_template_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(waba_account_id, template_name, language)
);

-- Migrate campaigns to add template_id reference (must run after message_templates table exists)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_message_templates_waba_account_id ON message_templates(waba_account_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);

-- ============================================================
-- Automations (Visual Workflow Engine)
-- ============================================================

CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    waba_account_id UUID REFERENCES waba_accounts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    label TEXT,
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES automation_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES automation_nodes(id) ON DELETE CASCADE,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_org_id ON automations(org_id);
CREATE INDEX IF NOT EXISTS idx_automations_waba_account_id ON automations(waba_account_id);
CREATE INDEX IF NOT EXISTS idx_automation_nodes_automation_id ON automation_nodes(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_edges_automation_id ON automation_edges(automation_id);
