-- =========================================================================================
-- SCRIPT MANUAL: CRIAÇÃO DE TABELAS PARA IMPORTAÇÃO EM MASSA
-- Motivo: Controle de jobs de importação e rastreamento de quem executou.
-- =========================================================================================

-- 1. Tabela de Jobs de Importação
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- Ex: 'OPEN_ACCOUNTS'
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    file_name VARCHAR(255) NOT NULL,
    total_records INT DEFAULT 0,
    processed_records INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    -- Rastreamento de quem importou
    created_by_id TEXT NOT NULL,
    CONSTRAINT fk_import_user FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON DELETE RESTRICT
);

-- 2. Tabela de Resultados da Importação (Log linha a linha)
CREATE TABLE IF NOT EXISTS public.import_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    row_data JSONB, -- Dados originais da linha (ex: {"cnpj": "..."})
    status VARCHAR(20) NOT NULL, -- UPDATED, NOT_FOUND, INVALID, DUPLICATE, ERROR
    message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_result_job FOREIGN KEY (job_id) REFERENCES public.import_jobs(id) ON DELETE CASCADE
);

-- 3. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON public.import_jobs(created_by_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_results_job ON public.import_results(job_id);
