import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { notaFrentistaService, frentistaService } from '../../../services/api';
import { Frentista } from '../../../types/database/index';
import { NotaFormData, NotaFrentistaComRelacoes } from '../types';

const INITIAL_FORM_DATA: NotaFormData = {
    valor: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    frentista_id: '',
    jaPaga: false,
    dataPagamento: new Date().toISOString().split('T')[0],
    formaPagamento: 'DINHEIRO'
};

/**
 * Hook para gerenciar notas de frentista.
 * Controla criação, listagem e carregamento de notas.
 */
export function useNotaFrentista(
    clienteId: number | null,
    postoId: number | undefined,
    onSuccess?: () => void
) {
    const [notas, setNotas] = useState<NotaFrentistaComRelacoes[]>([]);
    const [loadingNotas, setLoadingNotas] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<NotaFormData>(INITIAL_FORM_DATA);
    const [frentistas, setFrentistas] = useState<Frentista[]>([]);
    const [saving, setSaving] = useState(false);

    const loadNotas = useCallback(async () => {
        if (!clienteId) {
            setNotas([]);
            return;
        }
        
        setLoadingNotas(true);
        try {
            const data = await notaFrentistaService.getByCliente(clienteId);
            setNotas(data);
        } catch (error) {
            console.error('Erro ao carregar notas:', error);
            toast.error('Erro ao carregar notas do cliente');
        } finally {
            setLoadingNotas(false);
        }
    }, [clienteId]);

    const loadFrentistas = useCallback(async () => {
        if (!postoId) return;
        try {
            const data = await frentistaService.getAll(postoId);
            // Filtrar apenas frentistas ativos
            setFrentistas(data.filter((f) => f.ativo));
        } catch (error) {
            console.error('Erro ao carregar frentistas:', error);
            toast.error('Erro ao carregar lista de frentistas');
        }
    }, [postoId]);

    useEffect(() => {
        loadNotas();
    }, [loadNotas]);

    useEffect(() => {
        if (isModalOpen) {
            loadFrentistas();
        }
    }, [isModalOpen, loadFrentistas]);

    /**
     * Abre o modal de nova nota e reseta o formulário.
     */
    const openModal = () => {
        setFormData(INITIAL_FORM_DATA);
        setIsModalOpen(true);
    };

    /**
     * Fecha o modal de nova nota.
     */
    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleChange = (field: keyof NotaFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Salva a nova nota de frentista.
     */
    const handleSave = async () => {
        if (!clienteId || !postoId) return;

        if (!formData.valor || isNaN(Number(formData.valor)) || Number(formData.valor) <= 0) {
            toast.error('Informe um valor válido e positivo');
            return;
        }

        if (!formData.frentista_id) {
            toast.error('Selecione um frentista');
            return;
        }

        setSaving(true);
        try {
            await notaFrentistaService.create({
                cliente_id: clienteId,
                frentista_id: Number(formData.frentista_id),
                valor: Number(formData.valor),
                descricao: formData.descricao,
                data: formData.data,
                posto_id: postoId,
                status: formData.jaPaga ? 'pago' : 'pendente',
                data_pagamento: formData.jaPaga ? formData.dataPagamento : undefined,
                forma_pagamento: formData.jaPaga ? formData.formaPagamento : undefined
            });

            toast.success('Nota lançada com sucesso!');
            closeModal();
            loadNotas();
            if (onSuccess) onSuccess();

        } catch (error) {
            console.error('Erro ao salvar nota:', error);
            toast.error('Erro ao lançar nota.');
        } finally {
            setSaving(false);
        }
    };

    return {
        notas,
        loadingNotas,
        isModalOpen,
        formData,
        frentistas,
        saving,
        openModal,
        closeModal,
        handleChange,
        handleSave,
        refreshNotas: loadNotas
    };
}
