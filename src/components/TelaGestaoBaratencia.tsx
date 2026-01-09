import React, { useState, useEffect, useMemo } from 'react';
import {
    Wallet,
    Users,
    Plus,
    Search,
    TrendingUp,
    Fuel,
    RefreshCw,
    Loader2,
    ArrowUpCircle,
    ArrowDownCircle,
    X,
    AlertTriangle,
    Check,
    History,
    Sparkles
} from 'lucide-react';
import { baratenciaService, combustivelService } from '../services/api';
import type {
    ClienteBaratencia,
    CarteiraBaratencia,
    TransacaoBaratencia,
    Combustivel,
    PromocaoBaratencia
} from '../services/database.types';
import { usePosto } from '../contexts/PostoContext';
import { toast } from 'sonner';

// Cores dos combustíveis
const FUEL_COLORS: Record<string, string> = {
    gc: 'bg-yellow-500',
    ga: 'bg-green-500',
    et: 'bg-cyan-500',
    s10: 'bg-red-500',
    diesel: 'bg-amber-600'
};

const FUEL_LABELS: Record<string, string> = {
    gc: 'Gasolina Comum',
    ga: 'Gasolina Aditivada',
    et: 'Etanol',
    s10: 'Diesel S10',
    diesel: 'Diesel'
};

