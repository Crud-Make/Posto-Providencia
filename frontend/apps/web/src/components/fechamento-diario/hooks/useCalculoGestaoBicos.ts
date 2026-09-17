import { useMemo } from 'react';
import { BicoComDetalhes } from '../../../types/fechamento';
import { corDoProduto, lucroCombustivel, margemPercentual } from '@posto/utils';

interface Leitura {
    inicial: string;
    fechamento: string;
}

interface LeituraMap {
    [bicoId: number]: Leitura;
}

/**
 * Hook para cálculos da aba Gestão de Bicos
 * Centraliza a lógica de agregação de volumes, faturamento e margens.
 *
 * @param custoMedioPorProduto - Custo médio de compra do mês, por nome de
 *        produto (`useCustoMensal`). Produto sem compra no mês fica `null` —
 *        lucro não apurável, nunca estimado por margem fixa (era o bug: uma
 *        margem % hardcoded por tipo de combustível divergia até 67% do
 *        lucro real, conferido contra a planilha em jan/2026).
 * @param despesaOperacionalLitro - Rateio da despesa do mês (R$/L), de
 *        `despesaOperacionalPorLitro` — mesmo número que o Resumo Mensal usa.
 */
export const useCalculoGestaoBicos = (
    bicos: BicoComDetalhes[],
    leituras: LeituraMap,
    custoMedioPorProduto: Record<string, number | null>,
    despesaOperacionalLitro: number
) => {
    return useMemo(() => {
        // Dados por Combustível
        const porCombustivel: Record<string, { volume: number, faturamento: number, meta: number, cor: string }> = {};

        // Cálculo por bico (função pura do .map, sem mutar variável de fora do closure —
        // o React Compiler não pode garantir que uma reatribuição dentro do callback do
        // .map termine junto com o render atual, daí o aviso de immutability).
        const detalhes = bicos.map(bico => {
            // 1. Obter e sanitizar leituras
            const leitura = leituras[bico.id] || { inicial: '0,000', fechamento: '0,000' };
            const inicial = parseFloat(leitura.inicial.replace(/\./g, '').replace(',', '.')) || 0;
            const final = parseFloat(leitura.fechamento.replace(/\./g, '').replace(',', '.')) || 0;

            // 2. Calcular Volume
            const volume = final >= inicial ? final - inicial : 0;

            // 3. Preço de venda (já resolvido pro dia — cadastro ou o editado
            // manualmente na aba Leituras de Bomba, ver useCarregamentoDados)
            const precoVenda = Number(bico.combustivel?.preco_venda || 0);
            const nomeCombustivel = bico.combustivel?.nome || 'Desconhecido';

            // 4. Custo do mês: custo médio de compra do produto + rateio de
            // despesa operacional. Sem compra lançada no mês, o custo é
            // desconhecido — o lucro não é apurável, nunca vira zero nem uma
            // estimativa por margem fixa (número plausível e errado).
            const custoMedio = custoMedioPorProduto[nomeCombustivel] ?? null;
            const apurado = custoMedio !== null && precoVenda > 0;

            const faturamento = volume * precoVenda;
            const lucro = apurado
                ? lucroCombustivel({
                    litros: volume,
                    precoVenda,
                    custoMedio: custoMedio as number,
                    despesaOperacionalLitro
                })
                : 0;
            const margem = apurado ? margemPercentual(lucro, faturamento) : 0;

            return {
                id: bico.id,
                numero: bico.numero,
                status: bico.ativo ? 'Ativo' : 'Inativo',
                combustivel: nomeCombustivel,
                codigo: bico.combustivel?.codigo ?? null,
                ilha: `Bomba ${bico.bomba?.nome || '--'}`,
                volume,
                faturamento,
                margem,
                lucro,
                apurado,
                // Meta de performance: 5000L/bico (exemplo)
                performance: Math.min((volume / 5000) * 100, 100)
            };
        });

        // 5. Agregação Global e por Combustível — laço direto no corpo do useMemo (não
        // dentro de outro closure), então mutar `volumeTotal`/`porCombustivel` aqui é seguro
        // e termina junto com este cálculo, sem sobreviver ao render.
        let volumeTotal = 0;
        let faturamentoTotal = 0;
        let lucroTotal = 0;

        for (const item of detalhes) {
            volumeTotal += item.volume;
            faturamentoTotal += item.faturamento;
            lucroTotal += item.lucro;

            if (!porCombustivel[item.combustivel]) {
                // Cor da planilha pelo código do combustível — a mesma do resto
                // do sistema. Antes: roxo/verde/laranja por trecho do nome.
                const cor = corDoProduto(item.codigo).fundo;

                // Meta simulada baseada em histórico (pode ser parametrizada futuramente)
                porCombustivel[item.combustivel] = { volume: 0, faturamento: 0, meta: 100000, cor };
            }
            porCombustivel[item.combustivel].volume += item.volume;
            porCombustivel[item.combustivel].faturamento += item.faturamento;
        }

        const listaBicos = [...detalhes].sort((a, b) => b.faturamento - a.faturamento);

        // `false` quando algum bico com volume vendido ficou sem custo apurável —
        // o lucroTotal exibido é só a soma do que deu pra apurar, não o mês inteiro.
        const apurado = detalhes.every(d => d.apurado || d.volume === 0);

        return { volumeTotal, faturamentoTotal, lucroTotal, listaBicos, porCombustivel, apurado };
    }, [bicos, leituras, custoMedioPorProduto, despesaOperacionalLitro]);
};
