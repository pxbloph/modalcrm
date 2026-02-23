-- SCRIPT DE MIGRAÇÃO: REMOÇÃO DE QUALIFICATIONS E CRIAÇÃO DE PRESETS --
-- ATENÇÃO: Execute no SQL Editor do Neon/PostgreSQL --

-- 1. Remover a tabela antiga (Dados já estão em 'clients')
DROP TABLE IF EXISTS "qualifications" CASCADE;

-- 2. Criar a nova tabela para Presets de Filtro do Kanban
CREATE TABLE "kanban_filter_presets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "config_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kanban_filter_presets_pkey" PRIMARY KEY ("id")
);

-- 3. Adicionar chave estrangeira para o usuário
ALTER TABLE "kanban_filter_presets" ADD CONSTRAINT "kanban_filter_presets_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Criar índice para performance de busca por usuário
CREATE INDEX "kanban_filter_presets_user_id_idx" ON "kanban_filter_presets"("user_id");

-- 5. Opcional: Limpeza de referências residuais (se existirem)
-- O campo tabulacao e outros já foram unificados na tabela 'clients'.
