ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "initial_page" TEXT NOT NULL DEFAULT 'DEFAULT';

ALTER TABLE "deleted_leads_archive"
ADD COLUMN IF NOT EXISTS "restored_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "restored_by_user_id" TEXT,
ADD COLUMN IF NOT EXISTS "restored_client_id" TEXT;

CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" TEXT NOT NULL,
  "value_json" JSONB NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

INSERT INTO "system_settings" ("key", "value_json", "description")
VALUES ('lead_registration_enabled', 'true'::jsonb, 'Controla se a tela de cadastro de leads esta habilitada.')
ON CONFLICT ("key") DO NOTHING;
