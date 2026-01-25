import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import { postoService, frentistaService, fechamentoService } from '../../../services/api';
import { DadosDashboard, PostoSummary, AlertaDashboard } from '../types';
import { Posto } from '../../../types/database/index';
import { isSuccess } from '../../../types/ui/response-types';
import { AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';

interface UseDashboardReturn {
  dados: DadosDashboard | null;
  loading: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

/**
 * Hook personalizado para obter dados do dashboard.
 *
 * Realiza chamadas assíncronas para serviços de postos, fechamentos, frentistas e financeiro.
 * Consolida os dados em uma estrutura unificada para exibição.
 *
 * @returns {UseDashboardReturn} Objeto contendo dados, estado de carregamento, erro e função de recarga.
 */
export function useDashboardProprietario(): UseDashboardReturn {
  const [dados, setDados] = useState<DadosDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      // 1. Buscar postos
      const response = await postoService.getAll();
      
      if (!isSuccess(response)) {
        setErro(response.error);
        setLoading(false);
        return;
      }

      const postos = response.data;
      if (postos.length === 0) {
        setErro('Nenhum posto encontrado.');
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().toISOString().slice(0, 7);
      const startOfMonth = `${currentMonth}-01`;

      // 2. Processar dados de cada posto
      const summaries: PostoSummary[] = await Promise.all(
        postos.map(async (posto) => {
          return await processarPosto(posto, today, startOfMonth);
        })
      );

      // 3. Agregar dados totais
      const dadosConsolidados = consolidarDados(summaries, postos[0]); // Assume o primeiro posto como principal para exibição singular se necessário

      setDados(dadosConsolidados);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setErro('Falha ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  return { dados, loading, erro, recarregar: carregarDados };
}

// ============================================
// HELPERS (Lógica de Negócio)
// ============================================

async function processarPosto(posto: Posto, today: string, startOfMonth: string): Promise<PostoSummary> {
  // Frentistas
  const resFrentistas = await frentistaService.getAll(posto.id);
  const frentistas = isSuccess(resFrentistas) ? resFrentistas.data : [];
  const frentistasAtivos = frentistas.filter(f => f.ativo).length;

  // Fechamentos Hoje
  const resFechamentos = await fechamentoService.getByDate(today, posto.id);
  const fechamentosHoje = isSuccess(resFechamentos) ? resFechamentos.data : [];
  const vendasHoje = fechamentosHoje.reduce((acc, f) => acc + (f.total_vendas || 0), 0);

  // Fechamentos Mês
  const { data: fechamentosMes } = await supabase
    .from('Fechamento')
    .select('total_vendas, data')
    .eq('posto_id', posto.id)
    .gte('data', startOfMonth)
    .lte('data', today);

  const vendasMes = (fechamentosMes || []).reduce((acc, f) => acc + (f.total_vendas || 0), 0);

  // Dívidas
  const { data: dividas } = await supabase
    .from('Divida')
    .select('valor')
    .eq('posto_id', posto.id)
    .eq('status', 'pendente');

  const dividasTotal = (dividas || []).reduce((acc, d) => acc + (d.valor || 0), 0);

  // Empréstimos
  const { data: emprestimos } = await supabase
    .from('Emprestimo')
    .select('valor_total')
    .eq('posto_id', posto.id)
    .eq('ativo', true);

  const emprestimosTotal = (emprestimos || []).reduce((acc, e) => acc + (e.valor_total || 0), 0);

  // Despesas
  const { data: despesas } = await supabase
    .from('Despesa')
    .select('valor')
    .eq('posto_id', posto.id)
    .eq('status', 'pendente');

  const despesasPendentes = (despesas || []).reduce((acc, d) => acc + (d.valor || 0), 0);

  // Margem Média
  const { data: combustiveis } = await supabase
    .from('Combustivel')
    .select('preco_venda, preco_custo')
    .eq('posto_id', posto.id)
    .eq('ativo', true);

  let margemMedia = 0;
  if (combustiveis && combustiveis.length > 0) {
    const margensValidas = combustiveis
      .filter(c => c.preco_custo && c.preco_venda && c.preco_venda > 0 && c.preco_custo > 0)
      .map(c => ((c.preco_venda - c.preco_custo) / c.preco_venda) * 100);

    if (margensValidas.length > 0) {
      margemMedia = margensValidas.reduce((a, b) => a + b, 0) / margensValidas.length;
    }
  }

  // Último Fechamento
  const { data: ultimoFech } = await supabase
    .from('Fechamento')
    .select('data')
    .eq('posto_id', posto.id)
    .order('data', { ascending: false })
    .limit(1);

  return {
    posto,
    vendasHoje,
    vendasMes,
    lucroEstimadoHoje: vendasHoje * (margemMedia / 100),
    lucroEstimadoMes: vendasMes * (margemMedia / 100),
    margemMedia,
    frentistasAtivos,
    dividasTotal: dividasTotal + emprestimosTotal,
    despesasPendentes,
    ultimoFechamento: ultimoFech?.[0]?.data || null
  };
}

function consolidarDados(summaries: PostoSummary[], postoPrincipal: Posto): DadosDashboard {
  // Totais Hoje
  const vendasHoje = summaries.reduce((acc, s) => acc + s.vendasHoje, 0);
  const lucroHoje = summaries.reduce((acc, s) => acc + s.lucroEstimadoHoje, 0);
  const dividasTotal = summaries.reduce((acc, s) => acc + s.dividasTotal, 0);
  const despesasTotal = summaries.reduce((acc, s) => acc + s.despesasPendentes, 0);
  const frentistasTotal = summaries.reduce((acc, s) => acc + s.frentistasAtivos, 0);
  const emprestimosTotal = 0; // Já somado em dividasTotal no helper processarPosto, mas separado na interface... 
  // Nota: No código original, dividasTotal = dividas + emprestimos. Vamos manter essa lógica para consistência visual.

  // Totais Mês
  const vendasMes = summaries.reduce((acc, s) => acc + s.vendasMes, 0);
  const lucroMes = summaries.reduce((acc, s) => acc + s.lucroEstimadoMes, 0);

  // Margem Média Global (ponderada pelo volume seria melhor, mas média simples por enquanto)
  const margemMediaGlobal = summaries.reduce((acc, s) => acc + s.margemMedia, 0) / (summaries.length || 1);

  // Gerar Alertas
  const alertas = gerarAlertas(summaries);

  return {
    hoje: {
      vendas: vendasHoje,
      lucroEstimado: lucroHoje,
      dividas: dividasTotal,
      despesas: despesasTotal,
      emprestimos: emprestimosTotal,
      frentistasAtivos: frentistasTotal,
      margemMedia: margemMediaGlobal
    },
    mes: {
      vendas: vendasMes,
      lucroEstimado: lucroMes,
      dividas: dividasTotal,
      despesas: despesasTotal,
      emprestimos: emprestimosTotal,
      frentistasAtivos: frentistasTotal,
      margemMedia: margemMediaGlobal
    },
    posto: postoPrincipal,
    postosSummary: summaries,
    alertas,
    ultimaAtualizacao: new Date().toISOString()
  };
}

function gerarAlertas(summaries: PostoSummary[]): AlertaDashboard[] {
  const alerts: AlertaDashboard[] = [];

  summaries.forEach(s => {
    // Alerta de Margem Baixa
    if (s.margemMedia < 15 && s.margemMedia > 0) {
      alerts.push({
        type: 'warning',
        posto: s.posto.nome,
        message: `Margem média crítica: ${s.margemMedia.toFixed(1)}%`
      });
    }

    // Alerta de Prejuízo no dia
    if (s.lucroEstimadoHoje < 0) {
      alerts.push({
        type: 'danger',
        posto: s.posto.nome,
        message: 'Prejuízo operacional estimado hoje'
      });
    }

    // Alerta de Dívidas Altas (exemplo: > 50k)
    if (s.dividasTotal > 50000) {
      alerts.push({
        type: 'danger',
        posto: s.posto.nome,
        message: `Dívidas acumuladas altas: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.dividasTotal)}`
      });
    }
  });

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      posto: 'Geral',
      message: 'Operação estável. Sem alertas críticos.'
    });
  }

  return alerts;
}
