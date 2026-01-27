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

  // ✅ DADOS REAIS DE LUCRO - Hoje
  const { data: dadosHoje } = await supabase
    .rpc('get_dashboard_proprietario', {
      p_posto_id: posto.id,
      p_data_inicio: today,
      p_data_fim: today
    });

  const vendasHoje = dadosHoje?.[0]?.total_vendas || 0;
  const lucroHoje = dadosHoje?.[0]?.lucro_liquido || 0;
  const volumeHoje = dadosHoje?.[0]?.volume_total || 0;

  // ✅ DADOS REAIS DE LUCRO - Mês
  const { data: dadosMes } = await supabase
    .rpc('get_dashboard_proprietario', {
      p_posto_id: posto.id,
      p_data_inicio: startOfMonth,
      p_data_fim: today
    });

  const vendasMes = dadosMes?.[0]?.total_vendas || 0;
  const lucroMes = dadosMes?.[0]?.lucro_liquido || 0;

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

  // Despesas do Mês (todas as despesas do período, pagas ou pendentes)
  const { data: despesasMes } = await supabase
    .from('Despesa')
    .select('valor')
    .eq('posto_id', posto.id)
    .gte('data', startOfMonth)
    .lte('data', today);

  const despesasTotalMes = (despesasMes || []).reduce((acc, d) => acc + (d.valor || 0), 0);

  // Despesas Pendentes (apenas para alertas)
  const { data: despesasPendentes } = await supabase
    .from('Despesa')
    .select('valor')
    .eq('posto_id', posto.id)
    .eq('status', 'pendente');

  const despesasPendentesTotal = (despesasPendentes || []).reduce((acc, d) => acc + (d.valor || 0), 0);

  // Margem REAL calculada a partir do lucro e vendas
  const margemMedia = vendasMes > 0 ? (lucroMes / vendasMes) * 100 : 0;

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
    lucroEstimadoHoje: lucroHoje, // Agora é REAL, não estimado
    lucroEstimadoMes: lucroMes,   // Agora é REAL, não estimado
    margemMedia,
    frentistasAtivos,
    dividasTotal: dividasTotal + emprestimosTotal,
    despesasPendentes: despesasPendentesTotal,
    despesasTotalMes: despesasTotalMes,
    ultimoFechamento: ultimoFech?.[0]?.data || null
  };
}

function consolidarDados(summaries: PostoSummary[], postoPrincipal: Posto): DadosDashboard {
  // Totais Hoje
  const vendasHoje = summaries.reduce((acc, s) => acc + s.vendasHoje, 0);
  const lucroHoje = summaries.reduce((acc, s) => acc + s.lucroEstimadoHoje, 0);
  const dividasTotal = summaries.reduce((acc, s) => acc + s.dividasTotal, 0);
  const despesasPendentesTotal = summaries.reduce((acc, s) => acc + s.despesasPendentes, 0);
  const despesasTotalMes = summaries.reduce((acc, s) => acc + s.despesasTotalMes, 0);
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
      despesas: despesasPendentesTotal,
      emprestimos: emprestimosTotal,
      frentistasAtivos: frentistasTotal,
      margemMedia: margemMediaGlobal
    },
    mes: {
      vendas: vendasMes,
      lucroEstimado: lucroMes,
      dividas: dividasTotal,
      despesas: despesasTotalMes,
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
