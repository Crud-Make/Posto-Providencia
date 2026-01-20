/**
 * Hook para cálculos de detalhamento por frentista
 * 
 * @author Sistema de Gestão - Posto Providência
 */
// [20/01 11:30] Criação do hook para isolar lógica de cálculo da nova aba
import { useMemo } from 'react';
import { SessaoFrentista } from '../../../types/fechamento';
import { analisarValor } from '../../../utils/formatters';

/**
 * Interface que define a estrutura dos totais calculados para o detalhamento
 * 
 * @property pix - Valor total em Pix
 * @property cartao - Soma de cartão crédito, débito e genérico
 * @property nota - Valor em notas a prazo
 * @property dinheiro - Valor em dinheiro
 * @property baratao - Valor em baratão/outros
 * @property totalVenda - Soma de todos os meios de pagamento
 * @property vendaConcentrador - Valor registrado no concentrador (encerrante)
 * @property diferenca - Diferença entre total de venda e concentrador
 * @property participacao - Percentual de participação nas vendas totais
 */
export interface TotaisDetalhamento {
  pix: number;
  cartao: number;
  nota: number;
  dinheiro: number;
  baratao: number;
  totalVenda: number;
  vendaConcentrador: number;
  diferenca: number;
  participacao: number;
}

/**
 * Hook customizado para realizar os cálculos financeiros de um frentista
 * 
 * @remarks
 * Centraliza a lógica de soma de pagamentos e comparação com o concentrador.
 * Utiliza useMemo para evitar recálculos desnecessários.
 * 
 * @param sessao - Sessão individual do frentista com os valores brutos
 * @param totalVendasPosto - Total de vendas do posto para cálculo de %
 * @returns Objeto contendo todos os totais calculados e formatados numericamente
 */
export const useDetalhamentoFrentista = (
  sessao: SessaoFrentista,
  totalVendasPosto: number
): TotaisDetalhamento => {
  return useMemo(() => {
    // Conversão segura de valores string para number
    const pix = analisarValor(sessao.valor_pix);
    
    // Agrupamento de cartões
    const cartao = analisarValor(sessao.valor_cartao) + 
                   analisarValor(sessao.valor_cartao_debito) + 
                   analisarValor(sessao.valor_cartao_credito);
                   
    const nota = analisarValor(sessao.valor_nota);
    const dinheiro = analisarValor(sessao.valor_dinheiro);
    const baratao = analisarValor(sessao.valor_baratao);
    
    // Cálculo do total arrecadado
    const totalVenda = pix + cartao + nota + dinheiro + baratao;
    
    // Comparativo com concentrador
    const vendaConcentrador = analisarValor(sessao.valor_encerrante);
    const diferenca = totalVenda - vendaConcentrador;
    
    // Cálculo de participação percentual
    const participacao = totalVendasPosto > 0 
      ? (vendaConcentrador / totalVendasPosto) * 100 
      : 0;

    return {
      pix,
      cartao,
      nota,
      dinheiro,
      baratao,
      totalVenda,
      vendaConcentrador,
      diferenca,
      participacao
    };
  }, [sessao, totalVendasPosto]);
};
