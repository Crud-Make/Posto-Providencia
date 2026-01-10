// [10/01 08:38] Hook para buscar os melhores frentistas
import { useState, useEffect } from 'react';
import { usePosto } from '../../../../contexts/PostoContext';
import { frentistaService, fechamentoFrentistaService } from '../../../../services/api';
import { AttendantPerformance } from '../types';

export const useTopPerformers = () => {
    const { postoAtivoId } = usePosto();
    const [topPerformers, setTopPerformers] = useState<AttendantPerformance[]>([]);

    useEffect(() => {
        const loadTopPerformers = async () => {
            if (!postoAtivoId) return;

            try {
                const frentistas = await frentistaService.getAll(postoAtivoId);
                const performanceData: AttendantPerformance[] = [];

                // Limit to first 5 or all if less
                // Note: ideally we should process all then sort, but original code slices first?
                // Original: for (const f of frentistas.slice(0, 5))
                // This implies it only checks the first 5 frentistas returned by getAll. 
                // If getAll returns them alphabetically, this might be biased.
                // But refactoring shouldn't change logic unless bug.
                // However, "Top Performers" usually implies sorting ALL then taking top 5.
                // The original code slices first. I will keep it to avoid breaking changes in behavior, 
                // but adding a comment that this might be improved later.
                
                for (const f of frentistas.slice(0, 5)) {
                    const historico = await fechamentoFrentistaService.getHistoricoDiferencas(f.id, 30);
                    const vendaMedia = historico.length > 0 
                        ? historico.reduce((acc: number, h: any) => acc + (h.valor_conferido || 0), 0) / historico.length
                        : 0;
                    const diferencaAcumulada = historico.reduce((acc: number, h: any) => acc + (h.diferenca_calculada || 0), 0);

                    performanceData.push({
                        nome: f.nome,
                        vendaMedia,
                        diferencaAcumulada,
                        turnos: historico.length
                    });
                }
                
                // Sort by average sales
                setTopPerformers(performanceData.sort((a, b) => b.vendaMedia - a.vendaMedia));

            } catch (error) {
                console.error('Error loading top performers:', error);
            }
        };

        loadTopPerformers();
    }, [postoAtivoId]);

    return { topPerformers };
};
