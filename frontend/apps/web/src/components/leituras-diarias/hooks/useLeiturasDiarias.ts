import { useState, useEffect, useMemo, useCallback } from 'react';
import { bicoService, leituraService } from '../../../services/api';
import { reconsolidarDia } from '../../../services/api/consolidacao.service';
import { isFalta } from '@posto/utils';
import { useLeituras } from '../../fechamento-diario/hooks/useLeituras';
import { numeroDoEncerrante } from '../model/encerrante-digitado';
import { USUARIO_SISTEMA_ID } from '@shared/constants/usuario-sistema';
import { isSuccess } from '../../../types/ui/response-types';
import type { BicoComDetalhes } from '../../../types/fechamento';
import type { PumpGroup } from '../types';
import { hojeIso } from '@posto/utils';
import { useEstadoPersistido } from '@shared/lib/estado-persistido';

/**
 * Hook para gerenciar a lógica de registro de leituras diárias.
 * 
 * @param postoAtivoId - ID do posto ativo
 * @returns Estados e funções para controle da tela de leituras
 */
export function useLeiturasDiarias(postoAtivoId: number | null) {
    // State
    const [bicos, setBicos] = useState<BicoComDetalhes[]>([]);
    // Data própria, **fora** do `PeriodoContext` — mesma razão do fechamento diário: aqui se
    // grava leitura. Persistida só para não voltar a hoje ao trocar de tela.
    const [selectedDate, setSelectedDate] = useEstadoPersistido<string>('data-leituras', hojeIso);
    const [loadingBicos, setLoadingBicos] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msgErro, setMsgErro] = useState<string | null>(null);
    const [msgSucesso, setMsgSucesso] = useState<string | null>(null);

    // Hook de Leituras (Compartilhado com Fechamento Diário)
    const leiturasHook = useLeituras(postoAtivoId, selectedDate, bicos);
    const { carregarLeituras, leituras } = leiturasHook;

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

                    const inicial = numeroDoEncerrante(l.inicial);
                    const final = numeroDoEncerrante(l.fechamento);

                    // `null` = campo em branco ou ilegível, e aí a linha NÃO
                    // vai para o banco. Tratar a inicial ausente como zero
                    // gravaria o odômetro inteiro da bomba como litros do dia
                    // — centenas de milhares de litros de venda inventada.
                    if (inicial === null || final === null) return false;

                    return final > inicial;
                })
                .map(bico => {
                    const l = leituras[bico.id];
                    // Não-nulos: o filtro acima já derrubou os que não são.
                    const inicial = numeroDoEncerrante(l.inicial) as number;
                    const final = numeroDoEncerrante(l.fechamento) as number;

                    return {
                        bico_id: bico.id,
                        data: selectedDate,
                        leitura_inicial: inicial,
                        leitura_final: final,
                        combustivel_id: bico.combustivel.id,
                        preco_litro: bico.combustivel.preco_venda,
                        usuario_id: USUARIO_SISTEMA_ID,
                        posto_id: postoAtivoId,
                        turno_id: null
                    };
                });

            if (leiturasParaSalvar.length === 0) {
                setMsgErro('Nenhuma leitura válida para salvar (verifique se os valores finais são maiores que os iniciais).');
                return;
            }

            await leituraService.bulkCreate(leiturasParaSalvar);

            // [04/09/2026] A leitura é a outra metade do dia: sem reconsolidar, o pai
            // ficava com venda e diferença "não apuradas" mesmo com os 6 bicos no banco.
            // A mensagem diz o que aconteceu com a diferença — é para isso que o dono
            // digitou o encerrante.
            const consolidacao = await reconsolidarDia(postoAtivoId, selectedDate);
            setMsgSucesso(`${leiturasParaSalvar.length} leituras salvas. ${mensagemDaConsolidacao(consolidacao)}`);

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

/** Frase de fecho do dia para a mensagem de sucesso. */
function mensagemDaConsolidacao(r: Awaited<ReturnType<typeof reconsolidarDia>>): string {
    if (r.situacao === 'sem-pai') return 'Nenhum frentista enviou o caixa ainda — o dia será apurado no primeiro envio.';
    if (r.situacao === 'falhou') return 'Não foi possível apurar o dia (veja o console).';
    if (!r.totais.apurado) return 'Dia ainda não apurado: faltam bicos no encerrante.';
    const d = r.totais.diferenca;
    const valor = Math.abs(d).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return d === 0 ? 'Dia apurado: caixa bateu.' : `Dia apurado: ${isFalta(d) ? 'FALTA' : 'SOBRA'} de ${valor}.`;
}
