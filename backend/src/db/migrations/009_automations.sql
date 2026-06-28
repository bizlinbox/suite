-- Automations (Visual Workflow Engine)

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
