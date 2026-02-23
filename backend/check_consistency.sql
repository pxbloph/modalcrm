    -- =================================================================================================
    -- SCRIPT DE VERIFICAÇÃO DE CONSISTÊNCIA
    -- =================================================================================================
    -- Execute este script para confirmar se TODOS os clientes possuem um negócio (deal) vinculado.

    SELECT 
        COUNT(*) AS total_clientes,
        COUNT(d.id) AS total_negocios_vinculados,
        COUNT(*) - COUNT(d.id) AS divergencias
    FROM clients c
    LEFT JOIN deals d ON c.id = d.client_id;

    -- LISTA DETALHADA DE CLIENTES SEM NEGÓCIO (SE HOUVER)
    SELECT 
        c.id AS client_id,
        c.name,
        c.surname,
        c.email,
        c.created_at
    FROM clients c
    LEFT JOIN deals d ON c.id = d.client_id
    WHERE d.id IS NULL;
