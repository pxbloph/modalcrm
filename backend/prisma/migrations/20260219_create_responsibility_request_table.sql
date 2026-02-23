-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Table for Responsibility Change Requests
CREATE TABLE IF NOT EXISTS "responsibility_change_requests" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "lead_id" TEXT NOT NULL,
  "from_user_id" TEXT NOT NULL,
  "to_user_id" TEXT NOT NULL,
  "requested_by_user_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  "reviewer_user_id" TEXT,
  "reviewer_comment" TEXT,
  "tabulacao_snapshot" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3),

  CONSTRAINT "responsibility_change_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "responsibility_change_requests_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "responsibility_change_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "responsibility_change_requests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "responsibility_change_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS "responsibility_change_requests_status_created_at_idx" ON "responsibility_change_requests"("status", "created_at");
CREATE INDEX IF NOT EXISTS "responsibility_change_requests_lead_id_idx" ON "responsibility_change_requests"("lead_id");
