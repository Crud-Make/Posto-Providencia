import { useState, useEffect } from 'react';
import { frentistaService, escalaService } from '../../../services/api';
import type { Escala } from '../../../services/api/escala.service';
import type { Frentista } from '@posto/types';

/**
 * Interface para o estado do modal de observação
 */
interface ObservacaoModal {
    isOpen: boolean;
    frentistaId: number | null;
    frentistaName: string;
    day: number;
    currentObservacao: string;
    escalaId: number | null;
}

/**
 * Hook customizado para gerenciar a lógica de escalas e folgas
 * 
 * @param postoAtivoId - ID do posto para filtrar dados
 * @returns Objeto com estados e funções para manipulação da escala
 */
export const useEscalas = (postoAtivoId: number | null) => {
    const [dataAtual, setDataAtual] = useState(new Date());
    const [frentistas, setFrentistas] = useState<Frentista[]>([]);
    const [escalas, setEscalas] = useState<Escala[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [modalObservacao, setModalObservacao] = useState<ObservacaoModal>({
        isOpen: false,
        frentistaId: null,
        frentistaName: '',
        day: 0,
        currentObservacao: '',
        escalaId: null
    });

    useEffect(() => {
        if (postoAtivoId) {
            carregarDados();
        }
    }, [dataAtual, postoAtivoId]);

    /**
     * Carrega frentistas e escalas do banco de dados
     */
    const carregarDados = async () => {
        try {
            setCarregando(true);
            const [frentistasData, escalasData] = await Promise.all([
                frentistaService.getAll(postoAtivoId!),
                escalaService.getByMonth(dataAtual.getMonth() + 1, dataAtual.getFullYear(), postoAtivoId!)
            ]);

            setFrentistas(frentistasData.filter(f => f.ativo));
            setEscalas(escalasData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setCarregando(false);
        }
    };

    /**
     * Formata data para string ISO (YYYY-MM-DD)
     * @param ano - Ano
     * @param mes - Mês (0-11)
     * @param dia - Dia
     * @returns String formatada
     */
    const formatarData = (ano: number, mes: number, dia: number): string => {
        return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    };

    /**
     * Manipula clique na célula para alternar entre folga e trabalho
     * @param frentistaId - ID do frentista
     * @param dia - Dia do mês
     */
    const alternarFolga = async (frentistaId: number, dia: number) => {
        const strData = formatarData(dataAtual.getFullYear(), dataAtual.getMonth(), dia);
        const existente = escalas.find(e => e.frentista_id === frentistaId && e.data === strData);

        try {
            if (existente) {
                if (existente.tipo === 'FOLGA') {
                    await escalaService.delete(existente.id);
                    setEscalas(prev => prev.filter(e => e.id !== existente.id));
                } else {
                    await escalaService.update(existente.id, { tipo: 'FOLGA' });
                    setEscalas(prev => prev.map(e =>
                        e.id === existente.id ? { ...e, tipo: 'FOLGA' } : e
                    ));
                }
            } else {
                const novaEscala = await escalaService.create({
                    frentista_id: frentistaId,
                    data: strData,
                    tipo: 'FOLGA',
                    posto_id: postoAtivoId || 1
                });

                setEscalas(prev => [...prev, novaEscala]);
            }
        } catch (error) {
            console.error('Erro ao atualizar escala:', error);
        }
    };

    /**
     * Abre o modal de observação para um dia específico
     * @param frentistaId - ID do frentista
     * @param nomeFrentista - Nome do frentista
     * @param dia - Dia do mês
     */
    const abrirObservacao = (frentistaId: number, nomeFrentista: string, dia: number) => {
        const strData = formatarData(dataAtual.getFullYear(), dataAtual.getMonth(), dia);
        const escala = escalas.find(e => e.frentista_id === frentistaId && e.data === strData);

        setModalObservacao({
            isOpen: true,
            frentistaId,
            frentistaName: nomeFrentista,
            day: dia,
            currentObservacao: escala?.observacao || '',
            escalaId: escala?.id || null
        });
    };

    /**
     * Salva a observação no banco de dados
     * @param observacao - Texto da observação
     */
    const salvarObservacao = async (observacao: string) => {
        if (!modalObservacao.frentistaId || !postoAtivoId) return;

        const strData = formatarData(dataAtual.getFullYear(), dataAtual.getMonth(), modalObservacao.day);

        try {
            if (modalObservacao.escalaId) {
                await escalaService.update(modalObservacao.escalaId, { observacao });
                setEscalas(prev => prev.map(e =>
                    e.id === modalObservacao.escalaId ? { ...e, observacao } : e
                ));
            } else {
                const novaEscala = await escalaService.create({
                    frentista_id: modalObservacao.frentistaId,
                    data: strData,
                    tipo: 'TRABALHO',
                    observacao,
                    posto_id: postoAtivoId
                });
                setEscalas(prev => [...prev, novaEscala]);
            }

            setModalObservacao(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            console.error('Erro ao salvar observação:', error);
        }
    };

    /**
     * Navega para o mês anterior
     */
    const mesAnterior = () => {
        const novaData = new Date(dataAtual);
        novaData.setMonth(novaData.getMonth() - 1);
        setDataAtual(novaData);
    };

    /**
     * Navega para o próximo mês
     */
    const proximoMes = () => {
        const novaData = new Date(dataAtual);
        novaData.setMonth(novaData.getMonth() + 1);
        setDataAtual(novaData);
    };

    /**
     * Retorna o total de dias do mês atual
     */
    const obterDiasNoMes = () => {
        return new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).getDate();
    };

    /**
     * Verifica se o dia é final de semana
     * @param dia - Dia do mês
     */
    const ehFinalDeSemana = (dia: number) => {
        const d = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dia).getDay();
        return d === 0 || d === 6;
    };

    /**
     * Retorna a etiqueta (letra) do dia da semana
     * @param dia - Dia do mês
     */
    const obterLabelDia = (dia: number) => {
        const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        const d = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dia);
        return diasSemana[d.getDay()];
    };

    return {
        dataAtual,
        frentistas,
        escalas,
        carregando,
        modalObservacao,
        setModalObservacao,
        mesAnterior,
        proximoMes,
        alternarFolga,
        abrirObservacao,
        salvarObservacao,
        obterDiasNoMes,
        ehFinalDeSemana,
        obterLabelDia,
        formatarData
    };
};
