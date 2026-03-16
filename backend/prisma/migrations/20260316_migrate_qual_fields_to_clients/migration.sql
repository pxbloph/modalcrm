-- Migration: Move qualification fields from qualifications → clients
-- Safe: uses IF NOT EXISTS — won't break if some columns already exist manually.

-- ====================================================
-- 1. Basic Qualification Fields
-- ====================================================
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "faturamento_mensal"       DECIMAL(15,2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "faturamento_maquina"      DECIMAL(15,2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "maquininha_atual"         TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "produto_interesse"        TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "emite_boletos"            BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "deseja_receber_ofertas"   BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "informacoes_adicionais"   TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "tabulacao"                TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "agendamento"              TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "account_opening_date"     TIMESTAMP(3);

-- ====================================================
-- 2. Conta Corrente
-- ====================================================
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "cc_tipo_conta"            TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "cc_status"                TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "cc_numero"                TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "cc_saldo"                 DECIMAL(15,2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "cc_limite_utilizado"      DECIMAL(15,2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "cc_limite_disponivel"     DECIMAL(15,2);

-- ====================================================
-- 3. Cartão de Crédito
-- ====================================================
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "card_final"               TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "card_status"              TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "card_tipo"                TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "card_adicionais"          INTEGER;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "card_fatura_aberta_data"  TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "card_fatura_aberta_valor" DECIMAL(15,2);

-- ====================================================
-- 4. Conta Global
-- ====================================================
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "global_dolar"             BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "global_euro"              BOOLEAN DEFAULT false;

-- ====================================================
-- 5. Outros Produtos
-- ====================================================
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prod_multiplos_acessos"   BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prod_c6_pay"              BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prod_c6_tag"              BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prod_debito_automatico"   BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prod_seguros"             BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prod_chaves_pix"          BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prod_web_banking"         BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prod_link_pagamento"      BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prod_boleto_dda"          BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "prod_boleto_cobranca"     BOOLEAN DEFAULT false;

-- ====================================================
-- 6. Limites e Crédito
-- ====================================================
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "credit_blocklist"             BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "credit_score_interno"         TEXT DEFAULT 'Informação indisponível';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "credit_score_serasa"          TEXT DEFAULT 'Informação indisponível';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "credit_inadimplencia"         TEXT DEFAULT 'Em dia';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "limit_cartao_utilizado"       DECIMAL(15,2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "limit_cartao_aprovado"        DECIMAL(15,2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "limit_cheque_utilizado"       DECIMAL(15,2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "limit_cheque_aprovado"        DECIMAL(15,2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "limit_parcelado_utilizado"    DECIMAL(15,2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "limit_parcelado_aprovado"     DECIMAL(15,2);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "limit_anticipacao_disponivel" TEXT DEFAULT 'Informação indisponível';

-- ====================================================
-- 7. Responsabilidade / Contato
-- ====================================================
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "last_contact_user_id" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "last_contact_at"      TIMESTAMP(3);

-- FK para last_contact_user_id (adiciona apenas se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clients_last_contact_user_id_fkey'
  ) THEN
    ALTER TABLE "clients"
      ADD CONSTRAINT "clients_last_contact_user_id_fkey"
      FOREIGN KEY ("last_contact_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
