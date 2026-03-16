CREATE TABLE IF NOT EXISTS "deleted_leads_archive" (
  "id" TEXT NOT NULL,
  "original_lead_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "surname" TEXT,
  "cnpj" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "integration_status" TEXT,
  "tabulacao" TEXT,
  "original_owner_id" TEXT,
  "original_owner_name" TEXT,
  "attempted_by_user_id" TEXT NOT NULL,
  "archive_reason" TEXT NOT NULL,
  "archive_context" TEXT,
  "original_payload" JSONB,
  "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "deleted_leads_archive_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deleted_leads_archive_attempted_by_user_id_fkey" FOREIGN KEY ("attempted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "deleted_leads_archive_deleted_at_idx" ON "deleted_leads_archive"("deleted_at");
CREATE INDEX IF NOT EXISTS "deleted_leads_archive_cnpj_idx" ON "deleted_leads_archive"("cnpj");
CREATE INDEX IF NOT EXISTS "deleted_leads_archive_attempted_by_user_id_idx" ON "deleted_leads_archive"("attempted_by_user_id");
