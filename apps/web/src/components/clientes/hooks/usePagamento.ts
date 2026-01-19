import { useState } from 'react';
import { toast } from 'sonner';
import { notaFrentistaService } from '../../../services/api';
import { PagamentoFormData } from '../types';

/**
 * Hook para gerenciar pagamentos de notas.
 * Controla modal e registro de pagamentos.
 */
export function usePagamento(onSuccess: () => void) {
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState<PagamentoFormData>({
        notaId: 0,
        data: new Date().toISOString().split('T')[0],
        formaPagamento: 'DINHEIRO',
        observacoes: ''
    });

    const openModal = (notaId: number) => {
        setFormData({
            notaId,
            data: new Date().toISOString().split('T')[0],
            formaPagamento: 'DINHEIRO',
            observacoes: ''
        });
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
    };

    const handleChange = (field: keyof PagamentoFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirm = async () => {
        if (!formData.notaId) return;

        try {
            await notaFrentistaService.registrarPagamento(
                formData.notaId,
                formData.data,
                formData.formaPagamento,
                formData.observacoes
            );

            toast.success('Pagamento registrado com sucesso!');
            closeModal();
            onSuccess();
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            toast.error('Erro ao registrar pagamento.');
        }
    };

    return {
        isOpen,
        formData,
        openModal,
        closeModal,
        handleChange,
        handleConfirm
    };
}
