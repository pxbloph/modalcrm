from datetime import datetime
from pathlib import Path

from fpdf import FPDF


ROOT = Path(r"c:\DEV\mbforms")
OUTPUT = ROOT / "Relatorio_Executivo_Melhorias_Plataforma_2026-03-13.pdf"
LOGO = ROOT / "frontend" / "public" / "img" / "logo__Logo_black.png"


class ExecutivePDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_y(10)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(70, 70, 70)
        self.cell(0, 6, "Relatorio Executivo - Melhorias da Plataforma Modal CRM", new_x="LMARGIN", new_y="NEXT", align="R")
        self.ln(2)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, f"Pagina {self.page_no()}", align="C")

    def section_title(self, title):
        self.ln(2)
        self.set_fill_color(34, 40, 49)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 13)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT", fill=True)
        self.ln(3)
        self.set_text_color(30, 30, 30)

    def paragraph(self, text, size=10, style=""):
        self.set_font("Helvetica", style, size)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(1)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(35, 35, 35)
        self.set_x(self.l_margin + 2)
        self.multi_cell(0, 6, f"- {text}")

    def impact_box(self, title, text, color):
        r, g, b = color
        self.set_fill_color(r, g, b)
        self.set_draw_color(r, g, b)
        self.set_line_width(0.3)
        start_y = self.get_y()
        self.rect(self.l_margin, start_y, self.w - self.l_margin - self.r_margin, 24, style="DF")
        self.set_xy(self.l_margin + 4, start_y + 3)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 11)
        self.cell(0, 5, title, new_x="LMARGIN", new_y="NEXT")
        self.set_x(self.l_margin + 4)
        self.set_font("Helvetica", "", 9)
        self.multi_cell(self.w - self.l_margin - self.r_margin - 8, 4.5, text)
        self.set_text_color(30, 30, 30)
        self.set_y(start_y + 28)

    def mini_table(self, rows):
        widths = [58, 120]
        for label, value in rows:
            self.set_font("Helvetica", "B", 10)
            self.set_fill_color(240, 243, 246)
            self.cell(widths[0], 8, label, border=1, fill=True)
            self.set_font("Helvetica", "", 10)
            self.cell(widths[1], 8, value, border=1, new_x="LMARGIN", new_y="NEXT")


pdf = ExecutivePDF()
pdf.set_auto_page_break(auto=True, margin=16)
pdf.add_page()

if LOGO.exists():
    pdf.image(str(LOGO), x=20, y=18, w=54)

pdf.set_y(52)
pdf.set_font("Helvetica", "B", 24)
pdf.set_text_color(24, 31, 41)
pdf.multi_cell(0, 11, "Relatorio Executivo\nMelhorias da Plataforma Modal CRM")

pdf.ln(4)
pdf.set_font("Helvetica", "", 12)
pdf.set_text_color(90, 90, 90)
pdf.multi_cell(
    0,
    7,
    "Documento preparado para apresentacao executiva, com foco em ganhos de operacao, controle, seguranca e visibilidade do negocio.",
)

pdf.ln(8)
pdf.mini_table(
    [
        ("Data do relatorio", datetime.now().strftime("%d/%m/%Y %H:%M")),
        ("Base utilizada", "Historico local do projeto, documentacao interna e estado atual do sistema"),
        ("Objetivo", "Consolidar, em linguagem simples, o que ja foi melhorado na plataforma"),
    ]
)

pdf.ln(10)
pdf.impact_box(
    "Resumo Executivo",
    "A plataforma deixou de ser apenas um CRM basico e passou a operar com controles mais fortes de processo, "
    "seguranca, acompanhamento gerencial, historico, integracoes e governanca sobre a carteira de leads.",
    (38, 96, 140),
)

pdf.section_title("1. O que a plataforma passou a entregar para a operacao")
pdf.paragraph(
    "Nos ultimos ciclos de melhoria, a plataforma evoluiu em areas que impactam diretamente a rotina comercial, "
    "a supervisao, a seguranca da operacao e a confiabilidade das informacoes. Em termos praticos, isso significa "
    "mais controle sobre os leads, mais clareza para gestao e menos retrabalho manual."
)
for item in [
    "Centralizacao do cadastro e da qualificacao dos leads em um fluxo mais consistente.",
    "Regras de protecao para evitar avancos indevidos de leads com cadastro incompleto.",
    "Maior controle sobre quem pode acessar, editar ou administrar informacoes sensiveis.",
    "Visao gerencial em tempo real para lideranca e supervisao.",
    "Mais rastreabilidade do que acontece com cada lead e cada negociacao.",
]:
    pdf.bullet(item)

pdf.section_title("2. Principais melhorias ja entregues")
pdf.paragraph("Abaixo estao os principais grupos de melhorias, descritos de forma executiva.")

