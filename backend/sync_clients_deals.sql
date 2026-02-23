-- =================================================================================================
-- SCRIPT DE SINCRONIA: CLIENTES -> NEGÓCIOS (DEALS)
-- =================================================================================================
-- ESTE SCRIPT VERIFICA SE EXISTEM CLIENTES SEM NEGÓCIOS (DEALS) E OS CRIA AUTOMATICAMENTE.
-- OBJETIVO: GARANTIR QUE TODO CLIENTE TENHA UM CARD NO KANBAN.

-- 1. Identificar e Criar Negócios Faltantes
--    - Busca clientes que NÃO possuem registro na tabela 'deals'.
--    - Cria um negócio para cada um deles.
--    - Usa o PRIMEIRO Funil (Pipeline) e a PRIMEIRA Etapa (Stage) encontrados no banco como padrão.

WITH FirstPipeline AS (
    SELECT id FROM pipelines ORDER BY created_at ASC LIMIT 1
),
FirstStage AS (
    SELECT id FROM pipeline_stages 
    WHERE pipeline_id = (SELECT id FROM FirstPipeline) 
    ORDER BY order_index ASC 
    LIMIT 1
)
INSERT INTO deals (
    id, 
    title, 
    client_id, 
    stage_id, 
    pipeline_id, 
    responsible_id, 
    created_at, 
    updated_at,
    status
)
SELECT 
    gen_random_uuid(),               -- ID do novo negócio
    TRIM(c.name || ' ' || COALESCE(c.surname, '')), -- Título: Nome Completo do Cliente
    c.id,                            -- ID do Cliente
    (SELECT id FROM FirstStage),     -- ID da Etapa (Primeira etapa do primeiro funil)
    (SELECT id FROM FirstPipeline),  -- ID do Funil (Primeiro funil)
    c.created_by_id,                 -- Responsável (Mesmo criador do cliente)
    c.created_at,                    -- Data de criação (Mesma do cliente)
    NOW(),                           -- Data de atualização
    'OPEN'                           -- Status inicial (OPEN)
FROM clients c
WHERE NOT EXISTS (
    SELECT 1 FROM deals d WHERE d.client_id = c.id
);

-- 2. Verificação Pós-Execução
--    Retorna quantos negócios foram criados (ou se ainda existe algum cliente sem negócio).
SELECT count(*) as clientes_sem_negocio_restantes
FROM clients c
WHERE NOT EXISTS (
    SELECT 1 FROM deals d WHERE d.client_id = c.id
);
