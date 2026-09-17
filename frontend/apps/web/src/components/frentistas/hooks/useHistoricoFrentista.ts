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
                diferenca_calculada?: number | null;
                fechamento?: {
                    data?: string;
                    turno?: { nome?: string } | null;
                } | null;
            };
            const historicoFormatado: HistoricoFrentista[] = ((data || []) as FechamentoFrentistaRow[]).map((h) => {
                // `diferenca_calculada` é a diferença de caixa canônica (encerrante − conferido),
                // gravada no envio do fechamento. Positivo = FALTA, negativo = SOBRA.
                //
                // Antes daqui saía `soma_manual_dos_meios − valor_conferido`, e a soma manual
                // ignorava moedas, débito e crédito: toda sessão com esses meios acusava
                // "Divergente" sem ter divergência nenhuma. Somar os 7 buckets não resolveria —
                // conferido − valor_conferido é sempre 0 num registro consistente, o que
                // esvaziaria o alarme em vez de consertá-lo.
                const diferenca = h.diferenca_calculada || 0;

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