pdf.set_font("Helvetica", "B", 11)
groups = [
    (
        "Cadastro, atendimento e carteira comercial",
        [
            "Abertura de clientes e negocios em um fluxo centralizado.",
            "Vinculo automatico do lead ao operador quando aplicavel.",
            "Prevencao de duplicidade por CNPJ.",
            "Tela de qualificacao que carrega os dados do lead ja preenchidos.",
            "Nova pagina dedicada para o fluxo de Puxar Leads.",
        ],
    ),
    (
        "Controle do Kanban e das negociacoes",
        [
            "Historico detalhado das movimentacoes dos negocios.",
            "Sincronizacao do responsavel entre a carteira e os cards do Kanban.",
            "Persistencia de filtros e preferencias por usuario.",
            "Melhoria de uso para selecao de varios cards e operacoes mais rapidas.",
        ],
    ),
    (
        "Regras de qualidade e integridade dos leads",
        [
            "Travas para impedir que leads sem integracao avancem como se estivessem prontos.",
            "Restricao de tabulacoes positivas para cadastros ainda nao confirmados.",
            "Fluxo de lead inapto com exclusao operacional e arquivamento para consulta administrativa.",
        ],
    ),
    (
        "Seguranca, usuarios e permissoes",
        [
            "Gestao de usuarios com controle de status, funcao e supervisao.",
            "Roles customizadas com permissoes especificas.",
            "Permissoes separadas para visualizar, editar e restaurar leads excluidos.",
            "Configuracao global para liberar ou bloquear a tela de cadastro de leads.",
            "Definicao de tela inicial por usuario para adaptar a rotina operacional.",
        ],
    ),
    (
        "Gestao e visibilidade para lideranca",
        [
            "Dashboard TV com foco em contas abertas e conversao.",
            "Painel do supervisor mostrando inclusive operadores zerados.",
            "Detalhamento por operador com a lista dos clientes convertidos.",
            "Relatorios gerenciais para acompanhamento de resultados.",
        ],
    ),
    (
        "Infraestrutura, auditoria e integracoes",
        [
            "Sistema de auditoria e historico de eventos sensiveis.",
            "Gerenciamento de chaves de API para integracoes externas.",
            "Webhook para entrada automatica de leads vindos de outras plataformas.",
            "Ferramentas administrativas de banco, notificacoes e operacao interna.",
        ],
    ),
]

for title, bullets in groups:
    pdf.set_fill_color(246, 248, 250)
    pdf.set_draw_color(220, 225, 230)
    start = pdf.get_y()
    box_h = 9 + len(bullets) * 6 + 4
    pdf.rect(pdf.l_margin, start, pdf.w - pdf.l_margin - pdf.r_margin, box_h, style="DF")
    pdf.set_xy(pdf.l_margin + 4, start + 3)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 5, title, new_x="LMARGIN", new_y="NEXT")
    for bullet in bullets:
        pdf.set_x(pdf.l_margin + 6)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin - 10, 5.5, f"- {bullet}")
    pdf.ln(2)

pdf.section_title("3. Destaques recentes com impacto direto no negocio")
pdf.impact_box(
    "Puxar Leads",
    "O fluxo do operador foi redesenhado para reduzir trabalho manual. Agora existe uma pagina propria para puxar leads, "
    "com validacao do CNPJ e encaminhamento para a tela do lead quando a acao e concluida.",
    (46, 125, 50),
)
pdf.impact_box(
    "Leads Excluidos",
    "Leads retirados da operacao nao se perdem mais. Eles ficam arquivados em uma lista controlada, com possibilidade "
    "de visualizacao, edicao e devolucao para a base conforme permissao.",
    (198, 86, 34),
)
pdf.impact_box(
    "Controle de Acesso",
    "A plataforma passou a oferecer mais governanca: roles customizadas, permissoes granulares e configuracoes globais "
    "para definir o que fica ou nao disponivel para cada publico.",
    (84, 96, 112),
)

pdf.section_title("4. Beneficios percebidos pela empresa")
for item in [
    "Mais seguranca operacional, com menos risco de uso indevido ou avancos errados no processo comercial.",
    "Mais previsibilidade na rotina dos operadores, com fluxo mais direto e menos etapas manuais.",
    "Mais visibilidade para gestores, com paines e relatorios orientados a resultado.",
    "Mais rastreabilidade para auditoria e tomada de decisao.",
    "Mais capacidade de crescer sem perder controle da carteira e das regras de negocio.",
]:
    pdf.bullet(item)

pdf.section_title("5. O que isso representa em termos executivos")
pdf.paragraph(
    "Em linguagem simples, a plataforma evoluiu em quatro pilares: produtividade, controle, seguranca e gestao. "
    "Isso significa que o sistema hoje ajuda mais a operacao a trabalhar, ajuda mais a lideranca a acompanhar e ajuda "
    "mais a empresa a reduzir erro manual, perda de informacao e dependencia de controles paralelos."
)
pdf.paragraph(
    "O resultado e uma base mais preparada para escalar a operacao comercial, sustentar processos internos e ampliar "
    "integracoes, sem perder visibilidade sobre o que esta acontecendo no funil e na carteira."
)

pdf.section_title("6. Oportunidades para os proximos ciclos")
for item in [
    "Aprimorar ainda mais a telefonia integrada com o fluxo de atendimento.",
    "Automatizar processos de agendamento e retorno.",
    "Expandir dashboards e relatorios para outras visoes executivas.",
    "Continuar refinando experiencia do operador e velocidade de operacao.",
]:
    pdf.bullet(item)

pdf.section_title("7. Conclusao")
pdf.paragraph(
    "A plataforma recebeu um conjunto relevante de melhorias e hoje oferece um nivel maior de maturidade operacional. "
    "Ela ja nao atua apenas como um cadastro de leads, mas como uma ferramenta de controle de processo, distribuicao "
    "de responsabilidade, acompanhamento gerencial e protecao da operacao."
)
pdf.paragraph(
    "Para apresentacao ao dono da empresa, a mensagem central e esta: a plataforma ficou mais segura, mais organizada, "
    "mais preparada para a rotina comercial e mais util para a lideranca acompanhar resultados."
)

pdf.output(str(OUTPUT))
print(str(OUTPUT))
