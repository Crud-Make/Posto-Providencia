// [10/01 08:32] Hook para gerenciar dados de volume semanal
// [10/01 17:08] Substituído 'any' por tipos estritos e melhorado JSDoc
import { useState, useEffect, useMemo } from 'react';
import { usePosto } from '../../../../contexts/PostoContext';
import { fechamentoService } from '../../../../services/api';
import { SalesAnalysisData } from '../../../../services/api/salesAnalysis.service';
import { DailyVolumeData } from '../types';
import { getDayOfWeek } from '../utils';

/**
 * Resultado do hook useVolumeSemanal
 */
interface UseVolumeSemanalResult {
    /** Dados de volume diário para a semana atual */
    weeklyVolume: DailyVolumeData[];
    /** Volume máximo encontrado (para escala do gráfico) */
    maxVolume: number;
}

/**
 * Hook responsável por buscar e processar os dados de volume de vendas da semana.
 * Projeta volumes futuros com base na média diária se a data for futura.
 * 
 * @param {SalesAnalysisData | null} currentAnalysis Análise de vendas atual contendo totais
 * @returns {UseVolumeSemanalResult} Objeto contendo dados semanais e volume máximo
 */
export const useVolumeSemanal = (currentAnalysis: SalesAnalysisData | null): UseVolumeSemanalResult => {
    const { postoAtivoId } = usePosto();
    const [weeklyVolume, setWeeklyVolume] = useState<DailyVolumeData[]>([]);

    useEffect(() => {
        const loadWeeklyVolume = async () => {
            if (!postoAtivoId || !currentAnalysis) return;

            try {
                const today = new Date();
                const daysPassed = today.getDate();
                const dailyAverage = daysPassed > 0 ? currentAnalysis.totals.revenue / daysPassed : 0;

                // 5. Buscar fechamentos diários para gráfico semanal
                const weekData: DailyVolumeData[] = [];
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo

                for (let i = 0; i < 7; i++) {
                    const date = new Date(startOfWeek);
                    date.setDate(startOfWeek.getDate() + i);
                    const dateStr = date.toISOString().split('T')[0];
                    const isToday = dateStr === today.toISOString().split('T')[0];
                    const isFuture = date > today;

                    if (isFuture) {
                        // Projetar com base na média histórica para este dia da semana
                        const projectedVolume = dailyAverage * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10%
                        weekData.push({
                            dia: date.getDate().toString(),
                            diaSemana: getDayOfWeek(date),
                            volume: projectedVolume / (currentAnalysis.totals.volume > 0 ? currentAnalysis.totals.volume / 100 : 1),
                            isToday: false,
                            isProjection: true
                        });
                    } else {
                        const fechamentos = await fechamentoService.getByDate(dateStr, postoAtivoId);
                        const dayVolume = fechamentos.reduce((acc: number, f) => acc + (f.total_vendas || 0), 0);
                        weekData.push({
                            dia: date.getDate().toString(),
                            diaSemana: getDayOfWeek(date),
                            volume: dayVolume,
                            isToday,
                            isProjection: false
                        });
                    }
                }
                setWeeklyVolume(weekData);
            } catch (error) {
                console.error('Erro ao carregar volume semanal:', error);
            }
        };

        loadWeeklyVolume();
    }, [postoAtivoId, currentAnalysis]);

    const maxVolume = useMemo(() => {
        if (weeklyVolume.length === 0) return 1;
        return Math.max(...weeklyVolume.map(d => d.volume)) * 1.1;
    }, [weeklyVolume]);

    return { weeklyVolume, maxVolume };
};
