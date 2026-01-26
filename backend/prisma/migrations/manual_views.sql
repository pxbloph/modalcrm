-- =========================================================================================
-- SCRIPT MANUAL DE CRIAÇÃO DE VIEWS E ÍNDICES PARA O MÓDULO DE RELATÓRIOS
-- REVISAR E EXECUTAR MANUALMENTE NO EDITOR SQL
-- =========================================================================================

-- IMPORTANTE: Certifique-se de que está conectado ao banco de dados correto (ex: mbforms)
-- e que as tabelas 'clients', 'users' e 'qualifications' existem no schema 'public'.

-- Define o schema padrão como public para evitar erros de caminho
SET search_path TO public;

-- 1. Criação da View Base para Relatórios
CREATE OR REPLACE VIEW public.view_reports_base AS
SELECT 
    c.id AS client_id,
    c.name AS client_name,
    c.cnpj,
    c.created_at AS client_created_at,
    c.integration_status,
    c.is_qualified,
    c.has_open_account,
    
    -- Extração de dados do JSON (Answers)
    COALESCE(c.answers->>'origem', c.answers->>'utm_source', 'Desconhecido') AS origin,
    COALESCE(c.answers->>'campanha', c.answers->>'campaign', c.answers->>'utm_campaign', 'Desconhecido') AS campaign,

    -- Dados da Qualificação
    q.id AS qualification_id,
    q.created_at AS qualification_created_at,
    q.fase,
    q.tabulacao,
    q.faturamento_mensal,
    
    -- Dados do Operador
    u.id AS operator_id,
    u.name AS operator_name,
    u.email AS operator_email,
    u.supervisor_id,
    
    -- Cálculo de TMA (minutos)
    EXTRACT(EPOCH FROM (q.created_at - c.created_at)) / 60 AS response_time_minutes

FROM public.clients c
LEFT JOIN public.qualifications q ON q.client_id = c.id
LEFT JOIN public.users u ON c.created_by_id = u.id;

-- =========================================================================================

-- 2. Criação de Índices para Performance
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at);
CREATE INDEX IF NOT EXISTS idx_qualifications_created_at ON public.qualifications(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by_id);
CREATE INDEX IF NOT EXISTS idx_clients_answers ON public.clients USING GIN (answers);

-- =========================================================================================
-- DICA: Se o erro "relation does not exist" persistir, execute o comando abaixo para listar as tabelas:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
