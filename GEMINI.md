Este projeto é um **CRM web já existente**, em produção, com código versionado em GitHub e hospedado em uma VPS Linux.  
O Antigravity deve sempre assumir que **o sistema já está em funcionamento** e que qualquer alteração deve respeitar o estado atual do código.

### Ambientes

- **Homologação / Desenvolvimento**
  - Ambiente local (localhost)

- **Produção**
  - VPS Linux (Ubuntu 24.04)

O código **só deve ser enviado ao GitHub após implementação validada com sucesso**.

### Servidor de Produção (VPS COMPARTILHADA)

**⚠️ ALERTA CRÍTICO: VPS MULTI-SITE ⚠️**
Esta VPS hospeda múltiplos sites críticos além do Modal. **NUNCA** reinicie o Nginx sem validar (`nginx -t`) e **NUNCA** apague configurações padrão.

**Sites Vizinhos Conhecidos:**
- maquininhaagora.com.br (Site Principal)
- portal.mbfinance.com.br
- rh.mbfinance.com.br

**Configuração Nginx (Modal CRM):**
Arquivo: `/etc/nginx/sites-available/modalcrm`
Link: `/etc/nginx/sites-enabled/modalcrm`

```nginx
server {
    listen 80;
    server_name modal.mbfinance.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name modal.mbfinance.com.br;

    ssl_certificate /etc/letsencrypt/live/modal.mbfinance.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/modal.mbfinance.com.br/privkey.pem;

    # Frontend Next.js (3600)
    location / {
        proxy_pass http://localhost:3600;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend (3500)
    location /api/ {
        proxy_pass http://localhost:3500;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket Chat (3500) - CRÍTICO
    location /socket.io/ {
        proxy_pass http://localhost:3500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

- Caminho do projeto: `/var/www/modalcrm`
- Backend: porta `3500`
- Frontend: porta `3600`
- Dominio: modal.mbfinance.com.br


## Regras de Atuação no Código (Obrigatórias)

- O código **já existe** e deve ser **analisado antes de qualquer alteração**.
- **Nunca recriar estruturas, telas ou fluxos do zero** se já existirem.
- **RESTRIÇÃO OPERADOR**: Os campos, fluxos e a visualização da tela do Operador (`role === 'OPERATOR'`) **NUNCA** devem ser alterados sem uma ordem direta e explícita do usuário.
- Toda mudança deve ser:
  - Incremental
  - Compatível com a arquitetura atual
  - Consistente com padrões e nomenclaturas existentes
- Frontend, backend e banco de dados **já estão integrados**.
- Evitar retrabalho, duplicidade de lógica ou comportamentos divergentes.
- **VALIDAÇÃO E REGISTRO**: Após qualquer modificação relevante, confirme com o usuário se funcionou corretamente. Somente após a confirmação positiva, registre no arquivo `GEMINI.md` exatamente o que foi alterado. Sempre pergunte para validar antes de documentar.

O estado atual do código deve ser considerado **a verdade absoluta**.

## Banco de Dados (Regras Rígidas)

- **Nunca executar comandos diretamente no banco de dados**.
- Sempre fornecer **somente scripts SQL**, formatados, para:
  - Revisão manual
  - Execução manual via SQL Editor
- Não simular execuções automáticas.
- Não aplicar alterações diretas no banco.

## Objetivo das Intervenções

- Corrigir, ajustar ou evoluir o código existente.
- Manter consistência total entre:
  - Dashboard
  - Kanban
  - Tela do Cliente
  - Qualificação
- Garantir que uma mesma entidade (lead/cliente) tenha:
  - Mesma tela
    - O Prisma deve estar na versão 5.21.0.
    - As qualificações/tabulações agora residem diretamente na tabela `clients`.
    - Sempre rodar 'npx prisma generate' antes de buildar o backend.
  - Mesmo comportamento
  - Mesmas regras, independentemente do ponto de acesso.

## Regra Final de Operação

Antes de iniciar qualquer implementação, o Antigravity deve:
- Revisar o código existente
- Revisar fluxos atuais
- Revisar regras de negócio já aplicadas

Somente após essa análise, qualquer edição ou sugestão de mudança deve ser proposta.


## Dashboard TV (Performance Diária)

Um dashboard exclusivo para exibição em TV (FullHD 1920x1080), sem interação do usuário, focado em performance diária.

### Dashboard TV V2 (Expandido + Tema Laranja)
Versão alternativa com métricas de funil simplificadas e identidade visual customizada (Laranja).
- **URL**: `/tv/dashboard-v2`
- **Métricas**:
  - `Leads Criados`: Novos cadastros no dia (`created_at`).
  - `Contas Abertas`: `account_opening_date` = HOJE.
  - `Conversão`: Contas Abertas / Leads Criados.
- **Endpoint**: `GET /dashboards/tv/v2-metrics`
- **Features**: Seletor de Tema (Dark/Light).

### Regras de Negócio
- **Métrica Principal**: "Contas Abertas"
- **Definição Técnica**: 
  - `account_opening_date` do associada igual a HOJE (Server Time).
  - O lead deve ter a `tabulacao` = "Conta aberta".
  - O lead deve obrigatoriamente ter o `integration_status` = "Cadastro salvo com sucesso!".
  - O **ponto de conversão vai para o DONO DO NEGÓCIO (`responsible_id` do Deal no Kanban)**, ignorando o puxador do lead original (`created_by_id` do Client). 
  - Atualização automática a cada 60 segundos.

### Endpoint
- `GET /dashboards/tv/contas-abertas?date=YYYY-MM-DD`
- Retorno: `{ total_open_accounts, ranking: [], updated_at }`

### URL de Acesso
- Frontend: `/tv/dashboard`
- Rota protegida (requer login de usuário com permissão de visualização, geralmente Supervisor/Admin, ou Token futuramente).

## Padrões de Interface (UI/UX) - Atualizado (20/02/2026)

### Temas e Cores
- **Tema Light (Novo)**: 
  - Base: `#F5F7FA` (Background), `#FFFFFF` (Cards/Popovers).
  - Primária: `#26FF38` (Verde Neon).
  - Texto: `#1A1C1F` (Títulos), `#98A0A9` (Muted).
  - Scrollbar: Track `#E9ECEF`, Thumb `#C7CBD1`.
