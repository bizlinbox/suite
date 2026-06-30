-- Remove CHECK constraint on invitations.role so custom roles can be invited
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
