CREATE TABLE IF NOT EXISTS "dev_notes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "show_in_daily_popup" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dev_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dev_note_daily_views" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dev_note_daily_views_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "dev_notes"
ADD CONSTRAINT "dev_notes_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dev_note_daily_views"
ADD CONSTRAINT "dev_note_daily_views_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "dev_notes_is_active_created_at_idx" ON "dev_notes"("is_active", "created_at");
CREATE INDEX IF NOT EXISTS "dev_note_daily_views_day_key_idx" ON "dev_note_daily_views"("day_key");
CREATE UNIQUE INDEX IF NOT EXISTS "dev_note_daily_views_user_id_day_key_key" ON "dev_note_daily_views"("user_id", "day_key");
