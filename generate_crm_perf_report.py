from datetime import datetime
from fpdf import FPDF

out_file = r"c:\\DEV\\mbforms\\Relatorio_Performance_CRM_2026-03-09.pdf"

today = datetime.now().strftime("%Y-%m-%d %H:%M")

class PDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 12)
        self.cell(0, 8, "Relatorio Tecnico - Performance da Aba CRM", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 9)
        self.cell(0, 5, f"Data: {today}", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def section(self, title):
        self.set_font("Helvetica", "B", 11)
        self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 10)

    def bullet(self, text):
        self.set_x(self.l_margin)
        self.multi_cell(0, 6, f"- {text}")

pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=12)
pdf.add_page()
pdf.set_font("Helvetica", "", 10)

pdf.section("1. Objetivo")
pdf.multi_cell(0, 6, "Avaliar a lentidao reportada ao abrir a aba CRM e identificar o principal gargalo com base em medicoes reais de tempo, volume de dados e custo das consultas.")
pdf.ln(1)

pdf.section("2. Escopo dos testes")
pdf.bullet("Ambiente local: backend NestJS em http://localhost:3500")
pdf.bullet("Banco de dados: Neon (via Prisma)")
pdf.bullet("Foco: chamadas feitas no carregamento do CRM/Kanban")
pdf.bullet("Pipeline analisada: 37c4337d-63b5-4e91-950e-6024cdc0c902 (Abertura)")
pdf.ln(1)

pdf.section("3. Metodologia")
pdf.bullet("Medicoes HTTP com curl e PowerShell Stopwatch")
pdf.bullet("Medicoes no backend via Prisma para separar tempo de query e serializacao")
pdf.bullet("Comparacao entre endpoints leves (stages, counts) e endpoint pesado (deals)")
pdf.ln(1)

pdf.section("4. Resultados coletados")
pdf.set_font("Helvetica", "B", 10)
pdf.cell(0, 6, "4.1 Endpoints HTTP", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 10)
pdf.bullet("GET /api/deals?pipeline_id=... -> 3.21s a 3.64s (3 execucoes via curl)")
pdf.bullet("Payload de /api/deals sem compressao -> ~17.67 MB")
pdf.bullet("Payload de /api/deals com compressao -> ~2.73 MB")
pdf.bullet("GET /api/deals/counts-by-stage?pipeline_id=... -> ~33 ms")
pdf.bullet("GET /api/stages?pipeline_id=... -> ~40 ms")
pdf.bullet("GET /api/pipelines -> ~38 ms")
pdf.ln(1)

pdf.set_font("Helvetica", "B", 10)
pdf.cell(0, 6, "4.2 Medicoes Prisma", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 10)
pdf.bullet("deals.findMany (payload completo do Kanban) -> ~3.15s a ~3.45s")
pdf.bullet("Quantidade retornada no findMany -> ~20.8k deals")
pdf.bullet("JSON.stringify da resposta -> ~195 ms")
pdf.bullet("deals.groupBy (countByStage) -> ~30 ms")
pdf.bullet("clients.count (metricas) -> ~26 a ~29 ms por consulta")
pdf.ln(1)

pdf.section("5. Diagnostico tecnico")
pdf.bullet("O gargalo principal esta concentrado em GET /api/deals sem paginacao.")
pdf.bullet("A aba CRM carrega muitos registros de uma vez com relacoes (client, stage, responsible, tags).")
pdf.bullet("Endpoints auxiliares (stages, counts, pipelines) estao rapidos e nao sao o problema central.")
pdf.bullet("A lentidao percebida e majoritariamente causada por volume de dados e tamanho da resposta.")
pdf.ln(1)

pdf.section("6. Plano de atuacao proposto")
pdf.set_font("Helvetica", "B", 10)
pdf.cell(0, 6, "Fase 1 - Ganho rapido (1 a 2 dias)", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 10)
pdf.bullet("Implementar paginacao server-side em /api/deals (take/skip ou cursor).")
pdf.bullet("Carregar inicialmente apenas pagina 1 ou limite por etapa (ex.: 50 por coluna).")
pdf.bullet("Adicionar suporte de lazy load/infinite scroll para carregar sob demanda.")
pdf.bullet("Manter metadados de total por etapa via endpoint de contagem (ja rapido).")

pdf.set_font("Helvetica", "B", 10)
pdf.cell(0, 6, "Fase 2 - Otimizacao de consulta (2 a 4 dias)", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 10)
pdf.bullet("Revisar indexes para filtros mais usados no Kanban (pipeline_id, stage_id, responsible_id, created_at).")
pdf.bullet("Revisar indexes de clients usados em filtros correlatos (created_by_id, integration_status, account_opening_date, tabulacao).")
pdf.bullet("Reduzir campos retornados por default na listagem para o minimo necessario no card/lista.")

pdf.set_font("Helvetica", "B", 10)
pdf.cell(0, 6, "Fase 3 - Validacao e metas (1 dia)", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 10)
pdf.bullet("Meta de tempo para primeira carga de deals: < 800 ms no backend para pagina inicial.")
pdf.bullet("Meta de payload inicial: < 1 MB comprimido.")
pdf.bullet("Executar nova rodada de benchmark apos deploy das melhorias.")
pdf.ln(1)

pdf.section("7. Risco de nao agir")
pdf.bullet("Aumento progressivo de latencia conforme a base cresce.")
pdf.bullet("Piora de UX no CRM com travamentos e tempo alto de abertura.")
pdf.bullet("Maior consumo de rede e CPU em frontend/backend por respostas massivas.")
pdf.ln(1)

pdf.section("8. Conclusao")
pdf.multi_cell(0, 6, "O problema de lentidao foi reproduzido e medido. O principal fator e a carga integral de ~20.8k deals por requisicao no endpoint /api/deals. A estrategia recomendada e priorizar paginacao e carga incremental, seguida de ajuste de indexes e refinamento de payload.")

pdf.output(out_file)
print(out_file)
