import { z } from "zod";

export const clientSchema = z.object({
    name: z.string().min(1, "Nome/Razão Social é obrigatório"),
    surname: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().optional(),
    cnpj: z.string().optional(),
    integration_status: z.string().optional(),
    is_qualified: z.boolean().optional().default(false),
    has_open_account: z.boolean().optional().default(false),
});

export const qualificationSchema = z.object({
    tabulacao: z.string().optional(),
    faturamento_mensal: z.string().optional(), // Mantendo como string para input mask se necessário, ou usar coerce.number
    faturamento_maquina: z.string().optional(),
    maquininha_atual: z.union([z.string(), z.array(z.string())]).optional(),
    produto_interesse: z.string().optional(),
    emite_boletos: z.boolean().optional().default(false),
    deseja_receber_ofertas: z.boolean().optional().default(false),
    informacoes_adicionais: z.string().optional(),
    agendamento: z.string().optional().nullable(),
    account_opening_date: z.string().optional().nullable(),

    // Read-only fields (apenas para exibição se necessário, mas o form pode ignorar)
});

export const dealSchema = z.object({
    title: z.string().min(1, "Título é obrigatório"),
    value: z.number().optional().nullable(),
    pipeline_id: z.string().min(1, "Pipeline é obrigatório"),
    tag_ids: z.array(z.string()).default([]),
    user_id: z.string().optional().nullable(),
});

// Schema unificado para o formulário completo
export const clientDealFormSchema = z.object({
    client: clientSchema,
    qualification: qualificationSchema,
    deal: dealSchema.optional(), // Opcional pois pode ser apenas edição de cliente
    custom_fields: z.record(z.string(), z.any()).optional(),
});

export type ClientDealFormValues = z.infer<typeof clientDealFormSchema>;