- **Tema Dark**:
  - Base: `#1A1C1F` ou similar (Dark Mode Premium).
  - Primária: `#26FF38`.
  - Scrollbar: Track Dark, Thumb Green.

### Componentes Específicos
- **Kanban**:
  - Colunas com fundo semitransparente (`bg-secondary/50`) para contraste no modo claro.
  - Espaçamento reduzido (`gap-2`) para maior densidade de informação.
  - Scrollbars finas e customizadas.
- **Logotipos**:
  - **Light Mode**: Usa `logo_Logo_black.svg`.
  - **Dark Mode**: Usa `logo_logo_white.svg`.
  - **Dimensões**: Ajustadas para maior destaque (`w-28`+ no desktop, `w-40` no mobile sidebar).

### Variáveis Globais (CSS)
As cores são gerenciadas via variáveis CSS (`--primary`, `--background`, `--sidebar`, `--scroll-track`, etc.) em `app/globals.css`, permitindo fácil manutenção e suporte a temas.

## Novo Fluxo de Negócios (20/02/2026)

### Kanban
- O botão **"Novo Negócio"** não abre mais modal, redireciona para `/new-client`.
- Objetivo: Centralizar a criação de clientes e negócios em uma única tela completa.

### Cadastro de Clientes (/new-client)
- **Operadores**: Fluxo simplificado. O cliente criado é automaticamente vinculado ao operador logado.
- **Admins e Supervisores**:
  - Exibição de campos extras: **Responsável** (obrigatório) e **Tabulação**.
  - Permite criar clientes/negócios em nome de outros usuários.

### Backend (Regras de Criação)
- Endpoint `POST /clients` aceita `created_by_id` e `tabulacao` no payload.
- **Segurança**: O backend valida se o usuário tem role `ADMIN` ou `SUPERVISOR` antes de aceitar o override de `created_by`. Caso contrário, ignora e usa o ID do usuário logado.
- **Prevenção de Duplicidade**: Implementada flag `skip_auto_deal` no backend para controle granular da criação automática de cards no Kanban.

## Atualizações Recentes (20/02/2026) - Performance e Histórico

### Histórico do Negócio (Deal Modal)
- **Nova Aba "Histórico"**: Adicionada ao modal de detalhes do negócio (`ClientDealModal`).
- **Log Detalhado**:
  - Mudanças de Etapa (De -> Para)
  - Alterações de Responsável
  - Edição de Campos (Valor, Título, Status)
  - Registro de quem fez a alteração ("Por: [Nome]").
- **Log de Criação**: Novos negócios agora registram explicitamente quem os criou ("Negócio criado" + "Por: [Nome]").
- **Fallback**: Ações automáticas ou legadas aparecem como "Por: Sistema".

### Unificação de Tabulações e Qualificações
- **Estrutura de Dados**: A tabela `qualifications` foi descontinuada e todos os seus campos (faturamento, maquininha, agendamento, etc.) foram mesclados diretamente na tabela `clients`.
- **Roteamento Global**: Todas as rotas que anteriormente usavam `/qualifications/*` foram redirecionadas para `/clients/*`.
  - **Shadowing de Rota**: A rota `GET /clients/tabulations` deve obrigatoriamente estar declarada **antes** de `GET /clients/:id` no controlador para evitar que o NestJS interprete "tabulations" como um ID.
  - **Busca de Opções**: Use `GET /clients/tabulations` para buscar a lista de tabulações ativas. Retorna um array de objetos (e.g., `{ label, is_active }`) que deve ser mapeado para strings no frontend.
  - **Salvamento**: Use `PUT /clients/:id` para atualizar dados de qualificação e tabulação.
