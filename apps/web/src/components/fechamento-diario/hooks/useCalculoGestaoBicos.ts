import { useMemo } from 'react';
import { BicoComDetalhes } from '../../../types/fechamento';

// Margens de lucro padrão (fallback) conforme regras de negócio
// Fonte: docs/regras-negocio.md
const MARGENS_PADRAO: Record<string, number> = {
    'Gasolina': 0.1179, // ~11.79%
    'Aditivada': 0.1153, // ~11.53%
    'Etanol': 0.0902,   // ~9.02%
    'Diesel': 0.0273    // ~2.73%
};

interface LeituraMap {
    [bicoId: number]: {
        leitura_inicial?: number | string;
        leitura_final?: number | string | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    };
}

/**
 * Hook para cálculos da aba Gestão de Bicos
 * Centraliza a lógica de agregação de volumes, faturamento e margens.
 */
export const useCalculoGestaoBicos = (bicos: BicoComDetalhes[], leituras: LeituraMap) => {
    return useMemo(() => {
        let volumeTotal = 0;
        let faturamentoTotal = 0;
        let lucroTotal = 0;

        // Dados por Combustível
        const porCombustivel: Record<string, { volume: number, faturamento: number, meta: number, cor: string }> = {};

        // Lista detalhada para tabela
        const listaBicos = bicos.map(bico => {
            // 1. Obter e sanitizar leituras
            const leitura = leituras[bico.id] || { leitura_inicial: 0, leitura_final: 0 };
            const inicial = Number(leitura.leitura_inicial || 0);
            const final = Number(leitura.leitura_final || inicial);

            // 2. Calcular Volume
            const volume = final >= inicial ? final - inicial : 0;

            // 3. Obter Preços
            const precoVenda = Number(bico.combustivel?.preco_venda || 0);
            const nomeCombustivel = bico.combustivel?.nome || 'Desconhecido';

            // Tenta obter custo do cadastro, senão estima pela margem padrão do tipo
            let precoCusto = Number(bico.combustivel?.preco_custo || 0);

            if (precoCusto <= 0 && precoVenda > 0) {
                // Fallback de margem baseado no nome do combustível
                const margemEstimada = Object.entries(MARGENS_PADRAO)
                    .find(([key]) => nomeCombustivel.includes(key))?.[1] || 0.10; // 10% default

                precoCusto = precoVenda * (1 - margemEstimada);
            }

            // 4. Calcular Financeiro
            const faturamento = volume * precoVenda;
            const lucro = volume * (precoVenda - precoCusto);
            const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

            // 5. Agregação Global
            volumeTotal += volume;
            faturamentoTotal += faturamento;
            lucroTotal += lucro;

            // 6. Agregação por Combustível
            if (!porCombustivel[nomeCombustivel]) {
                let cor = '#3B82F6'; // Default Blue
                if (nomeCombustivel.includes('Gasolina')) cor = '#A855F7'; // Roxo
                if (nomeCombustivel.includes('Diesel')) cor = '#22C55E'; // Verde
                if (nomeCombustivel.includes('Etanol')) cor = '#F97316'; // Laranja

                // Meta simulada baseada em histórico (pode ser parametrizada futuramente)
                porCombustivel[nomeCombustivel] = { volume: 0, faturamento: 0, meta: 100000, cor };
            }
            porCombustivel[nomeCombustivel].volume += volume;
            porCombustivel[nomeCombustivel].faturamento += faturamento;

            return {
                id: bico.id,
                numero: bico.numero,
                status: bico.ativo ? 'Ativo' : 'Inativo',
                combustivel: nomeCombustivel,
                ilha: `Bomba ${bico.bomba?.nome || '--'}`,
                volume,
                faturamento,
                margem,
                lucro,
                // Meta de performance: 5000L/bico (exemplo)
                performance: Math.min((volume / 5000) * 100, 100)
            };
        }).sort((a, b) => b.faturamento - a.faturamento);

        return { volumeTotal, faturamentoTotal, lucroTotal, listaBicos, porCombustivel };
    }, [bicos, leituras]);
};
