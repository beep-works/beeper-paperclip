-- Seed: Insert Social Timeline tool for Beeper company (idempotent)
-- This ensures the tool record survives PG restarts.

INSERT INTO company_tools (id, company_id, name, description, url, icon, status, sort_order, docs_file_path)
SELECT
  gen_random_uuid(),
  c.id,
  $STR$Social Timeline$STR$,
  $STR$Internal social media management tool for drafting, reviewing, editing, and publishing social posts.$STR$,
  $STR$/tools/social-timeline$STR$,
  $STR$megaphone$STR$,
  $STR$active$STR$,
  0,
  $STR$~/Projects/beeper/tools/social-timeline/HOW-TO-USE.md$STR$
FROM companies c
WHERE c.issue_prefix = $STR$BEE$STR$
  AND NOT EXISTS (
    SELECT 1 FROM company_tools ct
    WHERE ct.company_id = c.id AND ct.name = $STR$Social Timeline$STR$
  );
