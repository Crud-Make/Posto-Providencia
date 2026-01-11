import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { notaFrentistaService, frentistaService } from '../../../services/api';
import { Frentista } from '../../../types/database/index';
import { NotaFormData, NotaFrentistaComRelacoes } from '../types';

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
    const [formData, setFormData] = useState<NotaFormData>({
        valor: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0],
        frentista_id: '',
        jaPaga: false,
        dataPagamento: new Date().toISOString().split('T')[0],
        formaPagamento: 'DINHEIRO'
    });
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

    const openModal = () => {
        setFormData({
            valor: '',
            descricao: '',
            data: new Date().toISOString().split('T')[0],
            frentista_id: '',
            jaPaga: false,
            dataPagamento: new Date().toISOString().split('T')[0],
            formaPagamento: 'DINHEIRO'
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleChange = (field: keyof NotaFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!clienteId || !postoId) return;

        if (!formData.valor || isNaN(Number(formData.valor))) {
            toast.error('Informe um valor válido');
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
