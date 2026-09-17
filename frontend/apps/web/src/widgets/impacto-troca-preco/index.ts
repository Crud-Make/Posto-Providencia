/**
 * Impacto das trocas de preço no estoque parado (Issue #61).
 *
 * O dono vê, por combustível, cada mudança de preço do mês e quanto os litros
 * que já estavam no tanque ganharam ou perderam com ela. API pública do slice.
 *
 * @module widgets/impacto-troca-preco
 */
export { ImpactoTrocaPreco } from './ui/impacto-troca-preco';
export { useImpactoTrocaPreco, type DadosImpactoTrocaPreco, type ImpactoExibivel } from './model/use-impacto-troca-preco';
