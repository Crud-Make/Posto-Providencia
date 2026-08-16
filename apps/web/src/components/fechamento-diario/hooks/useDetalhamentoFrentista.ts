/**
 * Hook para cálculos de detalhamento por frentista
 * 
 * @author Sistema de Gestão - Posto Providência
 */
// [20/01 11:30] Criação do hook para isolar lógica de cálculo da nova aba
import { useMemo } from 'react';
import { SessaoFrentista } from '../../../types/fechamento';
import { analisarValor } from '../../../utils/formatters';
import { cartao as cartaoModulo, conferido, diferenca as diferencaCanonica } from '@posto/utils';
import { meiosDaSessao } from '../../../utils/fechamentoMeios';

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
    // Aritmética canônica via @posto/utils (7 buckets, cartão aditivo, moedas).
    const meios = meiosDaSessao(sessao);
    const pix = meios.pix;
    const cartao = cartaoModulo(meios); // valor_cartao + débito + crédito
    const nota = meios.nota;
    const dinheiro = meios.dinheiro;
    const baratao = meios.baratao;

    // Total arrecadado (conferido: inclui moedas)
    const totalVenda = conferido(meios);

    // Comparativo com o concentrador, na convenção canônica do §6:
    // concentrador − conferido, positivo = FALTA. O flip que a nota anterior
    // deixava pendente foi feito em 16/08/2026, junto com o do `useFechamento` —
    // manter os dois sinais na MESMA tela era pior que qualquer um dos dois.
    const vendaConcentrador = analisarValor(sessao.valor_encerrante);
    const diferenca = diferencaCanonica(vendaConcentrador, totalVenda);
    
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
