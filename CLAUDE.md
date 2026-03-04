# Modal CRM — Guia de Desenvolvimento

## Visão Geral do Projeto

CRM web em produção para gestão de leads, pipeline de vendas e operações bancárias.
O código já existe e está em funcionamento. **Toda alteração deve partir de análise prévia do código existente.**

---

## Ambientes

| Ambiente | Local |
|---|---|
| Desenvolvimento | `localhost` |
| Produção | VPS Linux Ubuntu 24.04 — `modal.mbfinance.com.br` |

---

## Arquitetura

```
mbforms/
├── backend/    NestJS + Prisma ORM  → porta 3500
├── frontend/   Next.js 16 + React 19 → porta 3600
└── prisma/     Schema PostgreSQL
```

### Stack
- **Backend**: NestJS 10, Prisma 5.21.0, PostgreSQL, Socket.io, JWT
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Radix UI
- **Infra**: Nginx (reverse proxy + SSL Let's Encrypt)

---

## VPS de Produção

> **ALERTA: VPS COMPARTILHADA** — outros sites críticos estão hospedados aqui.

**Sites vizinhos:**
- `maquininhaagora.com.br`
- `portal.mbfinance.com.br`
- `rh.mbfinance.com.br`

**Regras de ouro:**
- **NUNCA** reiniciar Nginx sem validar com `nginx -t` antes
- **NUNCA** apagar configurações padrão do Nginx
- **NUNCA** fazer deploy automático

**Config Nginx:** `/etc/nginx/sites-available/modalcrm`
**Caminho do projeto:** `/var/www/modalcrm`

---

## Regras de Desenvolvimento

### Obrigatórias
1. **Analisar o código existente antes de qualquer alteração.**
2. Nunca recriar estruturas, telas ou fluxos que já existam.
3. Toda mudança deve ser incremental e compatível com a arquitetura atual.
4. Manter consistência entre Dashboard, Kanban, Tela do Cliente e Qualificação.
5. Confirmar com o usuário se a alteração funcionou antes de documentar.

### Restrição de Operador
Os campos, fluxos e visualizações da tela do Operador (`role === 'OPERATOR'`) **não devem ser alterados** sem ordem explícita do usuário.

### Banco de Dados
- **NUNCA executar comandos diretamente no banco.**
- Sempre fornecer scripts SQL para revisão e execução manual.
- Prisma deve estar na versão `5.21.0`.
- Sempre rodar `npx prisma generate` antes de buildar o backend.

### Build e Deploy
- Código vai ao GitHub **somente após validação bem-sucedida**.
- Confirmar com o usuário antes de qualquer push.

---

## Estrutura de Rotas

### Frontend (`/frontend/app/`)

| Rota | Descrição |
|---|---|
| `/login` | Autenticação |
| `/(main)/kanban` | Pipeline de negócios (Kanban) |
| `/(main)/new-client` | Cadastro de novo cliente |
| `/(main)/users` | Gestão de usuários (Admin/Supervisor) |
| `/(main)/chat` | Mensagens internas |
| `/(main)/reports` | Relatórios e analytics |
| `/(main)/api-keys` | Gestão de chaves de API (somente Admin) |
| `/tv/dashboard` | Painel TV — performance diária |
| `/tv/supervisor` | Painel Supervisor — operadores em tempo real |

### Backend — Endpoints Principais

| Módulo | Endpoints |
|---|---|
| Auth | `POST /auth/login` |
| Clients | `GET/POST/PUT /clients`, `GET /clients/tabulations` |
| Deals | `GET/POST/PATCH /deals` |
| Kanban | `PATCH /deals/:id/stage` |
| Dashboards TV | `GET /dashboards/tv/contas-abertas`, `GET /dashboards/tv/v2-metrics` |
| Webhooks | `POST /webhooks/n8n/clients` (requer `x-api-key`) |
| Kanban Prefs | `GET/PUT /kanban-preferences` |

---

## Regras de Negócio

### Papéis de Usuário
- `ADMIN` — acesso total
- `SUPERVISOR` — gestão de operadores, aprovações de transferência
- `LEADER` — acesso intermediário
- `OPERATOR` — operações de front (tela restrita)

### Travas de Integração
- **Trava de Fase (Kanban)**: Negócios sem `integration_status = "Cadastro salvo com sucesso!"` só podem ir para `"Novos Leads"` ou `"Inaptos"`.
- **Trava de Tabulação**: Clientes sem integração só aceitam tabulações de descarte: `"Outro ECE"`, `"Recusado pelo banco"`, `"Sem interesse"`, `"Telefone Incorreto"`, `"Já possui conta"`.

### Transferência de Leads
- Operadores e Líderes **não podem** usar bypass/takeover direto — gera solicitação pendente para o Supervisor.
- Aprovação do Supervisor sincroniza `created_by_id` no cliente **e** `responsible_id` em todos os deals abertos.
- Bloqueio `409` ao tentar auto-transferência (usuário já é dono).

### Cadastro de Clientes
- **Operadores**: cliente vinculado automaticamente ao operador logado.
- **Admin/Supervisor**: campos extras — `Responsável` e `Tabulação`. Backend valida role antes de aceitar override de `created_by`.
- Flag `skip_auto_deal` controla criação automática de card no Kanban.

### Duplicidade de Leads
- Verificação por CNPJ antes de criar novo cliente.

---

## Dashboards TV e Supervisor

### TV Dashboard (`/tv/dashboard` e `/tv/dashboard-v2`)
- Atualização automática a cada **60 segundos**
- **Métrica principal**: `Conta aberta` — definida por:
  - `tabulacao = "Conta aberta"`
  - `integration_status = "Cadastro salvo com sucesso!"`
  - `account_opening_date = HOJE` (fuso `America/Sao_Paulo`)
- **Ponto de conversão**: vai para o `responsible_id` do Deal, não para o `created_by_id` do Client
- Inclui cargos `LEADER`, `ADMIN`, `SUPERVISOR` se `is_active = true`

### Painel Supervisor (`/tv/supervisor`)
- Lista **todos** os operadores ativos, inclusive os com zero contas
- Drill-down por clique no operador: tabela com Nome, CNPJ, Telefone, Criador, Responsável, Data de Abertura
- Endpoint: `GET /dashboards/tv/contas-abertas?date=YYYY-MM-DD`

---

## Fuso Horário

- Backend roda em `TZ=America/Sao_Paulo` (definido em `main.ts`)
- Datas de filtro usam offset `-03:00` (não UTC `Z`)
- Helper `parseDateSafe` em `clients.service.ts`:
  - Data com hora → preserva hora original
  - Data pura (`YYYY-MM-DD`) → força `T12:00:00-03:00` para evitar shift de dia

---

## Módulos e Qualificações

- A tabela `qualifications` foi **descontinuada**. Todos os campos vivem diretamente na tabela `clients`.
- Rota `GET /clients/tabulations` deve estar declarada **antes** de `GET /clients/:id` no controller.
- Componentes `ClientDealModal`, `ClientFilters` e `ClientRegistrationForm` usam `/clients/tabulations`.
- Nenhuma parte do sistema deve referenciar `qualifications` ou `client.qualifications`.

---

## Kanban — Persistência de Preferências

- Tabela `user_kanban_preferences` salva por usuário/pipeline:
  - Modo de visualização (Board / Lista)
  - Tamanho da página (`pageSize`)
  - Campos visíveis nos filtros
  - Filtros aplicados (persistem após refresh/login)
- Filtros usam estado de "rascunho" — dados só recarregam ao clicar **Pesquisar** ou pressionar **Enter**

---

## Integração Externa (Webhooks / API Keys)

- **Endpoint de entrada**: `POST /webhooks/n8n/clients` — cria Client + Deal
- **Autenticação**: header `x-api-key` validado via model `ApiKey` no banco
- **Gestão de chaves**: somente `ADMIN` pode acessar `/api-keys`
- Chave gerada com prefixo `mbf_`, visualizável **uma única vez** após criação
- Tracking silencioso de `last_used_at`

---

## Histórico de Negócios (Deal Modal)

- Aba "Histórico" no `ClientDealModal` registra:
  - Mudanças de etapa (De → Para)
  - Alterações de responsável
  - Edição de campos (Valor, Título, Status)
  - Autor da alteração ("Por: [Nome]")
  - Criação do negócio ("Negócio criado" + "Por: [Nome]")
- Ações automáticas ou legadas aparecem como "Por: Sistema"

---

## UI/UX — Padrões Visuais

### Temas e Cores
| Variável | Light | Dark |
|---|---|---|
| Background | `#F5F7FA` | `#1A1C1F` |
| Cards/Popovers | `#FFFFFF` | — |
| Primária | `#26FF38` (Verde Neon) | `#26FF38` |
| Texto Principal | `#1A1C1F` | — |
| Texto Muted | `#98A0A9` | — |

### Logos
- **Light Mode**: `logo_Logo_black.svg`
- **Dark Mode**: `logo_logo_white.svg`
- Dimensões: `w-28+` desktop, `w-40` sidebar mobile

### Kanban
- Colunas com `bg-secondary/50` para contraste no modo claro
- Espaçamento `gap-2` para maior densidade
- Scrollbars finas e customizadas

### CSS
Variáveis globais gerenciadas em `frontend/app/globals.css`:
`--primary`, `--background`, `--sidebar`, `--scroll-track`, etc.

---

## Paths Importantes

```
backend/
  src/main.ts                          → TZ + bootstrap
  src/app.module.ts                    → Registro de módulos
  src/clients/clients.service.ts       → Lógica de leads/clientes
  src/deals/deals.service.ts           → Lógica de negócios/kanban
  src/deals/kanban.gateway.ts          → WebSocket Kanban
  src/chat/chat.gateway.ts             → WebSocket Chat
  src/modules/audit/audit.service.ts   → Sistema de auditoria
  prisma/schema.prisma                 → Schema do banco

frontend/
  app/layout.tsx                       → Layout raiz
  app/(main)/layout.tsx                → Layout autenticado
  app/(main)/kanban/page.tsx           → Página Kanban
  components/crm/ClientDealModal/      → Modal principal de negócios
  components/chat/                     → Sistema de chat
  lib/api.ts                           → Cliente HTTP base
  app/globals.css                      → Variáveis CSS globais
```

---

## Checklist de Operação

Antes de qualquer implementação:
- [ ] Revisar o código existente na área de alteração
- [ ] Verificar fluxos e regras de negócio já aplicadas
- [ ] Garantir compatibilidade com papéis de usuário
- [ ] Testar localmente antes de propor qualquer mudança
- [ ] Confirmar funcionamento com o usuário antes de documentar
