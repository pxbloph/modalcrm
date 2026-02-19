-- 1. Review what will overlap (SELECT)
-- This query shows deals that ARE in a different stage than their tabulation dictates
SELECT 
    d.id as deal_id, 
    d.title as deal_title,
    d.stage_id as current_stage,
    t.target_stage_id as expected_stage,
    t.label as tabulation_label,
    c.name as client_name
FROM deals d
JOIN clients c ON d.client_id = c.id
-- Get the LATEST qualification for the client
JOIN LATERAL (
    SELECT q.tabulacao, q.created_at
    FROM qualifications q
    WHERE q.client_id = d.client_id
    ORDER BY q.created_at DESC
    LIMIT 1
) q_latest ON true
-- Join with Tabulations to get the target stage
JOIN tabulations t ON q_latest.tabulacao = t.label
WHERE 
    d.status = 'OPEN' -- Only open deals
    AND t.target_stage_id IS NOT NULL -- Tabulation has a mapping
    AND d.stage_id != t.target_stage_id; -- Stage is different


-- 2. Execute Migration (UPDATE)
-- WARNING: This will move all matching deals to their new stages.
UPDATE deals d
SET stage_id = t.target_stage_id,
    updated_at = NOW()
FROM clients c,
     tabulations t,
     (
         SELECT client_id, tabulacao
         FROM (
             SELECT 
                 client_id, 
                 tabulacao,
                 ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at DESC) as rn
             FROM qualifications
         ) q_ranked
         WHERE rn = 1
     ) q_latest
WHERE 
    d.client_id = c.id
    AND d.client_id = q_latest.client_id
    AND q_latest.tabulacao = t.label
    AND d.status = 'OPEN'
    AND t.target_stage_id IS NOT NULL
    AND d.stage_id != t.target_stage_id;
