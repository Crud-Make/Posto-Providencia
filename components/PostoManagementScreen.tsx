import React, { useState, useEffect } from 'react';
import {
    Building2,
    Plus,
    Edit,
    Trash2,
    X,
    Check,
    MapPin,
    Phone,
    FileText,
    Power,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { postoService } from '../services/api';
import type { Posto } from '../services/database.types';

interface PostoFormData {
    nome: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    estado: string;
    telefone: string;
    email: string;
    ativo: boolean;
}

const initialFormData: PostoFormData = {
    nome: '',
    cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    telefone: '',
    email: '',
    ativo: true
};

const PostoManagementScreen: React.FC = () => {
    const [postos, setPostos] = useState<Posto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPosto, setEditingPosto] = useState<Posto | null>(null);
    const [formData, setFormData] = useState<PostoFormData>(initialFormData);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    useEffect(() => {
        loadPostos();
    }, []);

    const loadPostos = async () => {
        setLoading(true);
        try {
            const data = await postoService.getAllIncludingInactive();
            setPostos(data);
        } catch (error) {
            console.error('Erro ao carregar postos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (posto?: Posto) => {
        if (posto) {
            setEditingPosto(posto);
            setFormData({
                nome: posto.nome,
                cnpj: posto.cnpj || '',
                endereco: posto.endereco || '',
                cidade: posto.cidade || '',
                estado: posto.estado || '',
                telefone: posto.telefone || '',
                email: posto.email || '',
                ativo: posto.ativo
            });
        } else {
            setEditingPosto(null);
            setFormData(initialFormData);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPosto(null);
        setFormData(initialFormData);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nome.trim()) return;

        setSaving(true);
        try {
            if (editingPosto) {
                await postoService.update(editingPosto.id, formData);
            } else {
                await postoService.create(formData);
            }
            await loadPostos();
            handleCloseModal();
        } catch (error: any) {
            console.error('Erro ao salvar posto:', error);
            if (error?.code === '401' || error?.message?.includes('401')) {
                alert('Erro de autenticação. Você precisa estar logado para realizar esta ação. Faça login novamente.');
            } else if (error?.code === 'PGRST301' || error?.message?.includes('permission')) {
                alert('Sem permissão para realizar esta ação. Verifique se você tem as permissões necessárias.');
            } else {
                alert('Erro ao salvar posto. Verifique os dados e tente novamente.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await postoService.delete(id);
            await loadPostos();
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Erro ao desativar posto:', error);
        }
    };

    const handleToggleStatus = async (posto: Posto) => {
        try {
            await postoService.update(posto.id, { ativo: !posto.ativo });
            await loadPostos();
        } catch (error) {
            console.error('Erro ao alterar status:', error);
        }
    };

    const formatCNPJ = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        return numbers
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18);
    };

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers
                .replace(/^(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        }
        return numbers
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 15);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Building2 className="w-7 h-7 text-red-600" />
                        Gerenciamento de Postos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Cadastre e gerencie as unidades da rede
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Novo Posto
                </button>
            </div>

            {/* Lista de Postos */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {postos.map(posto => (
                    <div
                        key={posto.id}
                        className={`relative bg-white dark:bg-gray-800 rounded-xl border ${posto.ativo
                            ? 'border-gray-200 dark:border-gray-700'
                            : 'border-red-200 dark:border-red-900 opacity-60'
                            } p-5 transition-all hover:shadow-lg`}
                    >
                        {/* Status Badge */}
                        <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium ${posto.ativo
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {posto.ativo ? 'Ativo' : 'Inativo'}
                        </div>

                        {/* Conteúdo */}
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white pr-16">
                                {posto.nome}
                            </h3>
                            {posto.cnpj && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <FileText className="w-3.5 h-3.5" />
                                    {posto.cnpj}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            {posto.cidade && (
                                <p className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    {posto.cidade}{posto.estado ? `, ${posto.estado}` : ''}
                                </p>
                            )}
                            {posto.telefone && (
                                <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {posto.telefone}
                                </p>
                            )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => handleOpenModal(posto)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                Editar
                            </button>
                            <button
                                onClick={() => handleToggleStatus(posto)}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${posto.ativo
                                    ? 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30'
                                    : 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                                    }`}
                            >
                                <Power className="w-4 h-4" />
                                {posto.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                        </div>
                    </div>
                ))}

                {postos.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">Nenhum posto cadastrado</p>
                    </div>
                )}
            </div>

            {/* Modal de Cadastro/Edição */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingPosto ? 'Editar Posto' : 'Novo Posto'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nome do Posto *
                                </label>
                                <input
                                    type="text"
                                    value={formData.nome}
                                    onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    placeholder="Ex: Posto Providência Centro"
                                    required
                                />
                            </div>

                            {/* CNPJ */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    CNPJ
                                </label>
                                <input
                                    type="text"
                                    value={formData.cnpj}
                                    onChange={e => setFormData(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>

                            {/* Endereço */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Endereço
                                </label>
                                <input
                                    type="text"
                                    value={formData.endereco}
                                    onChange={e => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    placeholder="Rua, número, bairro"
                                />
                            </div>

                            {/* Cidade e Estado */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Cidade
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.cidade}
                                        onChange={e => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="Cidade"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Estado
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.estado}
                                        onChange={e => setFormData(prev => ({ ...prev, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="UF"
                                        maxLength={2}
                                    />
                                </div>
                            </div>

                            {/* Telefone e Email */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Telefone
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.telefone}
                                        onChange={e => setFormData(prev => ({ ...prev, telefone: formatPhone(e.target.value) }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        E-mail
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="contato@posto.com"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="ativo"
                                    checked={formData.ativo}
                                    onChange={e => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                                <label htmlFor="ativo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Posto ativo (visível no sistema)
                                </label>
                            </div>

                            {/* Botões */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !formData.nome.trim()}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Check className="w-5 h-5" />
                                    )}
                                    {editingPosto ? 'Salvar Alterações' : 'Cadastrar Posto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostoManagementScreen;
