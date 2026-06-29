-- Add name and remarks to campaign_recipients for import mapping
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Add remarks to contacts for import mapping
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS remarks TEXT;
