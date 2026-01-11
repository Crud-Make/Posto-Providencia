import { useState } from 'react';
import { toast } from 'sonner';
import { clienteService } from '../../../services/api';
import { ClienteFormData, ClienteComSaldo } from '../types';

/**
 * Hook para gerenciar formulário de cliente.
 * Controla modal, validação e salvamento.
 */
export function useClienteForm(
    postoId: number | undefined,
    onSuccess: () => void
) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<ClienteFormData>({
        nome: '',
        documento: '',
        telefone: '',
        email: '',
        limite_credito: '',
        endereco: ''
    });

    const openModal = (cliente?: ClienteComSaldo) => {
        if (cliente) {
            setEditingId(cliente.id);
            setFormData({
                nome: cliente.nome,
                documento: cliente.documento || '',
                telefone: cliente.telefone || '',
                email: cliente.email || '',
                limite_credito: cliente.limite_credito ? String(cliente.limite_credito) : '',
                endereco: cliente.endereco || ''
            });
        } else {
            setEditingId(null);
            setFormData({
                nome: '',
                documento: '',
                telefone: '',
                email: '',
                limite_credito: '',
                endereco: ''
            });
        }
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
        setEditingId(null);
        setFormData({
            nome: '',
            documento: '',
            telefone: '',
            email: '',
            limite_credito: '',
            endereco: ''
        });
    };

    const handleChange = (field: keyof ClienteFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formData.nome || !postoId) {
            toast.error('Nome é obrigatório');
            return;
        }

        try {
            const dataToSave = {
                ...formData,
                limite_credito: formData.limite_credito ? parseFloat(formData.limite_credito) : 0,
            };

            if (editingId) {
                // Modo Edição
                await clienteService.update(editingId, dataToSave);
                toast.success('Cliente atualizado com sucesso!');
            } else {
                // Modo Criação
                await clienteService.create({
                    ...dataToSave,
                    posto_id: postoId
                });
                toast.success('Cliente salvo com sucesso!');
            }

            closeModal();
            onSuccess();
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            toast.error('Erro ao salvar cliente');
        }
    };

    return {
        isOpen,
        editingId,
        formData,
        openModal,
        closeModal,
        handleChange,
        handleSave
    };
}
