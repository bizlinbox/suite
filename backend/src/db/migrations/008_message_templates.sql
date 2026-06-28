-- WhatsApp Message Templates (synced from Meta)

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
