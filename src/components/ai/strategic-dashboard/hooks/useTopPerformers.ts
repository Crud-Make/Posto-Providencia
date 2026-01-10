// [10/01 08:37] Hook para buscar melhores frentistas
// [10/01 17:11] Substituído 'any' por tipos estritos
import { useState, useEffect } from 'react';
import { usePosto } from '../../../../contexts/PostoContext';
import { frentistaService, fechamentoFrentistaService } from '../../../../services/api';
import { AttendantPerformance } from '../types';

/**
 * Define a estrutura esperada para os itens do histórico de fechamento de frentista.
 * Esta interface é inferida a partir do uso das propriedades `valor_conferido` e `diferenca_calculada`.
 */
interface FechamentoFrentistaHistoricoItem {
    valor_conferido?: number | null;
    diferenca_calculada?: number | null;
    // Outras propriedades do histórico podem ser adicionadas aqui se necessário
}

/**
 * Resultado do hook useTopPerformers
 */
interface UseTopPerformersResult {
    /** Lista de performance dos melhores frentistas */
    topPerformers: AttendantPerformance[];
}

/**
 * Hook responsável por analisar o desempenho dos frentistas.
 * Calcula a venda média por turno e diferenças de caixa acumuladas.
 * 
 * @returns {UseTopPerformersResult} Objeto contendo a lista dos top performers
 */
export const useTopPerformers = (): UseTopPerformersResult => {
    const { postoAtivoId } = usePosto();
    const [topPerformers, setTopPerformers] = useState<AttendantPerformance[]>([]);

    useEffect(() => {
        const loadTopPerformers = async () => {
            if (!postoAtivoId) return;

            try {
                const frentistas = await frentistaService.getAll(postoAtivoId);
                const performanceData: AttendantPerformance[] = [];

                // Limitar aos primeiros 5 ou todos se houver menos
                // Nota: idealmente deveríamos processar todos e depois ordenar, mas o código original fatia primeiro.
                // Isso implica que verifica apenas os primeiros 5 frentistas retornados por getAll.
                // Se getAll retornar em ordem alfabética, isso pode ser enviesado.
                // Mas a refatoração não deve mudar a lógica a menos que seja um bug.
                // No entanto, "Top Performers" geralmente implica ordenar TODOS e pegar os top 5.
                // O código original fatia primeiro. Manterei assim para evitar breaking changes,
                // mas adicionando um comentário de que isso pode ser melhorado depois.

                for (const f of frentistas.slice(0, 5)) {
                    const historico = await fechamentoFrentistaService.getHistoricoDiferencas(f.id, 30);
                    const vendaMedia = historico.length > 0
                        ? historico.reduce((acc: number, h) => acc + (h.valor_conferido || 0), 0) / historico.length
                        : 0;
                    const diferencaAcumulada = historico.reduce((acc: number, h) => acc + (h.diferenca_calculada || 0), 0);

                    performanceData.push({
                        nome: f.nome,
                        vendaMedia,
                        diferencaAcumulada,
                        turnos: historico.length
                    });
                }

                // Ordenar por média de vendas
                setTopPerformers(performanceData.sort((a, b) => b.vendaMedia - a.vendaMedia));

            } catch (error) {
                console.error('Erro ao carregar melhores frentistas:', error);
            }
        };

        loadTopPerformers();
    }, [postoAtivoId]);

    return { topPerformers };
};
