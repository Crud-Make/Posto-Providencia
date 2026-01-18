import { supabase } from '../supabase';
import { dividaService } from './divida.service';
import { estoqueService } from './estoque.service';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

export interface SolvencyStatus {
  dividaId: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  status: 'verde' | 'amarelo' | 'vermelho';
  mensagem: string;
  deficitProjetado?: number;
  diasAteVencimento: number;
  coberturaPorcentagem: number;
}

export interface SolvencyProjection {
  saldoAtual: number;
  mediaDiaria: number;
  proximasParcelas: SolvencyStatus[];
  metaVendas: {
    totalCompromissos: number;
    litrosNecessarios: number;
    margemPorLitro: number;
    litrosVendidosMes: number;
    lucroGeradoMes: number;
    progressoPorcentagem: number;
    valorRestante: number;
  };
}

/**
 * Serviço de Análise de Solvência
 * 
 * @remarks
 * Gera projeções financeiras e análises de capacidade de pagamento
 */
export const solvencyService = {
  /**
   * Gera projeção de solvência baseada em saldo, média de vendas e dívidas
   * @param postoId - Filtro opcional por posto
   */
  async getProjection(postoId?: number): Promise<ApiResponse<SolvencyProjection>> {
    try {
      const today = new Date();
      const last30Days = new Date(today);
      last30Days.setDate(today.getDate() - 30);
      const last30DaysStr = last30Days.toISOString().split('T')[0];

      // 1. Saldo Real (Vendas Cartão/Pix dos últimos 7 dias com fechamento)
      const last7Days = new Date(today);
      last7Days.setDate(today.getDate() - 7);
      const last7DaysStr = last7Days.toISOString().split('T')[0];

      let queryRec = supabase
        .from('Recebimento')
        .select('valor, Fechamento!inner(data, posto_id)')
        .in('forma_pagamento_id', [1, 2, 3])
        .gte('Fechamento.data', last7DaysStr);

      if (postoId) {
        queryRec = queryRec.eq('Fechamento.posto_id', postoId);
      }

      const { data: recebimentos, error: recError } = await queryRec;
      if (recError) return createErrorResponse(recError.message, 'FETCH_ERROR');

      type RecebimentoComValor = { valor: number };
      const recTyped = (recebimentos || []) as RecebimentoComValor[];
      const saldoAtual = recTyped.reduce((acc, r) => acc + Number(r.valor), 0);

      // 2. Média Diária (Faturamento Líquido dos últimos 30 dias)
      let queryFech = supabase
        .from('Fechamento')
        .select('total_vendas')
        .gte('data', last30DaysStr);

      if (postoId) {
        queryFech = queryFech.eq('posto_id', postoId);
      }

      const { data: fechamentos, error: fError } = await queryFech;
      if (fError) return createErrorResponse(fError.message, 'FETCH_ERROR');

      const totalVendas30 = fechamentos?.reduce((acc, f) => acc + Number(f.total_vendas), 0) || 0;
      const mediaDiaria = totalVendas30 / 30;

      // 3. Dívidas Pendentes
      const dividasResponse = await dividaService.getAll(postoId);
      const dividas = dividasResponse.success ? dividasResponse.data : [];
      const pendentes = dividas.filter(d => d.status === 'pendente');

      const proximasParcelas: SolvencyStatus[] = pendentes.map(d => {
        const vencimento = new Date(d.data_vencimento);
        const diffTime = vencimento.getTime() - today.getTime();
        const diasAteVencimento = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        const saldoProjetadoNoVencimento = saldoAtual + (mediaDiaria * diasAteVencimento);
        const coberturaPorcentagem = d.valor > 0 ? Math.min(100, (saldoProjetadoNoVencimento / d.valor) * 100) : 100;

        let status: 'verde' | 'amarelo' | 'vermelho' = 'vermelho';
        let mensagem = '';
        let deficitProjetado = 0;

        if (saldoAtual >= d.valor) {
          status = 'verde';
          mensagem = `Parcela de R$ ${d.valor.toLocaleString('pt-BR')} coberta.`;
        } else if (saldoProjetadoNoVencimento >= d.valor) {
          status = 'amarelo';
          const faltam = d.valor - saldoAtual;
          mensagem = `Faltam R$ ${faltam.toLocaleString('pt-BR')} para cobrir a parcela. Média atual: R$ ${mediaDiaria.toLocaleString('pt-BR')}/dia. Status: No caminho.`;
        } else {
          status = 'vermelho';
          deficitProjetado = d.valor - saldoProjetadoNoVencimento;
          mensagem = `Atenção: Saldo insuficiente para ${d.descricao}. Déficit projetado: R$ ${deficitProjetado.toLocaleString('pt-BR')}.`;
        }

        return {
          dividaId: d.id,
          descricao: d.descricao,
          valor: d.valor,
          dataVencimento: d.data_vencimento,
          status,
          mensagem,
          deficitProjetado: deficitProjetado > 0 ? deficitProjetado : undefined,
          diasAteVencimento,
          coberturaPorcentagem
        };
      });

      // 4. Calcular Meta de Vendas para quitar compromissos
      const estoquesResponse = await estoqueService.getAll(postoId);
      const estoques = estoquesResponse.success ? estoquesResponse.data : [];
      let margemMediaPorLitro = 0.30;

      if (estoques.length > 0) {
        const combustiveisComMargem = estoques.filter(e => e.combustivel?.preco_venda && e.custo_medio);
        if (combustiveisComMargem.length > 0) {
          const somaMargens = combustiveisComMargem.reduce((acc, e) => {
            const precoVenda = Number(e.combustivel?.preco_venda) || 0;
            const custoMedio = Number(e.custo_medio) || 0;
            return acc + (precoVenda - custoMedio);
          }, 0);
          margemMediaPorLitro = somaMargens / combustiveisComMargem.length;
        }
      }

      const totalCompromissosPendentes = pendentes.reduce((acc, d) => acc + d.valor, 0);
      const litrosNecessarios = margemMediaPorLitro > 0
        ? Math.ceil(totalCompromissosPendentes / margemMediaPorLitro)
        : 0;

      // 5. Progresso: Vendas (lucro) acumuladas no mês atual
      const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

      let queryLeituras = supabase
        .from('Leitura')
        .select('litros_vendidos')
        .gte('data', inicioMes);

      if (postoId) {
        queryLeituras = queryLeituras.eq('posto_id', postoId);
      }

      const { data: leituras, error: lError } = await queryLeituras;
      if (lError) console.warn('Erro ao buscar leituras:', lError);

      const litrosVendidosMes = leituras?.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0) || 0;
      const lucroGeradoMes = litrosVendidosMes * margemMediaPorLitro;

      const progressoMeta = totalCompromissosPendentes > 0
        ? Math.min(100, (lucroGeradoMes / totalCompromissosPendentes) * 100)
        : 100;

      return createSuccessResponse({
        saldoAtual,
        mediaDiaria,
        proximasParcelas,
        metaVendas: {
          totalCompromissos: totalCompromissosPendentes,
          litrosNecessarios,
          margemPorLitro: margemMediaPorLitro,
          litrosVendidosMes,
          lucroGeradoMes,
          progressoPorcentagem: progressoMeta,
          valorRestante: Math.max(0, totalCompromissosPendentes - lucroGeradoMes)
        }
      });
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }
};

