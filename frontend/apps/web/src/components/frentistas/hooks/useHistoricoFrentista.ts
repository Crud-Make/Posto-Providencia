import { useState, useCallback } from 'react';
import { HistoricoFrentista } from '../types';
import { carregarHistorico as lerHistorico } from './fonteDaEquipe';

/** O "Histórico Recente" do detalhe. A fonte (Supabase ou API) é escolhida em `fonteDaEquipe`. */
export const useHistoricoFrentista = () => {
    const [historico, setHistorico] = useState<HistoricoFrentista[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    /** `postoId` é o do frentista (`PerfilFrentista.postoId`); só a API o usa. */
    const carregarHistorico = useCallback(async (frentistaId: string, postoId?: number) => {
        if (frentistaId === '') {
            setHistorico([]);
            return;
        }

        setLoadingHistorico(true);
        const lido = await lerHistorico(frentistaId, postoId);
        lido.match(setHistorico, (motivo) => {
            console.error('Erro ao carregar histórico do frentista:', motivo);
            setHistorico([]);
        });
        setLoadingHistorico(false);
    }, []);

    return {
        historico,
        loadingHistorico,
        carregarHistorico
    };
};
