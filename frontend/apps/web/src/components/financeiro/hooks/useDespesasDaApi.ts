import { useCallback, useEffect, useState } from 'react';
import { descreverErroDaApi } from '../../../services/api/base';
import { lerDespesasDoPeriodo, type DespesaDaApi } from '../../../services/api/despesas.api';
import type { FiltrosFinanceiros } from './useFiltrosFinanceiros';
import type { DadosFinanceiros, Transacao } from './useFinanceiro';

/**
 * A aba Receitas e Despesas no modo API (#103), fatia 1: só as DESPESAS do período, pela API.
 *
 * Mesmo contrato de `useFinanceiro` para a tela não mudar: `transacoes` com as despesas no mesmo
 * formato (`desp-<id>`, categoria ou 'Geral', ordem por data decrescente, filtros de tipo e
 * categoria), que é tudo o que `ListaDespesas` e `DespesasPorCategoria` leem. O resumo (receitas,
 * lucro, margem) depende de leituras, recebimentos e compras que ainda não vêm por esta aba: sai
 * vazio, e a tela não o mostra neste modo.
 */

/** A despesa da API na transação da tela. Exportada para o teste. */
export function transacaoDaDespesa(d: DespesaDaApi): Transacao {
    return { id: `desp-${d.id}`, tipo: 'despesa', categoria: d.categoria ?? 'Geral', descricao: d.descricao, valor: Number(d.valor), data: d.data, origem: 'despesa' };
}

/** As despesas do período na forma de `DadosFinanceiros`, com os filtros locais da tela. Exportada para o teste. */
export function dadosDasDespesas(despesas: readonly DespesaDaApi[], filtros: FiltrosFinanceiros): DadosFinanceiros {
    const soDespesa = filtros.tipoTransacao === 'receita' ? [] : despesas.map(transacaoDaDespesa);
    const transacoes = soDespesa
        .filter((t) => filtros.categoria === undefined || filtros.categoria === '' || t.categoria === filtros.categoria)
        .sort((a, b) => b.data.localeCompare(a.data));
    return {
        receitas: { total: 0, vendas: 0, extras: 0 },
        despesas: { total: null, operacionais: 0, compras: null },
        lucro: { bruto: null, liquido: null, margem: null },
        produtosSemCompra: [],
        transacoes,
    };
}

export function useDespesasDaApi(filtros: FiltrosFinanceiros): {
    dados: DadosFinanceiros;
    carregando: boolean;
    erro: string | null;
    recarregar: () => Promise<void>;
} {
    const [dados, setDados] = useState<DadosFinanceiros>(() => dadosDasDespesas([], filtros));
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const recarregar = useCallback(async (): Promise<void> => {
        if (filtros.postoId === undefined || filtros.dataInicio === '' || filtros.dataFim === '') return;
        const lido = await lerDespesasDoPeriodo(filtros.postoId, filtros.dataInicio, filtros.dataFim);
        lido.match(
            (despesas) => { setDados(dadosDasDespesas(despesas, filtros)); setErro(null); },
            (e) => setErro(e.tipo === 'recusado' ? e.mensagem : descreverErroDaApi(e)),
        );
        setCarregando(false);
    }, [filtros]);

    useEffect(() => {
        let vivo = true;
        if (filtros.postoId === undefined) return undefined;
        void lerDespesasDoPeriodo(filtros.postoId, filtros.dataInicio, filtros.dataFim).match(
            (despesas) => { if (vivo) { setDados(dadosDasDespesas(despesas, filtros)); setErro(null); setCarregando(false); } },
            (e) => { if (vivo) { setErro(e.tipo === 'recusado' ? e.mensagem : descreverErroDaApi(e)); setCarregando(false); } },
        );
        return () => { vivo = false; };
    }, [filtros]);

    return { dados, carregando, erro, recarregar };
}
