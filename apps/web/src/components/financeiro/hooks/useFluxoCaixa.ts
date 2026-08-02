/**
 * Hook para cálculo de fluxo de caixa diário/mensal.
 *
 * Processa os dados financeiros e gera séries temporais
 * para visualização em gráfico de fluxo de caixa.
 */
import { useMemo } from 'react';
import { DadosFinanceiros } from './useFinanceiro';
import { deIsoLocal, paraIsoLocal } from '@posto/utils';

/**
 * Interface representando um ponto de dados no gráfico de fluxo de caixa.
 */
export interface SerieFluxoCaixa {
  /** Data do ponto (YYYY-MM-DD) */
  data: string;
  /** Total de receitas no período */
  receitas: number;
  /** Total de despesas no período */
  despesas: number;
  /** Saldo do período (receitas - despesas) */
  saldo: number;
  /** Saldo acumulado até este ponto */
  saldoAcumulado: number;
}

/**
 * Interface de retorno do hook useFluxoCaixa.
 */
interface UseFluxoCaixaReturn {
  /** Array de séries temporais para gráficos */
  series: SerieFluxoCaixa[];
  /** Totais consolidados do período */
  totais: {
    entradas: number;
    saidas: number;
    saldo: number;
  };
}

/**
 * Hook para processar e estruturar dados de fluxo de caixa.
 * 
 * @param dados - Dados financeiros brutos do hook useFinanceiro
 * @param granularidade - Nível de agrupamento temporal (diario, semanal, mensal)
 * @returns Séries temporais prontas para visualização e totais
 */
export function useFluxoCaixa(
  dados: DadosFinanceiros, 
  granularidade: 'diario' | 'semanal' | 'mensal' = 'diario'
): UseFluxoCaixaReturn {
  return useMemo(() => {
    const mapa = new Map<string, { receitas: number; despesas: number }>();

    dados.transacoes.forEach(t => {
      let dataKey = t.data.split('T')[0];

      if (granularidade === 'mensal') {
        dataKey = dataKey.substring(0, 7); // YYYY-MM
      } else if (granularidade === 'semanal') {
        // `deIsoLocal`, não `new Date(dataKey)`: o construtor com string lê a data como
        // meia-noite UTC, que em GMT-3 é 21h do dia ANTERIOR. Então `getDay()`/`getDate()`
        // saíam deslocados um dia e a semana era montada errada — 31/07 caía na semana do 30.
        const date = deIsoLocal(dataKey);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // ajuste quando é domingo
        const monday = new Date(date.setDate(diff));
        dataKey = paraIsoLocal(monday);
      }

      if (!mapa.has(dataKey)) {
        mapa.set(dataKey, { receitas: 0, despesas: 0 });
      }
      
      const entry = mapa.get(dataKey)!;
      if (t.tipo === 'receita') {
        entry.receitas += t.valor;
      } else {
        entry.despesas += t.valor;
      }
    });

    // Converter para array e ordenar
    // [26/07 refactor] Acumulação feita em loop sequencial na mesma função (em vez de
    // mutar `saldoAcumulado` de dentro do callback de `.map`), evitando reatribuir uma
    // variável de fora depois que a função que a "fechou" já retornou seu valor.
    const entradasOrdenadas = Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    const series: SerieFluxoCaixa[] = [];
    let saldoAcumulado = 0;
    for (const [data, valores] of entradasOrdenadas) {
      const saldoDia = valores.receitas - valores.despesas;
      saldoAcumulado += saldoDia;
      series.push({
        data,
        receitas: valores.receitas,
        despesas: valores.despesas,
        saldo: saldoDia,
        saldoAcumulado
      });
    }

    return {
      series,
      totais: {
        entradas: dados.receitas.total,
        saidas: dados.despesas.total,
        saldo: dados.lucro.liquido
      }
    };
  }, [dados, granularidade]);
}
