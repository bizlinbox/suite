-- Add reaction support, media mime type, filename, and expand message_type constraint

ALTER TABLE messages ADD COLUMN IF NOT EXISTS reaction_to_message_id UUID REFERENCES messages(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_reaction_to ON messages(reaction_to_message_id);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_mime_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS filename TEXT;

-- Expand message_type CHECK constraint for all outgoing interactive subtypes
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'sticker', 'contacts', 'reaction', 'button_reply', 'list_reply', 'interactive', 'order', 'system', 'button', 'nfm_reply', 'address_message', 'cta_url', 'list', 'product_list', 'location_request_message', 'template', 'unknown'));