- **Frontend**: Componentes como `ClientDealModal`, `ClientFilters` e `ClientRegistrationForm` devem usar o endpoint `/clients/tabulations` e realizar o mapeamento dinâmico dos labels.
- **Limpeza Global**: Nenhuma parte funcional do sistema deve referenciar a tabela legada `qualifications` ou tentar acessar o array `client.qualifications`. Todos os dados de qualificação (faturamento, maquininha, agendamento, etc.) são propriedades diretas do objeto `client`.

### Persistência e Controle de Filtros (Kanban) - 24/02/2026
- **Persistência de Preferências**: Implementada a tabela `user_kanban_preferences`. O sistema agora salva e restaura automaticamente por usuário/pipeline:
  - Modo de Visualização (`Board` vs `Lista`).
  - Tamanho da página (`pageSize`).
  - Campos visíveis na barra de filtros.
  - Filtros aplicados (mantidos após refresh/login).
- **Controle de Reload (Draft Filters)**:
  - Mudança no comportamento de filtragem: Alterações nos filtros ou na busca agora utilizam um estado de "rascunho".
  - O recarregamento dos dados só ocorre após ação explícita: clicar em **"Pesquisar"** ou pressionar **"Enter"**.
  - Evita requisições excessivas ao backend e recarregamentos indesejados durante a configuração de filtros complexos.
- **Backend**: Endpoint `GET/PUT /kanban-preferences` gerencia a persistência via Prisma.

## Painel do Supervisor (26/02/2026 e 27/02/2026)

Um painel derivado do Dashboard da TV, porém voltado para exibição do volume de contas abertas por CADA operador em tempo real.
- **Diferença pro Display da TV**: Em vez de mostrar um Top 10 e esconder os demais, o Painel do Supervisor exibe explicitamente **todos** os operadores ativos (incluindo os zerados) no formato de **Lista Vertical**.
- **Visualização Detalhada (Drill-down)**: Em 27/02/2026 foi implementada uma tabela modal acessível ao clicar no card do operador. Esta tabela lista individualmente os dados das clientes abertas daquele operador (Nome, CNPJ, Telefone, Usuário Criador, Usuário Responsável e Data Exata de Abertura).
- **Regras**: Baseado no backend do TV Dashboard, mas injetando os operadores ativos no mapa em memória com valor "0" inicialmente, garantindo a visualização da improdutividade/zerados.
- **Endpoint**: Utiliza os mesmos endpoints do Dashboard TV listados acima (`GET /dashboards/tv/contas-abertas`).
- **Data Payload Extra**: O endpoint agora varre a tabela de clients em modo reverso de inner-join e traz arrays completos de `clients` no resposne de `$ranking[x].clients` contendo inclusive o extrato explícito do `created_by` (Criador do Lead) e o responsável pelo card na hora do fechamento.
- **URL Frontend**: `/tv/supervisor`

### NUNCA FAÇA DEPLOY AUTOMATICO!

## Correção de Fuso Horário (26/02/2026)

- **Problema Anterior**: Filtros de data no Kanban (`deals.service.ts`) e Clientes (`clients.service.ts`), assim como a tela da TV (`tv-dashboard.service.ts`), sofriam com divergências nos totais de contas abertas/leads porque parte das consultas empurrava as datas para o fuso UTC ("Z"), causando cortes em vendas que ocorriam à noite no Brasil.
- **Solução Implementada**:
  - O NodeJS agora é forçado a rodar em `America/Sao_Paulo` por meio da variável `process.env.TZ = 'America/Sao_Paulo';` inserida no `main.ts`.
  - Remoção de lógicas compensatórias de 27 horas na TV Dashboard. O dashboard da TV agora pesquisa de `00:00:00.000-03:00` até `23:59:59.999-03:00` do mesmo dia.
  - Correção na montagem de filtros do prisma em `clients.service.ts` e `deals.service.ts`, convertendo fechamentos forçados em `Z` (UTC) para strings com offset `-03:00`, garantindo captação do tempo exato do Brasil.
  - **Date Parsing (26/02/2026):** Implementado o helper `parseDateSafe` no `clients.service.ts`. Quando o frontend envia uma data com horário exato (`ex: 2026-02-26 17:40`), o sistema preserva a hora inserida pelo operador. Quando o frontend envia dados de um calendário simples em data pura (`YYYY-MM-DD` ou `T00:00:00Z`), o backend intercepta e força o offset para `T12:00:00-03:00` (meio-dia de Brasília) para evitar que o Node/Prisma realize o shift do UTC e salve a entrada como sendo do dia anterior (-3h).
