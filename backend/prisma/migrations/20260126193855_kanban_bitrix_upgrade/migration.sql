-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationTrigger" ADD VALUE 'SLA_WARNING';
ALTER TYPE "AutomationTrigger" ADD VALUE 'TABULATION_UPDATE';

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "sla_due_date" TIMESTAMP(3),
ADD COLUMN     "sla_start_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pipeline_stages" ADD COLUMN     "config" JSONB DEFAULT '{}',
ADD COLUMN     "is_final_failure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_final_success" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "qualifications" ADD COLUMN     "card_adicionais" INTEGER,
ADD COLUMN     "card_fatura_aberta_data" TIMESTAMP(3),
ADD COLUMN     "card_fatura_aberta_valor" DECIMAL(15,2),
ADD COLUMN     "card_final" TEXT,
ADD COLUMN     "card_status" TEXT,
ADD COLUMN     "card_tipo" TEXT,
ADD COLUMN     "cc_limite_disponivel" DECIMAL(15,2),
ADD COLUMN     "cc_limite_utilizado" DECIMAL(15,2),
ADD COLUMN     "cc_numero" TEXT,
ADD COLUMN     "cc_saldo" DECIMAL(15,2),
ADD COLUMN     "cc_status" TEXT,
ADD COLUMN     "cc_tipo_conta" TEXT,
ADD COLUMN     "credit_blocklist" BOOLEAN DEFAULT false,
ADD COLUMN     "credit_inadimplencia" TEXT DEFAULT 'Em dia',
ADD COLUMN     "credit_score_interno" TEXT DEFAULT 'Informação indisponível',
ADD COLUMN     "credit_score_serasa" TEXT DEFAULT 'Informação indisponível',
ADD COLUMN     "global_dolar" BOOLEAN DEFAULT false,
ADD COLUMN     "global_euro" BOOLEAN DEFAULT false,
ADD COLUMN     "limit_anticipacao_disponivel" TEXT DEFAULT 'Informação indisponível',
ADD COLUMN     "limit_cartao_aprovado" DECIMAL(15,2),
ADD COLUMN     "limit_cartao_utilizado" DECIMAL(15,2),
ADD COLUMN     "limit_cheque_aprovado" DECIMAL(15,2),
ADD COLUMN     "limit_cheque_utilizado" DECIMAL(15,2),
ADD COLUMN     "limit_parcelado_aprovado" DECIMAL(15,2),
ADD COLUMN     "limit_parcelado_utilizado" DECIMAL(15,2),
ADD COLUMN     "prod_boleto_cobranca" BOOLEAN DEFAULT false,
ADD COLUMN     "prod_boleto_dda" BOOLEAN DEFAULT false,
ADD COLUMN     "prod_c6_pay" BOOLEAN DEFAULT false,
ADD COLUMN     "prod_c6_tag" BOOLEAN DEFAULT false,
ADD COLUMN     "prod_chaves_pix" BOOLEAN DEFAULT false,
ADD COLUMN     "prod_debito_automatico" BOOLEAN DEFAULT false,
ADD COLUMN     "prod_link_pagamento" BOOLEAN DEFAULT false,
ADD COLUMN     "prod_multiplos_acessos" BOOLEAN DEFAULT false,
ADD COLUMN     "prod_seguros" BOOLEAN DEFAULT false,
ADD COLUMN     "prod_web_banking" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "custom_field_stage_configs" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "custom_field_stage_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_tabulation_triggers" (
    "id" TEXT NOT NULL,
    "tabulation" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_tabulation_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_stage_configs_field_id_stage_id_key" ON "custom_field_stage_configs"("field_id", "stage_id");

-- AddForeignKey
ALTER TABLE "custom_field_stage_configs" ADD CONSTRAINT "custom_field_stage_configs_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_stage_configs" ADD CONSTRAINT "custom_field_stage_configs_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tabulation_triggers" ADD CONSTRAINT "deal_tabulation_triggers_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tabulation_triggers" ADD CONSTRAINT "deal_tabulation_triggers_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