const TelaGestaoBaratencia: React.FC = () => {
    const { postoAtivoId } = usePosto();

    // Estados
    const [loading, setLoading] = useState(true);
    const [clientes, setClientes] = useState<(ClienteBaratencia & { carteira?: CarteiraBaratencia })[]>([]);
    const [combustiveis, setCombustiveis] = useState<Combustivel[]>([]);
    const [metrics, setMetrics] = useState<{
        totalClientes: number;
        totalSaldoBrl: number;
        passivoLitros: { gc: number; ga: number; et: number; s10: number; diesel: number };
        transacoesHoje: number;
    } | null>(null);
    const [recommendation, setRecommendation] = useState<{
        title: string;
        message: string;
        type: 'BONUS_DEPOSITO' | 'BONUS_CONVERSAO';
        suggestedValue: number;
        suggestedBonus: number;
        reason: string;
    } | null>(null);
    const [promocoes, setPromocoes] = useState<PromocaoBaratencia[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modais
    const [showNovoCliente, setShowNovoCliente] = useState(false);
    const [showDeposito, setShowDeposito] = useState(false);
    const [showConversao, setShowConversao] = useState(false);
    const [showHistorico, setShowHistorico] = useState(false);
    const [clienteSelecionado, setClienteSelecionado] = useState<(ClienteBaratencia & { carteira?: CarteiraBaratencia }) | null>(null);

    // Formulários
    const [novoClienteForm, setNovoClienteForm] = useState({ nome: '', cpf: '', telefone: '' });
    const [depositoValor, setDepositoValor] = useState('');
    const [conversaoForm, setConversaoForm] = useState({ combustivel: '', valor: '' });
    const [transacoes, setTransacoes] = useState<TransacaoBaratencia[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Carregar dados
    useEffect(() => {
        loadData();
    }, [postoAtivoId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [clientesData, combustiveisData, metricsData, promoData, aiRec] = await Promise.all([
                baratenciaService.getClientes(),
                combustivelService.getAll(postoAtivoId),
                baratenciaService.getDashboardMetrics(postoAtivoId),
                baratenciaService.getPromocoes(postoAtivoId),
                baratenciaService.getAiRecommendation(postoAtivoId)
            ]);
            setClientes(clientesData);
            setCombustiveis(combustiveisData);
            setMetrics(metricsData);
            setPromocoes(promoData);
            setRecommendation(aiRec);
        } catch (error: any) {
            console.error('Erro ao carregar dados:', error);
            toast.error('Erro ao carregar dados do Baratência');
        } finally {
            setLoading(false);
        }
    };

    // Filtro de clientes
    const clientesFiltrados = useMemo(() => {
        if (!searchTerm) return clientes;
        const term = searchTerm.toLowerCase();
        return clientes.filter(c =>
            c.nome.toLowerCase().includes(term) ||
            c.cpf.includes(term)
        );
    }, [clientes, searchTerm]);

    // Formatar CPF
    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .slice(0, 14);
    };

    // Formatar moeda
    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Criar cliente
    const handleCriarCliente = async () => {
        if (!novoClienteForm.nome || !novoClienteForm.cpf) {
            toast.error('Nome e CPF são obrigatórios');
            return;
        }
        setSubmitting(true);
        try {
            await baratenciaService.createCliente({
                nome: novoClienteForm.nome,
                cpf: novoClienteForm.cpf,
                telefone: novoClienteForm.telefone || undefined
            });
            toast.success('Cliente criado com sucesso!');
            setShowNovoCliente(false);
            setNovoClienteForm({ nome: '', cpf: '', telefone: '' });
            loadData();
        } catch (error: any) {
            toast.error(`Erro ao criar cliente: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Depositar
    const handleDepositar = async () => {
        if (!clienteSelecionado || !depositoValor) return;
        const valor = parseFloat(depositoValor.replace(',', '.'));
        if (isNaN(valor) || valor <= 0) {
            toast.error('Valor inválido');
            return;
        }
        setSubmitting(true);
        try {
            await baratenciaService.depositar(clienteSelecionado.id, valor);
            toast.success(`Depósito de ${formatCurrency(valor)} realizado!`);
            setShowDeposito(false);
            setDepositoValor('');
            setClienteSelecionado(null);
            loadData();
        } catch (error: any) {
            toast.error(`Erro ao depositar: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Converter para litros
    const handleConverter = async () => {
        if (!clienteSelecionado || !conversaoForm.combustivel || !conversaoForm.valor) return;
        const valor = parseFloat(conversaoForm.valor.replace(',', '.'));
        if (isNaN(valor) || valor <= 0) {
            toast.error('Valor inválido');
            return;
        }
        const combustivel = combustiveis.find(c => c.codigo === conversaoForm.combustivel);
        if (!combustivel) {
            toast.error('Combustível não encontrado');
            return;
        }
        if (clienteSelecionado.carteira && clienteSelecionado.carteira.saldo_brl < valor) {
            toast.error('Saldo insuficiente');
            return;
        }
        setSubmitting(true);
        try {
            await baratenciaService.converterParaLitros(
                clienteSelecionado.id,
                conversaoForm.combustivel,
                valor,
                combustivel.preco_venda
            );
            const litros = valor / combustivel.preco_venda;
            toast.success(`Convertido para ${litros.toFixed(3)} L de ${combustivel.nome}!`);
            setShowConversao(false);
            setConversaoForm({ combustivel: '', valor: '' });
            setClienteSelecionado(null);
            loadData();
        } catch (error: any) {
            toast.error(`Erro ao converter: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Ativar promoção da IA
    const handleAtivarRecomendacao = async () => {
        if (!recommendation || !postoAtivoId) return;
        setSubmitting(true);
        try {
            await baratenciaService.createPromocao({
                titulo: recommendation.title,
                descricao: `${recommendation.message}. ${recommendation.reason}`,
                tipo: recommendation.type,
                valor_minimo: recommendation.suggestedValue,
                bonus_porcentagem: recommendation.suggestedBonus,
                combustivel_codigo: null,
                data_inicio: new Date().toISOString(),
                data_fim: null,
                ativo: true,
                posto_id: postoAtivoId
            });
            toast.success('Promoção ativada com sucesso!');
            loadData();
        } catch (error: any) {
            toast.error(`Erro ao ativar promoção: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Ver histórico
    const handleVerHistorico = async (cliente: ClienteBaratencia & { carteira?: CarteiraBaratencia }) => {
        setClienteSelecionado(cliente);
        setShowHistorico(true);
        try {
            const trans = await baratenciaService.getTransacoes(cliente.id, 20);
            setTransacoes(trans);
        } catch (error: any) {
            toast.error('Erro ao carregar histórico');
        }
    };

    // Passivo total em litros
    const totalPassivoLitros = useMemo(() => {
        if (!metrics) return 0;
        const p = metrics.passivoLitros;
        return p.gc + p.ga + p.et + p.s10 + p.diesel;
    }, [metrics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Wallet className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Baratência</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Sistema de Fidelidade e Carteira Digital</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <RefreshCw size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                        onClick={() => setShowNovoCliente(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md"
                    >
                        <Plus size={18} />
                        Novo Cliente
                    </button>
                </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <Users className="text-purple-600 dark:text-purple-400" size={20} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Clientes Ativos</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{metrics?.totalClientes || 0}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Saldo em Carteiras</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(metrics?.totalSaldoBrl || 0)}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                            <Fuel className="text-amber-600 dark:text-amber-400" size={20} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Passivo em Litros</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{totalPassivoLitros.toFixed(1)} L</p>
                    <p className="text-xs text-gray-400 mt-1">Litros a entregar</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <History className="text-blue-600 dark:text-blue-400" size={20} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Transações Hoje</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{metrics?.transacoesHoje || 0}</p>
                </div>
            </div>

            {/* IA Insights Section */}
            {recommendation && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                        <Sparkles size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={20} className="text-indigo-200" />
                                <span className="text-xs font-bold uppercase tracking-widest text-indigo-100">Consultoria de IA</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">{recommendation.title}</h2>
                            <p className="text-indigo-100 mb-4 max-w-2xl leading-relaxed">
                                {recommendation.message}
                                <span className="block mt-2 text-sm font-medium bg-white/10 p-2 rounded-lg border border-white/10">
                                    <AlertTriangle size={14} className="inline mr-2" />
                                    {recommendation.reason}
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <div className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                    Tipo: <span className="font-bold">{recommendation.type === 'BONUS_DEPOSITO' ? 'Bônus no Depósito' : 'Bônus na Conversão'}</span>
                                </div>
                                <div className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                    Valor Min: <span className="font-bold">R$ {recommendation.suggestedValue}</span>
                                </div>
                                <div className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                    Bônus: <span className="font-bold">{recommendation.suggestedBonus}% em litros</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleAtivarRecomendacao}
                            disabled={submitting}
                            className="px-6 py-3 bg-white text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2 whitespace-nowrap"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                            Ativar Promoção Agora
                        </button>
                    </div>
                </div>
            )}

            {/* Promoções Ativas */}
            {promocoes.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-green-600" />
                        Campanhas Ativas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {promocoes.map(promo => (
                            <div key={promo.id} className="p-4 border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600">
                                    {promo.tipo === 'BONUS_DEPOSITO' ? <ArrowUpCircle size={24} /> : <Fuel size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 dark:text-white truncate">{promo.titulo}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{promo.bonus_porcentagem}% bônus acima de R$ {promo.valor_minimo}</p>
                                </div>
                                <div>
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase">Ativa</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Passivo por Combustível */}
            {metrics && totalPassivoLitros > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Passivo por Combustível</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(metrics.passivoLitros).map(([key, value]) => (
                            value > 0 && (
                                <div key={key} className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${FUEL_COLORS[key]}`} />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{FUEL_LABELS[key]}</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{value.toFixed(2)} L</p>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}

            {/* Lista de Clientes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clientes Baratência</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {clientesFiltrados.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Users className="mx-auto mb-3 opacity-50" size={48} />
                        <p>Nenhum cliente cadastrado</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CPF</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Saldo R$</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Litros</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {clientesFiltrados.map((cliente) => {
                                    const totalLitros = cliente.carteira
                                        ? (cliente.carteira.saldo_litros_gc || 0) +
                                        (cliente.carteira.saldo_litros_ga || 0) +
                                        (cliente.carteira.saldo_litros_et || 0) +
                                        (cliente.carteira.saldo_litros_s10 || 0) +
                                        (cliente.carteira.saldo_litros_diesel || 0)
                                        : 0;

                                    return (
                                        <tr key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                                        <span className="text-purple-700 dark:text-purple-400 font-bold">{cliente.nome.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{cliente.nome}</p>
                                                        {cliente.telefone && <p className="text-xs text-gray-500">{cliente.telefone}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{cliente.cpf}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-bold text-green-600 dark:text-green-400">
                                                    {formatCurrency(cliente.carteira?.saldo_brl || 0)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                                    {totalLitros.toFixed(2)} L
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => { setClienteSelecionado(cliente); setShowDeposito(true); }}
                                                        className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                                        title="Depositar"
                                                    >
                                                        <ArrowUpCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setClienteSelecionado(cliente); setShowConversao(true); }}
                                                        className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                                                        title="Converter para Litros"
                                                    >
                                                        <Fuel size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleVerHistorico(cliente)}
                                                        className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                        title="Histórico"
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Novo Cliente */}
            {showNovoCliente && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Novo Cliente</h3>
                            <button onClick={() => setShowNovoCliente(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    value={novoClienteForm.nome}
                                    onChange={(e) => setNovoClienteForm({ ...novoClienteForm, nome: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="João da Silva"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF *</label>
                                <input
                                    type="text"
                                    value={novoClienteForm.cpf}
                                    onChange={(e) => setNovoClienteForm({ ...novoClienteForm, cpf: formatCPF(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="000.000.000-00"
                                    maxLength={14}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                                <input
                                    type="text"
                                    value={novoClienteForm.telefone}
                                    onChange={(e) => setNovoClienteForm({ ...novoClienteForm, telefone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                            <button
                                onClick={handleCriarCliente}
                                disabled={submitting}
                                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                Cadastrar Cliente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Depósito */}
            {showDeposito && clienteSelecionado && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Depositar Saldo</h3>
                            <button onClick={() => { setShowDeposito(false); setClienteSelecionado(null); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Cliente: <span className="font-medium text-gray-900 dark:text-white">{clienteSelecionado.nome}</span>
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Saldo atual: <span className="font-bold text-green-600">{formatCurrency(clienteSelecionado.carteira?.saldo_brl || 0)}</span>
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor do Depósito (R$)</label>
                            <input
                                type="text"
                                value={depositoValor}
                                onChange={(e) => setDepositoValor(e.target.value.replace(/[^0-9,]/g, ''))}
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl font-bold"
                                placeholder="0,00"
                            />
                        </div>
                        <button
                            onClick={handleDepositar}
                            disabled={submitting || !depositoValor}
                            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={18} /> : <ArrowUpCircle size={18} />}
                            Confirmar Depósito
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Conversão */}
            {showConversao && clienteSelecionado && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Converter para Litros</h3>
                            <button onClick={() => { setShowConversao(false); setClienteSelecionado(null); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            Cliente: <span className="font-medium text-gray-900 dark:text-white">{clienteSelecionado.nome}</span>
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Saldo disponível: <span className="font-bold text-green-600">{formatCurrency(clienteSelecionado.carteira?.saldo_brl || 0)}</span>
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Combustível</label>
                                <select
                                    value={conversaoForm.combustivel}
                                    onChange={(e) => setConversaoForm({ ...conversaoForm, combustivel: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    {combustiveis.map((c) => (
                                        <option key={c.id} value={c.codigo}>
                                            {c.nome} - {formatCurrency(c.preco_venda)}/L
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor a Converter (R$)</label>
                                <input
                                    type="text"
                                    value={conversaoForm.valor}
                                    onChange={(e) => setConversaoForm({ ...conversaoForm, valor: e.target.value.replace(/[^0-9,]/g, '') })}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl font-bold"
                                    placeholder="0,00"
                                />
                            </div>
                            {conversaoForm.combustivel && conversaoForm.valor && (
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <p className="text-sm text-purple-700 dark:text-purple-300">
                                        Você receberá aproximadamente{' '}
                                        <span className="font-bold">
                                            {(parseFloat(conversaoForm.valor.replace(',', '.')) / (combustiveis.find(c => c.codigo === conversaoForm.combustivel)?.preco_venda || 1)).toFixed(3)} L
                                        </span>
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={handleConverter}
                                disabled={submitting || !conversaoForm.combustivel || !conversaoForm.valor}
                                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Fuel size={18} />}
                                Confirmar Conversão
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Histórico */}
            {showHistorico && clienteSelecionado && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Histórico de Transações</h3>
                            <button onClick={() => { setShowHistorico(false); setClienteSelecionado(null); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Cliente: <span className="font-medium text-gray-900 dark:text-white">{clienteSelecionado.nome}</span>
                        </p>
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {transacoes.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">Nenhuma transação encontrada</p>
                            ) : (
                                transacoes.map((t) => (
                                    <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.tipo === 'DEPOSITO' ? 'bg-green-100 dark:bg-green-900/30' :
                                            t.tipo === 'CONVERSAO' ? 'bg-purple-100 dark:bg-purple-900/30' :
                                                'bg-amber-100 dark:bg-amber-900/30'
                                            }`}>
                                            {t.tipo === 'DEPOSITO' ? <ArrowUpCircle className="text-green-600" size={18} /> :
                                                t.tipo === 'CONVERSAO' ? <Fuel className="text-purple-600" size={18} /> :
                                                    <ArrowDownCircle className="text-amber-600" size={18} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">{t.tipo}</p>
                                            <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString('pt-BR')}</p>
                                        </div>
                                        <div className="text-right">
                                            {t.valor_brl !== 0 && (
                                                <p className={`font-bold ${t.valor_brl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {t.valor_brl > 0 ? '+' : ''}{formatCurrency(t.valor_brl)}
                                                </p>
                                            )}
                                            {t.quantidade_litros > 0 && (
                                                <p className="text-sm text-amber-600 font-medium">+{t.quantidade_litros.toFixed(3)} L</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TelaGestaoBaratencia;
