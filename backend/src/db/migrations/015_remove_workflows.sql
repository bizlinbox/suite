-- Remove deprecated workflows table (replaced by automations engine)
-- Only drops the table if it is empty to prevent accidental data loss.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
    IF (SELECT COUNT(*) FROM workflows) = 0 THEN
      DROP TABLE workflows;
    ELSE
      RAISE NOTICE 'workflows table is not empty; skipping drop to prevent data loss.';
    END IF;
  END IF;
END $$;
