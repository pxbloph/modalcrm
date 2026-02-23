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

---

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

---

## Banco de Dados (Regras Rígidas)

- **Nunca executar comandos diretamente no banco de dados**.
- Sempre fornecer **somente scripts SQL**, formatados, para:
  - Revisão manual
  - Execução manual via SQL Editor
- Não simular execuções automáticas.
- Não aplicar alterações diretas no banco.

---

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

---

## Regra Final de Operação

Antes de iniciar qualquer implementação, o Antigravity deve:
- Revisar o código existente
- Revisar fluxos atuais
- Revisar regras de negócio já aplicadas

Somente após essa análise, qualquer edição ou sugestão de mudança deve ser proposta.

---

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
  - `account_opening_date` igual a HOJE (Server Time).
  - O owner do lead (`created_by_id`) recebe o crédito.
  - Atualização automática a cada 60 segundos.

### Endpoint
- `GET /dashboards/tv/contas-abertas?date=YYYY-MM-DD`
- Retorno: `{ total_open_accounts, ranking: [], updated_at }`

### URL de Acesso
- Frontend: `/tv/dashboard`
- Rota protegida (requer login de usuário com permissão de visualização, geralmente Supervisor/Admin, ou Token futuramente).

---

## Padrões de Interface (UI/UX) - Atualizado (02/2026)

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

---

## Novo Fluxo de Negócios (02/2026)

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

---

## Atualizações Recentes (02/2026) - Performance e Histórico

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


# NUNCA FAÇA DEPLOY AUTOMATICO!