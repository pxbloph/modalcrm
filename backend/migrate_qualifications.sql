-- Script de migração para copiar dados de Qualifications para Clients
-- Pegamos a ÚLTIMA (mais recente) qualificação para cada cliente.

UPDATE clients c
SET
    faturamento_mensal = q.faturamento_mensal,
    faturamento_maquina = q.faturamento_maquina,
    maquininha_atual = q.maquininha_atual,
    produto_interesse = q.produto_interesse,
    emite_boletos = q.emite_boletos,
    deseja_receber_ofertas = q.deseja_receber_ofertas,
    informacoes_adicionais = q.informacoes_adicionais,
    tabulacao = q.tabulacao,
    agendamento = q.agendamento,
    
    -- Dados Bancários
    cc_tipo_conta = q.cc_tipo_conta,
    cc_status = q.cc_status,
    cc_numero = q.cc_numero,
    cc_saldo = q.cc_saldo,
    cc_limite_utilizado = q.cc_limite_utilizado,
    cc_limite_disponivel = q.cc_limite_disponivel,

    -- Cartão
    card_final = q.card_final,
    card_status = q.card_status,
    card_tipo = q.card_tipo,
    card_adicionais = q.card_adicionais,
    card_fatura_aberta_data = q.card_fatura_aberta_data,
    card_fatura_aberta_valor = q.card_fatura_aberta_valor,

    -- Dados Globais
    global_dolar = q.global_dolar,
    global_euro = q.global_euro,

    -- Produtos
    prod_multiplos_acessos = q.prod_multiplos_acessos,
    prod_c6_pay = q.prod_c6_pay,
    prod_c6_tag = q.prod_c6_tag,
    prod_debito_automatico = q.prod_debito_automatico,
    prod_seguros = q.prod_seguros,
    prod_chaves_pix = q.prod_chaves_pix,
    prod_web_banking = q.prod_web_banking,
    prod_link_pagamento = q.prod_link_pagamento,
    prod_boleto_dda = q.prod_boleto_dda,
    prod_boleto_cobranca = q.prod_boleto_cobranca,

    -- Crédito
    credit_blocklist = q.credit_blocklist,
    credit_score_interno = q.credit_score_interno,
    credit_score_serasa = q.credit_score_serasa,
    credit_inadimplencia = q.credit_inadimplencia,

    limit_cartao_utilizado = q.limit_cartao_utilizado,
    limit_cartao_aprovado = q.limit_cartao_aprovado,
    limit_cheque_utilizado = q.limit_cheque_utilizado,
    limit_cheque_aprovado = q.limit_cheque_aprovado,
    limit_parcelado_utilizado = q.limit_parcelado_utilizado,
    limit_parcelado_aprovado = q.limit_parcelado_aprovado,
    limit_anticipacao_disponivel = q.limit_anticipacao_disponivel

FROM (
    SELECT DISTINCT ON (client_id) *
    FROM qualifications
    ORDER BY client_id, created_at DESC
) q
WHERE c.id = q.client_id;