- **Dica Banco de Dados**: Foi orientado executar `ALTER DATABASE [nome] SET timezone TO 'America/Sao_Paulo';` para exibir os timestamps sincronizados na ferramenta local (SQL Editor).

## Travas Sistêmicas de Integração (26/02/2026)

Para garantir integridade da carteira, os sistemas validam se o contato teve sucesso nos fluxos do Banco Central antes de permitir avanços lógicos:

- **Trava de Fase (Kanban)** (`deals.service.ts`): Negócios onde o cliente não possui `integration_status` de "Cadastro salvo com sucesso!" **não podem** ser movidos para nenhuma fase da esteira fora das zonas de quarentena. As ÚNICAS fases liberadas para clientes sem aprovação bancária completa são: `"Novos Leads"` e `"Inaptos"`. Retorna popups de alerta com o erro específico.
- **Trava de Tabulação (Minha Carteira)** (`clients.service.ts`): Clientes sem o `integration_status` de sucesso não podem receber tabulações positivas (como `"Conta aberta"`). Eles estão restritos a uma **Whitelist de Descartes**, sendo apenas permitido marcá-los como: `"Outro ECE"`, `"Recusado pelo banco"`, `"Sem interesse"`, `"Telefone Incorreto"` e `"Já possui conta"`.

## Pontuação de Hierarquias na TV Dashboard (26/02/2026)
- Os painéis da TV e de Supervisor não excluem mais as vendas realizadas por contas diferentes de `OPERATOR`. A listagem ativa agora abrange cargos superiores, permitindo que líderes (LEADER), administradores e supervisores ranqueiem e marquem pontos normalmente desde que a flag `is_active` seja verdadeira.

## Lógica de Transferência de Leads e Kanban (27/02/2026)

Para garantir que a carteira de clientes e o Kanban nunca fiquem dessincronizados, foi reforçado o fluxo de responsabilidade:

- **Trava de Operador (Puxar Lead)**: Operadores e Líderes (`OPERATOR`, `LEADER`) não podem mais usar a função de *Bypass/Takeover* (Puxar Lead) para assumir um cliente instantaneamente. O endpoint `/clients/transfer-by-cnpj` intercepta a tentativa e gera uma Solicitação PENDENTE no painel do Supervisor.
- **Sincronia Total (Admin/Supervisor)**: Quando um Supervisor aprova a transferência no painel, ou executa operações de transferência em massa na base, o sistema agora garante que a alteração seja feita NO CLIENTE (`created_by_id`) e SIMULTANEAMENTE em TODOS os Deals em aberto no Kanban associados (`responsible_id`). Isso previne cards "órfãos" na esteira com operadores antigos/desligados.
- **Prevenção de Auto-Puxar**: Adicionado bloqueio `ConflictException 409` impedindo que a criação de solicitações de transferência ocorra se o usuário já for o dono atual do Lead. Este erro é devolvido em tela de forma amigável ao invés de estourar log não tratado.

## Integração Externa e Gerenciamento de Chaves da API (27/02/2026)

Para viabilizar integrações externas (com ferramentas como n8n, ActiveCampaign, etc.) de forma segura, o sistema agora conta com um gerenciamento próprio de Chaves de API (`Api Keys`).

### Backend (Webhooks e Autenticação)
- **Endpoint de Entrada**: Foi criado o endpoint `POST /webhooks/n8n/clients` responsável por receber payloads de plataformas externas e criar Clientes + Negócios no funil.
- **Validador de Segurança (`ApiKeyGuard`)**: A rota do webhook não utiliza sessão normal (JWT). Ela exige obrigatoriamente um cabeçalho `x-api-key`. O Guard valida essa string batendo na model `ApiKey` do banco de dados (Prisma).
- **Gestão de Chaves no BD**: O banco agora possui a tabela vinculada aos usuários (`User` -> `ApiKey`), que registra as chaves, status de atividade (`is_active`) e realiza tracking silencioso de `last_used_at`.

### Frontend (Dashboard de Chaves da API)
- **Painel de Controle**: Adicionada uma nova rota (`/api-keys`) no painel web protegido.
- **Regras de Acesso**: **SOMENTE administradores (`ADMIN`)** têm capacidade visual de acessar essa tela pelo Menu Lateral ("API"), gerenciar, visualizar, e gerar novas strings de chaves (com prefixo obrigatório `mbf_`).
- **Segurança Visual**: Ao gerar uma nova chave, o usuário a visualiza e copia apenas **UMA UNICA VEZ** (em um pop-up de sucesso). Não há como revelar o hash depois de fechado para evitar vazamentos laterais no frontend.

