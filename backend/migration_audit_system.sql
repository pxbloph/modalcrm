-- CRIAÇÃO DAS TABELAS DE AUDITORIA

-- 1. Tabela Principal de Logs (Leve e Indexada)
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "environment" TEXT NOT NULL DEFAULT 'prod',
    "level" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" TEXT NOT NULL,
    "actor_id" TEXT,
    "impersonated_by_id" TEXT,
    "request_id" TEXT,
    "trace_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "route" TEXT,
    "method" TEXT,
    "status_code" INTEGER,
    "duration_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "tags" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- 2. Tabela de Payload (Pesada, separada para performance)
CREATE TABLE "audit_log_payloads" (
    "id" TEXT NOT NULL,
    "audit_log_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "request_body" JSONB,
    "response_body" JSONB,

    CONSTRAINT "audit_log_payloads_pkey" PRIMARY KEY ("id")
);

-- 3. Índices para Performance e Busca
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs"("event_type");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");

CREATE UNIQUE INDEX "audit_log_payloads_audit_log_id_key" ON "audit_log_payloads"("audit_log_id");

-- 4. Foreign Keys
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_log_payloads" ADD CONSTRAINT "audit_log_payloads_audit_log_id_fkey" FOREIGN KEY ("audit_log_id") REFERENCES "audit_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Atualizar tabela Users para relacionamento reverso (opcional no SQL, mas necessário no Prisma)
-- Nenhuma alteração de DDL necessária na tabela users, apenas a FK acima já resolve o vínculo.
