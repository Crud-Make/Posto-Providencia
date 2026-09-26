import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePosto } from '../../../contexts/usePosto';
import { usePeriodo } from '../../../contexts/usePeriodo';
import { ProfitabilityItem, Margins } from '../types';
import { paraMesLocal, deIsoLocal } from '@posto/utils';
import { calculatePrice, calculateProfit } from './calculos-analise-custos';
import { carregarAnalise } from './carregar-analise';

export const useAnaliseCustos = () => {
    const { postoAtivoId } = usePosto();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ProfitabilityItem[]>([]);
    /** Produtos vendidos no mês sem compra — sem custo, fora da análise. */
    const [produtosSemCompra, setProdutosSemCompra] = useState<readonly string[]>([]);
    const [margins, setMargins] = useState<Margins>({});
    // O mês vem do contexto: é o mesmo período das demais telas de análise. A tela pensa em
    // `Date`, então ele é derivado do mês compartilhado — sempre pelo dia 1, em hora local.
    const { mes, definirMes } = usePeriodo();
    const currentDate = useMemo(() => deIsoLocal(`${mes}-01`), [mes]);

    const loadData = useCallback(async (date: Date) => {
        try {
            setLoading(true);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            // Fonte (API ou Supabase) e contas em ./carregar-analise; falha zera a tela, como antes.
            const result = await carregarAnalise(year, month, postoAtivoId);
            if (result.isErr()) {
                console.error("Erro ao carregar dados de lucratividade:", result.error);
                setData([]);
                setProdutosSemCompra([]);
                return;
            }
            const { itens, produtosSemCompra: semCompra } = result.value;
            setData(itens);
            setProdutosSemCompra(semCompra);

            // Inicializa margens simuladas com a margem bruta real
            const initialMargins: Margins = {};
            itens.forEach((item) => {
                const currentMarginPercent = item.precoVenda > 0 ? (item.margemBrutaL / item.precoVenda) * 100 : 0;
                initialMargins[item.combustivelId] = Math.max(0, Math.round(currentMarginPercent * 10) / 10);
            });
            setMargins(initialMargins);
        } catch (error) {
            console.error("Erro ao carregar dados de lucratividade:", error);
        } finally {
            setLoading(false);
        }
    }, [postoAtivoId]);

    useEffect(() => {
        loadData(currentDate);
    }, [currentDate, loadData]);

    /** Anda `passo` meses a partir do mês atual, escrevendo no período compartilhado. */
    const andarMes = (passo: number) =>
        definirMes(paraMesLocal(new Date(currentDate.getFullYear(), currentDate.getMonth() + passo, 1)));

    const handlePrevMonth = () => andarMes(-1);
    const handleNextMonth = () => andarMes(1);

    const exportToCSV = () => {
        if (!data.length) return;

        const headers = ["Produto", "Custo Médio", "Despesa/L", "Custo Total/L", "Preço Atual", "Volume (L)", "Receita", "Lucro Total", "Margem Líquida"];
        const rows = data.map(item => [
            item.nome,
            item.custoMedio.toFixed(2),
            item.despOperacional.toFixed(2),
            item.custoTotalL.toFixed(2),
            item.precoVenda.toFixed(2),
            item.volumeVendido.toFixed(0),
            item.receitaBruta.toFixed(2),
            item.lucroTotal.toFixed(2),
            item.margemLiquidaL.toFixed(2)
        ]);

        const content = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        // `paraMesLocal`: com `toISOString()` o arquivo saía nomeado com o mês seguinte
        // quando exportado depois das 21h.
        link.setAttribute("download", `analise-custo-${paraMesLocal(currentDate)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Modelo de markup em ./calculos-analise-custos, exercitado pelo golden
    // ao lado contra a canônica (onda 2.2).
    return {
        loading,
        data,
        produtosSemCompra,
        margins,
        setMargins,
        currentDate,
        handlePrevMonth,
        handleNextMonth,
        exportToCSV,
        calculatePrice,
        calculateProfit
    };
};
