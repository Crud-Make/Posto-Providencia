import { useState, useEffect, useMemo, useCallback } from 'react';
import { bicoService, leituraService } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useLeituras } from '../../fechamento-diario/hooks/useLeituras';
import { isSuccess } from '../../../types/ui/response-types';
import type { BicoComDetalhes } from '../../../types/fechamento';
import type { PumpGroup } from '../types';

/**
 * Hook para gerenciar a lógica de registro de leituras diárias.
 * 
 * @param postoAtivoId - ID do posto ativo
 * @returns Estados e funções para controle da tela de leituras
 */
export function useLeiturasDiarias(postoAtivoId: number | null) {
    const { user } = useAuth();

    // State
    const [bicos, setBicos] = useState<BicoComDetalhes[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [loadingBicos, setLoadingBicos] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msgErro, setMsgErro] = useState<string | null>(null);
    const [msgSucesso, setMsgSucesso] = useState<string | null>(null);

    // Hook de Leituras (Compartilhado com Fechamento Diário)
    const leiturasHook = useLeituras(postoAtivoId, selectedDate, null, bicos);
    const { carregarLeituras, leituras, totals } = leiturasHook;

    /**
     * Carrega configurações dos bicos do posto
     */
    const loadBicos = useCallback(async () => {
        if (!postoAtivoId) return;
        try {
            setLoadingBicos(true);
            const response = await bicoService.getWithDetails(postoAtivoId);
            if (isSuccess(response)) {
                setBicos(response.data as BicoComDetalhes[]);
            } else {
                setMsgErro(response.error);
            }
        } catch (err) {
            console.error('Erro ao carregar bicos:', err);
            setMsgErro('Erro ao carregar configurações dos bicos.');
        } finally {
            setLoadingBicos(false);
        }
    }, [postoAtivoId]);

    // Carrega bicos ao montar ou trocar posto
    useEffect(() => {
        loadBicos();
    }, [loadBicos]);

    // Carrega leituras quando bicos ou data mudam
    useEffect(() => {
        if (bicos.length > 0 && postoAtivoId) {
            carregarLeituras();
        }
    }, [bicos, selectedDate, postoAtivoId, carregarLeituras]);

    /**
     * Recarrega os dados da tela
     */
    const handleRefresh = useCallback(() => {
        carregarLeituras();
        setMsgSucesso(null);
        setMsgErro(null);
    }, [carregarLeituras]);

    /**
     * Salva as leituras registradas
     */
    const handleSave = async () => {
        if (!postoAtivoId) return;

        try {
            setSaving(true);
            setMsgErro(null);
            setMsgSucesso(null);

            const leiturasParaSalvar = bicos
                .filter(bico => {
                    const l = leituras[bico.id];
                    if (!l || !l.fechamento) return false;

                    const inicial = parseFloat(l.inicial.replace('.', '').replace(',', '.'));
                    const final = parseFloat(l.fechamento.replace('.', '').replace(',', '.'));

                    return !isNaN(final) && final > inicial;
                })
                .map(bico => {
                    const l = leituras[bico.id];
                    const inicial = parseFloat(l.inicial.replace('.', '').replace(',', '.'));
                    const final = parseFloat(l.fechamento.replace('.', '').replace(',', '.'));

                    return {
                        bico_id: bico.id,
                        data: selectedDate,
                        leitura_inicial: inicial,
                        leitura_final: final,
                        combustivel_id: bico.combustivel.id,
                        preco_litro: bico.combustivel.preco_venda,
                        usuario_id: user?.id || 1,
                        posto_id: postoAtivoId,
                        turno_id: null
                    };
                });

            if (leiturasParaSalvar.length === 0) {
                setMsgErro('Nenhuma leitura válida para salvar (verifique se os valores finais são maiores que os iniciais).');
                return;
            }

            await leituraService.bulkCreate(leiturasParaSalvar);

            setMsgSucesso(`${leiturasParaSalvar.length} leituras salvas com sucesso!`);

            // Recarrega para confirmar
            await carregarLeituras();

        } catch (err) {
            console.error('Erro ao salvar:', err);
            setMsgErro('Erro ao salvar leituras. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Agrupamento de bicos por bomba para exibição
     */
    const pumpGroups: PumpGroup[] = useMemo(() => {
        return bicos.reduce((acc, bico) => {
            const existingGroup = acc.find(g => g.bomba.id === bico.bomba.id);
            if (existingGroup) {
                existingGroup.bicos.push(bico);
            } else {
                acc.push({ bomba: bico.bomba, bicos: [bico] });
            }
            return acc;
        }, [] as PumpGroup[]);
    }, [bicos]);

    return {
        selectedDate,
        setSelectedDate,
        loadingBicos,
        saving,
        msgErro,
        msgSucesso,
        leiturasHook,
        pumpGroups,
        handleRefresh,
        handleSave,
        setMsgErro,
        setMsgSucesso
    };
}
