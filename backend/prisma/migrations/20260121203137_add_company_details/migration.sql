/*
  Warnings:

  - You are about to drop the column `status` on the `clients` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cnpj]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cpf]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cnpj` to the `clients` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PipelineVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'USER');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'ABANDONED');

-- CreateEnum
CREATE TYPE "DealPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('ENTER_STAGE', 'LEAVE_STAGE', 'SLA_BREACH', 'FIELD_UPDATE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'LEADER';

-- DropIndex
DROP INDEX "clients_email_key";

-- DropIndex
DROP INDEX "clients_phone_key";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "status",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "answers" JSONB DEFAULT '{}',
ADD COLUMN     "cnae_main" TEXT,
ADD COLUMN     "cnae_secondary" TEXT,
ADD COLUMN     "cnpj" TEXT NOT NULL,
ADD COLUMN     "has_open_account" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "id_bitrix" INTEGER,
ADD COLUMN     "id_card_bitrix" TEXT,
ADD COLUMN     "id_contact_bitrix" TEXT,
ADD COLUMN     "is_qualified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legal_nature" TEXT,
ADD COLUMN     "opening_date" TIMESTAMP(3),
ADD COLUMN     "registration_status" TEXT,
ADD COLUMN     "registration_status_date" TIMESTAMP(3),
ADD COLUMN     "share_capital" DECIMAL(15,2),
ALTER COLUMN "surname" DROP NOT NULL,
ALTER COLUMN "integration_status" SET DEFAULT 'Cadastrando...';

-- AlterTable
ALTER TABLE "form_templates" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'QUALIFICATION';

-- AlterTable
ALTER TABLE "qualifications" ADD COLUMN     "agendamento" TIMESTAMP(3),
ADD COLUMN     "deseja_receber_ofertas" BOOLEAN DEFAULT false,
ADD COLUMN     "emite_boletos" BOOLEAN DEFAULT false,
ADD COLUMN     "fase" TEXT,
ADD COLUMN     "faturamento_maquina" DECIMAL(15,2),
ADD COLUMN     "faturamento_mensal" DECIMAL(15,2),
ADD COLUMN     "informacoes_adicionais" TEXT,
ADD COLUMN     "integration_attempts" INTEGER DEFAULT 0,
ADD COLUMN     "integration_status" TEXT DEFAULT 'PENDING',
ADD COLUMN     "last_integration_attempt" TIMESTAMP(3),
ADD COLUMN     "maquininha_atual" TEXT,
ADD COLUMN     "nome_do_cliente" TEXT,
ADD COLUMN     "produto_interesse" TEXT,
ADD COLUMN     "tabulacao" TEXT,
ADD COLUMN     "webhook_response" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "surname" TEXT,
ADD COLUMN     "team_id" TEXT;

-- DropEnum
DROP TYPE "ClientStatus";

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "supervisor_id" TEXT NOT NULL,
    "leader_id" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "file_name" TEXT NOT NULL,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "processed_records" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_results" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "row_data" JSONB,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "supervisor_id" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "client_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "PipelineVisibility" NOT NULL DEFAULT 'PUBLIC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "order_index" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "sla_minutes" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "client_id" TEXT,
    "responsible_id" TEXT,
    "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
    "value" DECIMAL(15,2),
    "priority" "DealPriority" NOT NULL DEFAULT 'NORMAL',
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "stage_entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_custom_field_values" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "value" TEXT,
    "value_json" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_history" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "stage_id" TEXT,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "conditions" JSONB DEFAULT '[]',
    "actions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_operator_id_idx" ON "conversations"("operator_id");

-- CreateIndex
CREATE INDEX "conversations_supervisor_id_idx" ON "conversations"("supervisor_id");

-- CreateIndex
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_operator_id_supervisor_id_key" ON "conversations"("operator_id", "supervisor_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipeline_id_order_index_idx" ON "pipeline_stages"("pipeline_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "custom_fields_pipeline_id_key_key" ON "custom_fields"("pipeline_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "deal_custom_field_values_deal_id_field_id_key" ON "deal_custom_field_values"("deal_id", "field_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_cnpj_key" ON "clients"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_results" ADD CONSTRAINT "import_results_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_audit_logs" ADD CONSTRAINT "chat_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_custom_field_values" ADD CONSTRAINT "deal_custom_field_values_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_custom_field_values" ADD CONSTRAINT "deal_custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "custom_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_history" ADD CONSTRAINT "deal_history_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_history" ADD CONSTRAINT "deal_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
