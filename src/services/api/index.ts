/**
 * Camada de Serviços da API
 *
 * @remarks
 * Ponto central de exportação de todos os services.
 * Mantém compatibilidade com imports existentes.
 */

// Exporta services individuais
export { postoService } from './posto.service';
export { turnoService } from './turno.service';
export { configuracaoService } from './configuracao.service';
export { combustivelService } from './combustivel.service';
export { bombaService } from './bomba.service';
export { bicoService } from './bico.service';
export { estoqueService } from './estoque.service';
export { frentistaService } from './frentista.service';
export { leituraService } from './leitura.service';
export type { SalesSummary, VendaPorCombustivel } from './leitura.service';
export { fechamentoService } from './fechamento.service';
export { recebimentoService } from './recebimento.service';
export { fechamentoFrentistaService } from './fechamentoFrentista.service';
export { formaPagamentoService } from './formaPagamento.service';
export { maquininhaService } from './maquininha.service';
export { despesaService } from './despesa.service';
export { parcelaService } from './parcela.service';
export { dividaService } from './divida.service';
export { emprestimoService } from './emprestimo.service';
export { solvencyService } from './solvency.service';
export { compraService } from './compra.service';
export { fornecedorService } from './fornecedor.service';
export { dashboardService } from './dashboard.service';
export { salesAnalysisService } from './salesAnalysis.service';
export { notificationService } from './notification.service';
export { vendaProdutoService } from './vendaProduto.service';
export { escalaService } from './escala.service';
export { clienteService } from './cliente.service';
export { notaFrentistaService } from './notaFrentista.service';
export { resetService } from './reset.service';
export { baratenciaService } from './baratencia.service';
export { legacyService } from './legacy.service';

// Importa para montar objeto api
import { postoService } from './posto.service';
import { turnoService } from './turno.service';
import { configuracaoService } from './configuracao.service';
import { combustivelService } from './combustivel.service';
import { bombaService } from './bomba.service';
import { bicoService } from './bico.service';
import { estoqueService } from './estoque.service';
import { frentistaService } from './frentista.service';
import { leituraService } from './leitura.service';
import { fechamentoService } from './fechamento.service';
import { recebimentoService } from './recebimento.service';
import { fechamentoFrentistaService } from './fechamentoFrentista.service';
import { formaPagamentoService } from './formaPagamento.service';
import { maquininhaService } from './maquininha.service';
import { despesaService } from './despesa.service';
import { parcelaService } from './parcela.service';
import { dividaService } from './divida.service';
import { emprestimoService } from './emprestimo.service';
import { solvencyService } from './solvency.service';
import { compraService } from './compra.service';
import { fornecedorService } from './fornecedor.service';
import { dashboardService } from './dashboard.service';
import { salesAnalysisService } from './salesAnalysis.service';
import { notificationService } from './notification.service';
import { vendaProdutoService } from './vendaProduto.service';
import { escalaService } from './escala.service';
import { clienteService } from './cliente.service';
import { notaFrentistaService } from './notaFrentista.service';
import { resetService } from './reset.service';
import { baratenciaService } from './baratencia.service';
import { legacyService } from './legacy.service';

// TODO: Importar outros services conforme forem migrados

export const api = {
  posto: postoService,
  turno: turnoService,
  configuracao: configuracaoService,
  combustivel: combustivelService,
  bomba: bombaService,
  bico: bicoService,
  estoque: estoqueService,
  frentista: frentistaService,
  leitura: leituraService,
  fechamento: fechamentoService,
  recebimento: recebimentoService,
  fechamentoFrentista: fechamentoFrentistaService,
  formaPagamento: formaPagamentoService,
  maquininha: maquininhaService,
  despesa: despesaService,
  parcela: parcelaService,
  divida: dividaService,
  emprestimo: emprestimoService,
  solvency: solvencyService,
  compra: compraService,
  fornecedor: fornecedorService,
  dashboard: dashboardService,
  salesAnalysis: salesAnalysisService,
  notification: notificationService,
  vendaProduto: vendaProdutoService,
  escala: escalaService,
  cliente: clienteService,
  notaFrentista: notaFrentistaService,
  reset: resetService,
  baratencia: baratenciaService,
  legacy: legacyService,
};

export default api;
