/**
 * Resumo mensal do posto — venda por produto, compra e custo, estoque e perda.
 *
 * É a reprodução, no sistema, da aba de resumo da planilha que o dono usa para
 * decidir preço e enxergar perda. API pública do slice: só o componente e o tipo
 * dos dados saem daqui.
 *
 * @module widgets/resumo-mensal
 */
export { ResumoMensal } from './ui/resumo-mensal';
export { CentroDoMesConectado } from './ui/centro-do-mes-conectado';
export { useResumoMensal, type DadosResumoMensal } from './model/use-resumo-mensal';
