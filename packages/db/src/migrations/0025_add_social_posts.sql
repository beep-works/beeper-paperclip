CREATE TABLE IF NOT EXISTS "social_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "text" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "platforms" json DEFAULT '[]'::json NOT NULL,
  "scheduled_for" timestamp with time zone,
  "published_at" timestamp with time zone,
  "created_by_user_id" text,
  "created_by_agent_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "social_posts_company_id_idx" ON "social_posts" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "social_posts_status_idx" ON "social_posts" USING btree ("company_id", "status");
