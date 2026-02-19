-- Criação da tabela de Tabulações
CREATE TABLE "tabulations" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "target_stage_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabulations_pkey" PRIMARY KEY ("id")
);

-- Adicionar Foreign Key para PipelineStage (target_stage_id)
ALTER TABLE "tabulations" ADD CONSTRAINT "tabulations_target_stage_id_fkey" FOREIGN KEY ("target_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Inserir dados iniciais baseados no hardcode atual (para não começar vazio)
INSERT INTO "tabulations" ("id", "label", "updated_at") VALUES
(gen_random_uuid(), 'Aguardando abertura', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Retornar outro horário', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Conta aberta', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Sem interesse', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Inapto na Receita Federal', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Telefone Incorreto', CURRENT_TIMESTAMP),
(gen_random_uuid(), 'Recusado pelo banco', CURRENT_TIMESTAMP);
