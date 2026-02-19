-- Script para validação/criação da tabela de auditoria
-- ATENÇÃO: Executar no SQL Editor apenas se a tabela ainda não existir no banco de produção.

CREATE TABLE IF NOT EXISTS "lead_owner_transfer_audit" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "old_owner_id" TEXT NOT NULL,
    "new_owner_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_owner_transfer_audit_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys (Comentadas para execução condicional segura, descomentar se necessário)
/*
ALTER TABLE "lead_owner_transfer_audit" ADD CONSTRAINT "lead_owner_transfer_audit_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_owner_transfer_audit" ADD CONSTRAINT "lead_owner_transfer_audit_old_owner_id_fkey" FOREIGN KEY ("old_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_owner_transfer_audit" ADD CONSTRAINT "lead_owner_transfer_audit_new_owner_id_fkey" FOREIGN KEY ("new_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_owner_transfer_audit" ADD CONSTRAINT "lead_owner_transfer_audit_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
*/
