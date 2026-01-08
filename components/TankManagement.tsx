import React, { useState, useEffect } from 'react';
import { Fuel, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { tanqueService, Tanque } from '../services/tanqueService';
import { combustivelService } from '../services/api';
import { usePosto } from '../contexts/PostoContext';
import { Combustivel } from '../services/database.types';

export const TankManagement: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [tanques, setTanques] = useState<Tanque[]>([]);
    const [combustiveis, setCombustiveis] = useState<Combustivel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTanque, setEditingTanque] = useState<Tanque | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        nome: '',
        combustivel_id: '',
        capacidade: '',
        estoque_atual: ''
    });

    useEffect(() => {
        if (postoAtivoId) {
            loadData();
        }
    }, [postoAtivoId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [t, c] = await Promise.all([
                tanqueService.getAll(postoAtivoId),
                combustivelService.getAll(postoAtivoId)
            ]);
            setTanques(t);
            setCombustiveis(c);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleOpenModal = (tanque?: Tanque) => {
        if (tanque) {
            setEditingTanque(tanque);
            setFormData({
                nome: tanque.nome,
                combustivel_id: String(tanque.combustivel_id),
                capacidade: String(tanque.capacidade),
                estoque_atual: String(tanque.estoque_atual)
            });
        } else {
            setEditingTanque(null);
            setFormData({ nome: '', combustivel_id: '', capacidade: '', estoque_atual: '0' });
        }
        setIsModalOpen(true);
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                nome: formData.nome,
                combustivel_id: Number(formData.combustivel_id),
                capacidade: Number(formData.capacidade),
                estoque_atual: Number(formData.estoque_atual),
                posto_id: postoAtivoId,
                ativo: true
            };

            if (editingTanque) {
                // Remove estoque_atual from update if not desired to edit directly, but for now allow it
                await tanqueService.update(editingTanque.id, payload);
            } else {
                await tanqueService.create(payload);
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar tanque');
        }
    }

    const handleDelete = async (id: number) => {
        if (confirm('Tem certeza que deseja desativar este tanque?')) {
            try {
                await tanqueService.delete(id);
                loadData();
            } catch (error) {
                alert('Erro ao excluir');
            }
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                        <Fuel size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Gestão de Tanques Físicos</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Cadastre os tanques reais e suas capacidades para controle de estoque.</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                >
                    <Plus size={14} /> ADICIONAR
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Nome do Tanque</th>
                            <th className="px-6 py-4">Produto</th>
                            <th className="px-6 py-4 text-right">Capacidade</th>
                            <th className="px-6 py-4 text-right">Estoque Atual</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {tanques.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                                    Nenhum tanque cadastrado.
                                </td>
                            </tr>
                        ) : (
                            tanques.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.nome}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                            {t.combustivel?.nome}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-900 dark:text-white">{t.capacidade.toLocaleString('pt-BR')} L</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{t.estoque_atual.toLocaleString('pt-BR')} L</td>
                                    <td className="px-6 py-4 flex justify-center gap-3">
                                        <button onClick={() => handleOpenModal(t)} className="text-gray-400 hover:text-blue-500 transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                {editingTanque ? 'Editar Tanque' : 'Novo Tanque'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Tanque</label>
                                <input
                                    type="text"
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Ex: Tanque 01 - GC"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Combustível</label>
                                <select
                                    value={formData.combustivel_id}
                                    onChange={e => setFormData({ ...formData, combustivel_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {combustiveis.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacidade (L)</label>
                                    <input
                                        type="number"
                                        value={formData.capacidade}
                                        onChange={e => setFormData({ ...formData, capacidade: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estoque Inicial (L)</label>
                                    <input
                                        type="number"
                                        value={formData.estoque_atual}
                                        onChange={e => setFormData({ ...formData, estoque_atual: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
