import React, { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    User,
    Phone,
    FileText,
    DollarSign,
    Calendar,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Receipt,
    MoreVertical,
    Trash2,
    Edit,
    Ban
} from 'lucide-react';
import { usePosto } from '../contexts/PostoContext';
import { clienteService, notaFrentistaService, frentistaService } from '../services/api';
import { Cliente, NotaFrentista } from '../services/database.types';
import { toast } from 'sonner';

// Componente para Badges de Status
const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        pago: 'bg-green-100 text-green-800 border-green-200',
        cancelado: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels = {
        pendente: 'Pendente',
        pago: 'Pago',
        cancelado: 'Cancelado',
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
            {labels[status as keyof typeof labels] || status}
        </span>
    );
};

const CustomerManagementScreen: React.FC = () => {
    const { postoAtivo } = usePosto();
    const [clientes, setClientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<any | null>(null);
    const [clienteNotas, setClienteNotas] = useState<any[]>([]);
    const [loadingNotas, setLoadingNotas] = useState(false);

    // Totais
    const [resumo, setResumo] = useState({
        totalDevedores: 0,
        valorTotalPendente: 0,
    });

    // Form States
    const [newCliente, setNewCliente] = useState({
        nome: '',
        documento: '',
        telefone: '',
        email: '',
        limite_credito: '',
        endereco: ''
    });

    // Nova Nota State
    const [showNovaNotaModal, setShowNovaNotaModal] = useState(false);
    const [salvandoNota, setSalvandoNota] = useState(false);
    const [frentistas, setFrentistas] = useState<any[]>([]);
    const [novaNota, setNovaNota] = useState({
        valor: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0],
        frentista_id: ''
    });

    // Pagamento Modal State
    const [pagamentoState, setPagamentoState] = useState({
        show: false,
        notaId: 0,
        data: new Date().toISOString().split('T')[0],
        formaPagamento: 'DINHEIRO',
        observacoes: ''
    });

    useEffect(() => {
        loadFrentistas();
    }, [postoAtivo]);

    const loadFrentistas = async () => {
        if (!postoAtivo?.id) return;
        try {
            console.log('Carregando frentistas para o posto:', postoAtivo.id);
            // Alterado para usar getAll, que busca direto da tabela e já filtra por ativo=true
            const data = await frentistaService.getAll(postoAtivo.id);
            console.log('Frentistas carregados:', data);
            setFrentistas(data);
        } catch (error) {
            console.error('Erro ao carregar frentistas:', error);
        }
    };

    const handleSaveNovaNota = async () => {
        if (!novaNota.valor || !novaNota.frentista_id || !selectedCliente || !postoAtivo?.id) return;

        setSalvandoNota(true);
        try {
            await notaFrentistaService.create({
                posto_id: postoAtivo.id,
                cliente_id: selectedCliente.id,
                frentista_id: Number(novaNota.frentista_id),
                valor: parseFloat(novaNota.valor),
                descricao: novaNota.descricao || undefined,
                data: novaNota.data,
            });

            toast.success('Nota lançada com sucesso!');
            setShowNovaNotaModal(false);
            setNovaNota({
                valor: '',
                descricao: '',
                data: new Date().toISOString().split('T')[0],
                frentista_id: ''
            });

            // Recarregar notas e saldo do cliente
            const notas = await notaFrentistaService.getByCliente(selectedCliente.id);
            setClienteNotas(notas);
            loadClientes();

        } catch (error) {
            console.error('Erro ao salvar nota:', error);
            toast.error('Erro ao lançar nota.');
        } finally {
            setSalvandoNota(false);
        }
    };

    useEffect(() => {
        if (postoAtivo) {
            loadClientes();
        }
    }, [postoAtivo]);

    const loadClientes = async () => {
        setLoading(true);
        try {
            if (!postoAtivo?.id) return;

            const data = await clienteService.getAllWithSaldo(postoAtivo.id);

            // Processar dados para calcular saldo real (caso o trigger não tenha pego retroativo)
            const clientesProcessados = data.map(c => {
                const saldoCalculado = c.notas
                    ? c.notas
                        .filter((n: any) => n.status === 'pendente')
                        .reduce((acc: number, n: any) => acc + Number(n.valor), 0)
                    : 0;

                return {
                    ...c,
                    saldo_devedor: saldoCalculado
                };
            });

            setClientes(clientesProcessados);

            // Calcular resumo
            const devedores = clientesProcessados.filter(c => c.saldo_devedor > 0);
            const totalPendente = devedores.reduce((acc, c) => acc + c.saldo_devedor, 0);

            setResumo({
                totalDevedores: devedores.length,
                valorTotalPendente: totalPendente
            });

        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClienteClick = async (cliente: any) => {
        if (selectedCliente?.id === cliente.id) {
            setSelectedCliente(null);
            return;
        }

        setSelectedCliente(cliente);
        setLoadingNotas(true);
        try {
            const notas = await notaFrentistaService.getByCliente(cliente.id);
            setClienteNotas(notas);
        } catch (error) {
            console.error('Erro ao carregar notas:', error);
        } finally {
            setLoadingNotas(false);
        }
    };

    const handleSaveCliente = async () => {
        if (!newCliente.nome || !postoAtivo?.id) return;

        try {
            await clienteService.create({
                ...newCliente,
                limite_credito: newCliente.limite_credito ? parseFloat(newCliente.limite_credito) : 0,
                posto_id: postoAtivo.id
            });

            setShowAddModal(false);
            setNewCliente({ nome: '', documento: '', telefone: '', email: '', limite_credito: '', endereco: '' });
            loadClientes();
            toast.success('Cliente salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            toast.error('Erro ao salvar cliente');
        }
    };

    const realizarPagamento = (notaId: number) => {
        setPagamentoState({
            show: true,
            notaId,
            data: new Date().toISOString().split('T')[0],
            formaPagamento: 'DINHEIRO',
            observacoes: 'Baixa via Dashboard Web'
        });
    };

    const handleConfirmarPagamento = async () => {
        if (!pagamentoState.notaId) return;

        try {
            await notaFrentistaService.registrarPagamento(
                pagamentoState.notaId,
                pagamentoState.formaPagamento,
                pagamentoState.observacoes,
                pagamentoState.data // Passando a data personalizada
            );

            // Atualizar lista de notas
            if (selectedCliente) {
                const notas = await notaFrentistaService.getByCliente(selectedCliente.id);
                setClienteNotas(notas);

                // Atualizar lista principal para refletir novo saldo
                loadClientes();
                toast.success('Pagamento registrado com sucesso!');
                setPagamentoState(prev => ({ ...prev, show: false }));
            }
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            toast.error('Erro ao registrar pagamento');
        }
    };

    const handleBloquearCliente = async () => {
        console.log('handleBloquearCliente chamado', selectedCliente);
        if (!selectedCliente) return;
        const isBlocked = selectedCliente.ativo === false;

        try {
            await clienteService.update(selectedCliente.id, { ativo: !selectedCliente.ativo });
            toast.success(`Cliente ${isBlocked ? 'desbloqueado' : 'bloqueado'} com sucesso!`);
            setSelectedCliente(null);
            loadClientes();
        } catch (error) {
            console.error('Erro ao bloquear/desbloquear cliente:', error);
            toast.error('Erro ao atualizar cliente.');
        }
    };

    const handleApagarCliente = async () => {
        console.log('1. handleApagarCliente chamado', selectedCliente);
        if (!selectedCliente) {
            console.log('2. selectedCliente é null, retornando');
            return;
        }

        console.log('3. saldo_devedor:', selectedCliente.saldo_devedor);
        if (selectedCliente.saldo_devedor > 0) {
            console.log('4. Cliente tem saldo devedor, não pode apagar');
            toast.error('Não é possível apagar um cliente com saldo devedor.');
            return;
        }

        console.log('5. Tentando apagar cliente...');
        try {
            console.log('6. Chamando clienteService.delete');
            await clienteService.delete(selectedCliente.id);
            console.log('7. Cliente apagado com sucesso!');
            toast.success('Cliente apagado com sucesso!');
            setSelectedCliente(null);
            loadClientes();
        } catch (error) {
            console.error('ERRO ao apagar cliente:', error);
            toast.error('Erro ao apagar cliente.');
        }
    };

    const filteredClientes = clientes.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.documento?.includes(searchTerm)
    );

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes & Fiado</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie contas, limites e recebimentos de fiado</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Novo Cliente
                </button>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <User size={20} />
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Total de Clientes</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {clientes.length}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Clientes Devedores</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {resumo.totalDevedores}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600 dark:text-yellow-400">
                            <DollarSign size={20} />
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Total a Receber</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {resumo.valorTotalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                </div>
            </div>

            {/* Área Principal - Lista e Detalhes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Coluna Esquerda: Lista de Clientes */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[600px]">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : filteredClientes.length === 0 ? (
                            <div className="text-center p-8 text-gray-500">Nenhum cliente encontrado</div>
                        ) : (
                            filteredClientes.map((cliente) => (
                                <div
                                    key={cliente.id}
                                    onClick={() => handleClienteClick(cliente)}
                                    className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedCliente?.id === cliente.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                        : 'bg-white dark:bg-gray-800 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className={`font-semibold ${selectedCliente?.id === cliente.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                {cliente.nome}
                                            </h3>
                                            {cliente.documento && (
                                                <p className="text-xs text-gray-500 mt-0.5">{cliente.documento}</p>
                                            )}
                                        </div>
                                        {cliente.saldo_devedor > 0 && (
                                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                                                {cliente.saldo_devedor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Coluna Direita: Detalhes e Notas */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[600px]">
                    {selectedCliente ? (
                        <>
                            {/* Header do Cliente */}
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <User size={32} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCliente.nome}</h2>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                                {selectedCliente.documento && (
                                                    <span className="flex items-center gap-1">
                                                        <FileText size={14} /> {selectedCliente.documento}
                                                    </span>
                                                )}
                                                {selectedCliente.telefone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone size={14} /> {selectedCliente.telefone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500 mb-1">Saldo Devedor</p>
                                        <p className={`text-3xl font-bold ${selectedCliente.saldo_devedor > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {selectedCliente.saldo_devedor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </p>
                                        {selectedCliente.limite_credito > 0 && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Limite: {selectedCliente.limite_credito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowNovaNotaModal(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border border-transparent rounded-md text-sm font-medium transition-colors shadow-sm"
                                    >
                                        <Plus size={16} /> Nova Nota
                                    </button>
                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                        <Edit size={16} /> Editar Dados
                                    </button>
                                    <button
                                        onClick={handleBloquearCliente}
                                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm font-medium transition-colors ${selectedCliente.ativo === false
                                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                            : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                                            }`}
                                    >
                                        <Ban size={16} /> {selectedCliente.ativo === false ? 'Desbloquear' : 'Bloquear'}
                                    </button>
                                    <button
                                        onClick={handleApagarCliente}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 size={16} /> Apagar
                                    </button>
                                </div>
                            </div>

                            {/* Lista de Notas */}
                            <div className="flex-1 overflow-y-auto p-0">
                                <div className="sticky top-0 bg-white dark:bg-gray-800 z-1 px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <div className="w-24">Data</div>
                                    <div className="flex-1">Descrição / Frentista</div>
                                    <div className="w-32 text-right">Valor</div>
                                    <div className="w-24 text-center">Status</div>
                                    <div className="w-24 text-center">Ações</div>
                                </div>

                                {loadingNotas ? (
                                    <div className="flex justify-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : clienteNotas.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                        <Receipt size={48} className="mb-2 opacity-20" />
                                        <p>Nenhuma nota registrada</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {clienteNotas.map((nota) => (
                                            <div key={nota.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex items-center text-sm">
                                                <div className="w-24 text-gray-500">
                                                    {new Date(nota.data).toLocaleDateString('pt-BR')}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                                        {nota.descricao || 'Abastecimento / Consumo'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Frentista: {nota.frentista?.nome || 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="w-32 text-right font-mono font-medium text-gray-900 dark:text-gray-100">
                                                    {Number(nota.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </div>
                                                <div className="w-24 text-center">
                                                    <StatusBadge status={nota.status} />
                                                </div>
                                                <div className="w-24 flex justify-center gap-2">
                                                    {nota.status === 'pendente' && (
                                                        <button
                                                            onClick={() => realizarPagamento(nota.id)}
                                                            title="Dar Baixa (Pagamento)"
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <User size={64} className="mb-4 opacity-10" />
                            <p className="text-lg font-medium">Selecione um cliente para ver detalhes</p>
                            <p className="text-sm">Ou clique em "Novo Cliente" para cadastrar</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Novo Cliente */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Novo Cliente</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    value={newCliente.nome}
                                    onChange={e => setNewCliente({ ...newCliente, nome: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    placeholder="Ex: João da Silva"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Documento (CPF/CNPJ)</label>
                                    <input
                                        type="text"
                                        value={newCliente.documento}
                                        onChange={e => setNewCliente({ ...newCliente, documento: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        value={newCliente.telefone}
                                        onChange={e => setNewCliente({ ...newCliente, telefone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
                                <input
                                    type="text"
                                    value={newCliente.endereco}
                                    onChange={e => setNewCliente({ ...newCliente, endereco: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Limite de Crédito (R$)</label>
                                <input
                                    type="number"
                                    value={newCliente.limite_credito}
                                    onChange={e => setNewCliente({ ...newCliente, limite_credito: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-gray-500 mt-1">Deixe 0 para sem limite</p>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveCliente}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-colors"
                                disabled={!newCliente.nome}
                            >
                                Salvar Cliente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nova Nota Assinada */}
            {showNovaNotaModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Receipt className="text-blue-600" size={20} />
                                Nova Nota pendente
                            </h3>
                            <button
                                onClick={() => setShowNovaNotaModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={novaNota.valor}
                                        onChange={e => setNovaNota({ ...novaNota, valor: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 text-lg font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0,00"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                                <input
                                    type="text"
                                    value={novaNota.descricao}
                                    onChange={e => setNovaNota({ ...novaNota, descricao: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    placeholder="Ex: Gasolina S10 - Placa ABC-1234"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                                    <input
                                        type="date"
                                        value={novaNota.data}
                                        onChange={e => setNovaNota({ ...novaNota, data: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frentista</label>
                                    <select
                                        value={novaNota.frentista_id}
                                        onChange={e => setNovaNota({ ...novaNota, frentista_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Selecione...</option>
                                        {/* A propriedade correta do banco é 'nome', não 'name' */}
                                        {frentistas.map(f => (
                                            <option key={f.id} value={f.id}>{f.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNovaNotaModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveNovaNota}
                                disabled={!novaNota.valor || !novaNota.frentista_id || salvandoNota}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
                            >
                                {salvandoNota ? 'Salvando...' : 'Lançar Nota'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
                </div >
            )}

{/* Modal Confirmar Pagamento */ }
{
    pagamentoState.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-green-50 dark:bg-green-900/20">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                        <DollarSign size={20} />
                        Registrar Pagamento
                    </h3>
                    <button
                        onClick={() => setPagamentoState(prev => ({ ...prev, show: false }))}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <XCircle size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data do Pagamento</label>
                        <input
                            type="date"
                            value={pagamentoState.data}
                            onChange={e => setPagamentoState(prev => ({ ...prev, data: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de Pagamento</label>
                        <select
                            value={pagamentoState.formaPagamento}
                            onChange={e => setPagamentoState(prev => ({ ...prev, formaPagamento: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        >
                            <option value="DINHEIRO">Dinheiro</option>
                            <option value="PIX">PIX</option>
                            <option value="CARTAO_DEBITO">Cartão Débito</option>
                            <option value="CARTAO_CREDITO">Cartão Crédito</option>
                            <option value="TRANSFERENCIA">Transferência</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                        <input
                            type="text"
                            value={pagamentoState.observacoes}
                            onChange={e => setPagamentoState(prev => ({ ...prev, observacoes: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={() => setPagamentoState(prev => ({ ...prev, show: false }))}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirmarPagamento}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
                    >
                        <CheckCircle size={18} />
                        Confirmar Baixa
                    </button>
                </div>
            </div>
        </div>
    )
}
        </div >
    );
};

export default CustomerManagementScreen;
