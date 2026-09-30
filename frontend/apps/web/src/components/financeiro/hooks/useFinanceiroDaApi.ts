import { useCallback, useEffect, useState } from 'react';
import { descreverErroDaApi, type ErroDaApi } from '../../../services/api/base';
import { lerPeriodoDaAbaPelaApi } from '../../../services/api/financeiro.api';
import { insumosDaApi } from './insumos-financeiros';
import { montarDadosFinanceiros } from './montar-dados-financeiros';
import type { FiltrosFinanceiros } from './useFiltrosFinanceiros';
import type { DadosFinanceiros } from './useFinanceiro';

/**
 * A aba Receitas e Despesas no modo API (#103): o mesmo `DadosFinanceiros` de `useFinanceiro` —
 * resumo, lucro, margem, gráfico e lista —, lendo o período pela API e passando pela MESMA
 * `montarDadosFinanceiros`. A paridade com o Supabase é travada por `paridade-supabase-api.test.ts`.
 */
const VAZIO: DadosFinanceiros = {
    receitas: { total: 0, vendas: 0, extras: 0 },
    despesas: { total: 0, operacionais: 0, compras: 0 },
    lucro: { bruto: 0, liquido: 0, margem: 0 },
    produtosSemCompra: [],
    transacoes: [],
};

const mensagem = (e: ErroDaApi): string => (e.tipo === 'recusado' ? e.mensagem : descreverErroDaApi(e));

export function useFinanceiroDaApi(filtros: FiltrosFinanceiros): {
    dados: DadosFinanceiros;
    carregando: boolean;
    erro: string | null;
    recarregar: () => Promise<void>;
} {
    const [dados, setDados] = useState<DadosFinanceiros>(VAZIO);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [versao, setVersao] = useState(0);

    useEffect(() => {
        const { postoId, dataInicio, dataFim } = filtros;
        if (postoId === undefined || dataInicio === '' || dataFim === '') return undefined;
        let vivo = true;
        void lerPeriodoDaAbaPelaApi(postoId, dataInicio, dataFim).match(
            (periodo) => {
                if (!vivo) return;
                setDados(montarDadosFinanceiros(insumosDaApi(periodo), filtros));
                setErro(null);
                setCarregando(false);
            },
            (e) => {
                if (!vivo) return;
                setErro(mensagem(e));
                setCarregando(false);
            },
        );
        return () => { vivo = false; };
    }, [filtros, versao]);

    const recarregar = useCallback(async (): Promise<void> => {
        setVersao((v) => v + 1);
        await Promise.resolve();
    }, []);

    return { dados, carregando, erro, recarregar };
}
