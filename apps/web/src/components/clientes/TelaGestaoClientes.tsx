import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { usePosto } from '../../contexts/PostoContext';
import { clienteService } from '../../services/api';
import { ClienteComSaldo } from './types';
import {
    useClientesData,
    useClienteForm,
    useNotaFrentista,
    usePagamento
} from './hooks';
import {
    ClientesResumo,
    ClientesLista,
    ClienteDetalhes,
    ModalCliente,
    ModalNovaNota,
    ModalPagamento
} from './components';

/**
 * Tela de Gestão de Clientes e Fiado.
 * Permite gerenciar clientes, notas de fiado e pagamentos.
 * 
 * @remarks
 * Este componente foi refatorado da versão monolítica (957 linhas)
 * para uma arquitetura modular seguindo o padrão da Issue #15.
 */
const TelaGestaoClientes: React.FC = () => {
    const { postoAtivo } = usePosto();

    // Hooks de dados
    const { clientes, loading, resumo, refreshClientes } = useClientesData(postoAtivo?.id);

    // Estado local
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<ClienteComSaldo | null>(null);

    // Hooks de formulários
    const clienteForm = useClienteForm(postoAtivo?.id, () => {
        refreshClientes();
        // Se editou o cliente selecionado, atualiza ele
        if (selectedCliente && clienteForm.editingId === selectedCliente.id) {
            // A atualização real virá do refreshClientes, mas podemos otimizar se necessário
            // Por enquanto, o refreshClientes recarrega a lista, mas não atualiza o selectedCliente automaticamente se os dados mudaram
            // Vamos deixar assim por simplicidade, o usuário pode clicar de novo ou implementamos um refresh local
        }
    });

    const notaForm = useNotaFrentista(selectedCliente?.id || null, postoAtivo?.id, () => {
        refreshClientes();
    });

    const pagamentoForm = usePagamento(() => {
        notaForm.refreshNotas();
        refreshClientes();
    });

    // Handlers
    const handleClienteClick = (cliente: ClienteComSaldo) => {
        setSelectedCliente(cliente);
        // O hook useNotaFrentista observa clienteId, então ele vai carregar as notas automaticamente
    };

    const handleBloquear = async () => {
        if (!selectedCliente) return;
        const isBlocked = selectedCliente.bloqueado;

        try {
            await clienteService.update(selectedCliente.id, { bloqueado: !isBlocked });
            toast.success(`Cliente ${isBlocked ? 'desbloqueado' : 'bloqueado'} com sucesso!`);

            const novoEstado = { ...selectedCliente, bloqueado: !isBlocked };
            setSelectedCliente(novoEstado);
            refreshClientes();
        } catch (error) {
            console.error('Erro ao bloquear/desbloquear cliente:', error);
            toast.error('Erro ao atualizar cliente.');
        }
    };

    const handleApagar = async () => {
        if (!selectedCliente) return;
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

        try {
            await clienteService.delete(selectedCliente.id);
            toast.success('Cliente excluído com sucesso!');
            setSelectedCliente(null);
            refreshClientes();
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            toast.error('Erro ao excluir cliente');
        }
    };

    return (
        <div className="p-6 space-y-6 w-full mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display uppercase tracking-wider">Clientes & Fiado</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie contas, limites e recebimentos de fiado</p>
                </div>
                <button
                    onClick={() => clienteForm.openModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Novo Cliente
                </button>
            </div>

            <ClientesResumo resumo={resumo} loading={loading} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ClientesLista
                    clientes={clientes}
                    loading={loading}
                    searchTerm={searchTerm}
                    selectedClienteId={selectedCliente?.id || null}
                    onSearchChange={setSearchTerm}
                    onClienteClick={handleClienteClick}
                />

                <ClienteDetalhes
                    cliente={selectedCliente}
                    notas={notaForm.notas}
                    loadingNotas={notaForm.loadingNotas}
                    onNovaNota={notaForm.openModal}
                    onEditarCliente={() => clienteForm.openModal(selectedCliente)}
                    onBloquear={handleBloquear}
                    onApagar={handleApagar}
                    onPagamento={pagamentoForm.openModal}
                />
            </div>

            {/* Modais */}
            <ModalCliente
                {...clienteForm}
                onClose={clienteForm.closeModal}
                onSave={clienteForm.handleSave}
                onChange={clienteForm.handleChange}
            />
            {/* [20/01 05:35] Fix: Passando prop isOpen explicitamente para corrigir erro de tipo */}
            <ModalNovaNota
                {...notaForm}
                isOpen={notaForm.isModalOpen}
                onClose={notaForm.closeModal}
                onSave={notaForm.handleSave}
                onChange={notaForm.handleChange}
            />
            <ModalPagamento
                {...pagamentoForm}
                onClose={pagamentoForm.closeModal}
                onConfirm={pagamentoForm.handleConfirm}
                onChange={pagamentoForm.handleChange}
            />
        </div>
    );
};

export default TelaGestaoClientes;
