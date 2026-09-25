/**
 * Hook para gerenciar combustíveis no Registro de Compras.
 *
 * @remarks
 * Estado híbrido: string nos campos que o gerente digita, número no que vem do
 * banco. **Só três coisas se digitam aqui** — a compra do dia (litros e reais)
 * e a régua do tanque. Todo o resto é lido do mês:
 *
 * - **Vendas** (inicial, fechamento, litros, faturamento) vêm de `Leitura`,
 *   consolidadas por `encerranteMensal` — o mesmo módulo da Planilha do Mês.
 *   A planilha real redigita esses números no resumo (`D5:E10` são literais)
 *   porque não tem vínculo com as abas diárias; o sistema tem, e usa.
 * - **Compras já lançadas no mês** vêm de `Compra`: o custo médio do litro é
 *   `Σ R$ ÷ Σ L` do mês inteiro (`F16 = E16/D16`), não só da compra que está
 *   sendo digitada.
 * - **Estoque anterior** é a última régua ANTES do mês (`HistoricoTanque`),
 *   o `Ano passado.` da planilha (`D24`) — nunca `Tanque.estoque_atual`, que
 *   era um contador que ninguém subtraía.
 *
 * Nada de `preco_custo` do cadastro: é um preço só, o de hoje, e aplicá-lo ao
 * mês é o bug do "preço único" (ver `@posto/utils/resumo-produto`).
 *
 * #103: a FONTE é escolhida pela flag da tela ({@link carregarEntradaDoRegistro}) — Supabase ou
 * API Laravel — e a conta é uma só ({@link montarRegistroDoMes}).
 */
import { useState, useEffect, useCallback } from 'react';
import { usePosto } from '../../../contexts/usePosto';
import { intervaloDoMes, hojeIso } from '../../../utils/periodo';
import { carregarEntradaDoRegistro } from './fonteDoRegistro';
import { montarRegistroDoMes } from './montarRegistroDoMes';
import type { CampoDigitado, CombustivelHibrido, VendaBicoMes } from './tipos-do-registro';

export { CAMPOS_DIGITADOS } from './tipos-do-registro';
export type { CampoDigitado, CombustivelHibrido, VendaBicoMes } from './tipos-do-registro';

/**
 * @param mesIso - Mês exibido, `aaaa-mm`. A tela é MENSAL como a planilha:
 *        a compra de hoje entra no custo do mês inteiro.
 */
export const useCombustiveisHibridos = (mesIso: string) => {
    const { postoAtivoId } = usePosto();
    const [loading, setLoading] = useState(true);
    const [combustiveis, setCombustiveis] = useState<CombustivelHibrido[]>([]);
    /** Último dia em que TODOS os bicos estavam fechados; `null` sem leitura no mês. */
    const [ultimoDiaFechado, setUltimoDiaFechado] = useState<number | null>(null);
    const [vendasBicos, setVendasBicos] = useState<VendaBicoMes[]>([]);

    /** Carrega cadastro, vendas, compras e régua do mês. */
    const loadData = useCallback(async () => {
        if (postoAtivoId === null || postoAtivoId === 0) return;

        try {
            setLoading(true);
            const lido = await carregarEntradaDoRegistro(postoAtivoId, intervaloDoMes(mesIso, hojeIso()));
            if (lido.isErr()) {
                console.error('Erro ao carregar dados:', lido.error);
                return;
            }
            const mes = montarRegistroDoMes(lido.value);
            setUltimoDiaFechado(mes.ultimoDiaFechado);
            setVendasBicos(mes.vendasBicos);
            setCombustiveis(mes.combustiveis);
        } finally {
            setLoading(false);
        }
    }, [postoAtivoId, mesIso]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    /** Atualiza um campo digitado de um combustível no estado local */
    const updateCombustivel = (id: number, field: CampoDigitado, value: string) => {
        setCombustiveis((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    };

    return {
        combustiveis,
        setCombustiveis,
        vendasBicos,
        ultimoDiaFechado,
        loading,
        loadData,
        updateCombustivel,
    };
};
