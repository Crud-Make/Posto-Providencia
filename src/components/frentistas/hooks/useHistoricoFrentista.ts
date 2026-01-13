import { useState, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import { HistoricoFrentista } from '../types';

export const useHistoricoFrentista = () => {
    const [historico, setHistorico] = useState<HistoricoFrentista[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    const carregarHistorico = useCallback(async (frentistaId: string) => {
        if (!frentistaId) {
            setHistorico([]);
            return;
        }

        setLoadingHistorico(true);
        try {
            const { data, error } = await supabase
                .from('FechamentoFrentista')
                .select(`
                    *,
                    fechamento:Fechamento(data, turno:Turno(nome))
                `)
                .eq('frentista_id', Number(frentistaId))
                .order('id', { ascending: false })
                .limit(30);

            if (error) throw error;

            type FechamentoFrentistaRow = {
                id: number;
                valor_cartao?: number;
                valor_nota?: number;
                valor_pix?: number;
                valor_dinheiro?: number;
                valor_conferido?: number;
                fechamento?: {
                    data?: string;
                    turno?: { nome?: string } | null;
                } | null;
            };
            const historicoFormatado: HistoricoFrentista[] = ((data || []) as FechamentoFrentistaRow[]).map((h) => {
                const totalDeclarado = (h.valor_cartao || 0) + (h.valor_nota || 0) + (h.valor_pix || 0) + (h.valor_dinheiro || 0);
                const diferenca = totalDeclarado - (h.valor_conferido || 0);

                return {
                    id: String(h.id),
                    data: h.fechamento?.data || 'N/A',
                    turno: h.fechamento?.turno?.nome || 'N/A',
                    valor: diferenca,
                    status: diferenca === 0 ? 'OK' : 'Divergente'
                };
            });

            setHistorico(historicoFormatado);
        } catch (error) {
            console.error('Erro ao carregar histórico do frentista:', error);
            setHistorico([]);
        } finally {
            setLoadingHistorico(false);
        }
    }, []);

    return {
        historico,
        loadingHistorico,
        carregarHistorico
    };
};
