-- WhatsApp Flows support

CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    waba_account_id UUID,
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
