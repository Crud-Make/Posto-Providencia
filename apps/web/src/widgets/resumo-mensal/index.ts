/**
 * Resumo mensal do posto — venda por produto, compra e custo, estoque e perda.
 *
 * É a reprodução, no sistema, da aba de resumo da planilha que o dono usa para
 * decidir preço e enxergar perda. API pública do slice: o Centro do Mês (montado
 * na Visão Proprietário) e o hook com os dados.
 *
 * [06/09/2026] `ResumoMensal` (490 linhas) e os formulários `FormCompra`/`FormMedicao`
 * foram apagados: nenhuma rota os montava desde 16/08 e ainda recebiam commit de
 * cor sem ninguém conseguir ver. Compra se lança em `/compras`; régua, na aba
 * Tanques do PWA do frentista e em `/estoque/tanques`.
 *
 * @module widgets/resumo-mensal
 */
export { CentroDoMesConectado } from './ui/centro-do-mes-conectado';
export { useResumoMensal, type DadosResumoMensal } from './model/use-resumo-mensal';
