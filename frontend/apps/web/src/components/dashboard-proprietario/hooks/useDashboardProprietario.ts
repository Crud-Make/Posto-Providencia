import { useState, useEffect, useCallback } from 'react';
import { hojeIso, mesAtualIso, intervaloDoMes, ehMesCorrente, type Periodo } from '../../../utils/periodo';
import { supabase } from '../../../services/supabase';
import { postoService, frentistaService } from '../../../services/api';
import { descreverErroDaApi } from '../../../services/api/base';
import { visaoDoProprietarioPelaApi } from '../../../services/api/proprietario.api';
import { DadosDashboard, PostoSummary } from '../types';
import { Posto } from '../../../types/database/index';
import { isSuccess } from '../../../types/ui/response-types';
import { carregarVisaoDaApi, type FalhaDaVisao } from './fonte-da-api';
import { consolidarDados, montarResumoDoDia, montarResumoDoMes, type VendaPeriodo } from './resumo-financeiro';

export { montarResumoDoMes, montarResumoDoDia, type VendaPeriodo } from './resumo-financeiro';

/** A frase da tela para cada falha do caminho da API. */
export function mensagemDaFalha(falha: FalhaDaVisao): string {
  return falha.tipo === 'sem_posto' ? 'Nenhum posto encontrado.' : descreverErroDaApi(falha);
}

interface UseDashboardReturn {
  dados: DadosDashboard | null;
  loading: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

/**
 * Hook do painel do proprietário: apura o LUCRO REAL do posto.
 *
 * @param mesSelecionado - Mês a exibir, ISO local `aaaa-mm`. Padrão: mês corrente.
 *                         Em mês histórico o intervalo é o mês fechado e a aba "Hoje"
 *                         vem zerada — ver {@link DadosDashboard.ehMesCorrente}.
 *
 * @remarks
 * Fórmula (canônica, `@posto/utils/lucro`):
 *
 *     lucro_real = lucro_bruto − despesas_operacionais_do_período
 *
 * Equivale a ratear a despesa por litro e descontá-la bico a bico — a distributiva
 * dá no mesmo, e por isso o rateio aparece aqui só como número exibido (R$/L), não
 * como etapa de cálculo.
 *
 * ⚠️ NÃO usa o `lucro_liquido` da RPC `get_dashboard_proprietario`, embora ele exista.
 * A RPC desconta, além das despesas, uma taxa de cartão calculada por transação
 * (`DÉBITO × 1,2%`, `CRÉDITO × 3,5%`, chumbadas no SQL). Isso contradiz
 * `packages/utils/src/lucro.ts:11-12`: no modelo da planilha a taxa de cartão **não** é
 * dedução por transação, é mais um item da lista de despesas mensais. Descontar dos dois
 * jeitos conta a taxa duas vezes nos meses em que ela está lançada como despesa.
 * Em julho/2026 a diferença é de R$ 57,50 — pequena, mas é erro de modelo, não de escala.
 *
 * Validado contra o golden `lucro-real.golden.spec.ts`: julho até o dia 24 dá
 * R$ 18.272,33 aqui contra R$ 18.272,31 no golden — 2 centavos de arredondamento.
 */
export function useDashboardProprietario(mesSelecionado: string = mesAtualIso()): UseDashboardReturn {
  const [dados, setDados] = useState<DadosDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErro(null);

    if (visaoDoProprietarioPelaApi()) {
      await carregarVisaoDaApi(mesSelecionado, hojeIso()).match(
        (lidos) => setDados(lidos),
        (falha) => setErro(mensagemDaFalha(falha)),
      );
      setLoading(false);
      return;
    }

    try {
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

      // `hojeIso()`, NUNCA `new Date().toISOString()`: o posto está em GMT-3, então a
      // partir das 21h locais o UTC já virou o dia seguinte. Com `toISOString()` a tela
      // consultava 01/08 às 21h de 31/07 — e as DUAS abas zeravam, porque `inicioDoMes`
      // também saltava para o mês novo. Todo dia, das 21h à meia-noite, o painel apagava.
      const hoje = hojeIso();
      const periodo = intervaloDoMes(mesSelecionado, hoje);
      const mesCorrente = ehMesCorrente(mesSelecionado, hoje);

      const summaries = await Promise.all(
        postos.map((posto) => processarPosto(posto, periodo, hoje, mesCorrente))
      );

      setDados(consolidarDados(summaries, postos[0], mesSelecionado, mesCorrente));
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setErro('Falha ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  }, [mesSelecionado]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  return { dados, loading, erro, recarregar: carregarDados };
}

// ============================================
// HELPERS (Lógica de Negócio)
// ============================================

async function buscarVendas(postoId: number, inicio: string, fim: string): Promise<VendaPeriodo> {
  const { data } = await supabase.rpc('get_dashboard_proprietario', {
    p_posto_id: postoId,
    p_data_inicio: inicio,
    p_data_fim: fim,
  });

  const linha = data?.[0];
  return {
    vendas: Number(linha?.total_vendas ?? 0),
    litros: Number(linha?.volume_total ?? 0),
    lucroBruto: Number(linha?.lucro_bruto ?? 0),
  };
}

async function buscarDespesas(postoId: number, inicio: string, fim: string): Promise<number[]> {
  const { data } = await supabase
    .from('Despesa')
    .select('valor')
    .eq('posto_id', postoId)
    .gte('data', inicio)
    .lte('data', fim);

  return (data ?? []).map((d) => Number(d.valor ?? 0));
}

async function processarPosto(
  posto: Posto,
  periodo: Periodo,
  hoje: string,
  mesCorrente: boolean
): Promise<PostoSummary> {
  const resFrentistas = await frentistaService.getAll(posto.id);
  const frentistas = isSuccess(resFrentistas) ? resFrentistas.data : [];
  const frentistasAtivos = frentistas.filter((f) => f.ativo).length;

  const [vendaHoje, vendaMes, despesasMes, pendentes, ultimoFech] = await Promise.all([
    // Em mês histórico não se consulta "hoje": a data cai fora do período exibido, e o
    // número apareceria ao lado de um mês a que não pertence.
    mesCorrente
      ? buscarVendas(posto.id, hoje, hoje)
      : Promise.resolve({ vendas: 0, litros: 0, lucroBruto: 0 }),
    buscarVendas(posto.id, periodo.inicio, periodo.fim),
    // Só as despesas do MÊS são buscadas: o dia recebe a fatia rateada, não os
    // lançamentos daquela data — ver `montarResumoDoDia`.
    buscarDespesas(posto.id, periodo.inicio, periodo.fim),
    supabase.from('Despesa').select('valor').eq('posto_id', posto.id).eq('status', 'pendente'),
    supabase
      .from('Fechamento')
      .select('data')
      .eq('posto_id', posto.id)
      .order('data', { ascending: false })
      .limit(1),
  ]);

  const resumoMes = montarResumoDoMes(vendaMes, despesasMes, frentistasAtivos);

  return {
    posto,
    hoje: montarResumoDoDia(vendaHoje, resumoMes.rateioPorLitro, resumoMes.temDespesa, frentistasAtivos),
    mes: resumoMes,
    despesasPendentes: (pendentes.data ?? []).reduce((acc, d) => acc + Number(d.valor ?? 0), 0),
    ultimoFechamento: ultimoFech.data?.[0]?.data ?? null,
  };
}
