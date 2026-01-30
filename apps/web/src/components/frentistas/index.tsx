import React, { useState, useMemo } from 'react';
import { Search, UserPlus, Users, Filter } from 'lucide-react';
import { useFrentistas } from './hooks/useFrentistas';
import { ListaFrentistas } from './components/ListaFrentistas';
import { DetalhesFrentista } from './components/DetalhesFrentista';
import { FormFrentista } from './components/FormFrentista';
import { PerfilFrentista } from './types';

const TelaGestaoFrentistas: React.FC = () => {
    const { frentistas, loading, saving, error, salvarFrentista, excluirFrentista } = useFrentistas();

    // Estados locais
    const [termoBusca, setTermoBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Ativo' | 'Inativo'>('Ativo');
    const [frentistaSelecionadoId, setFrentistaSelecionadoId] = useState<string | null>(null);

    // Modal
    const [modalAberto, setModalAberto] = useState(false);
    const [frentistaEditando, setFrentistaEditando] = useState<PerfilFrentista | null>(null);

    // Filtragem
    const frentistasFiltrados = useMemo(() => {
        return frentistas.filter(f => {
            const matchNome = f.nome.toLowerCase().includes(termoBusca.toLowerCase());
            const matchStatus = filtroStatus === 'Todos' || f.status === filtroStatus;
            return matchNome && matchStatus;
        });
    }, [frentistas, termoBusca, filtroStatus]);

    const frentistaSelecionado = useMemo(() =>
        frentistas.find(f => f.id === frentistaSelecionadoId) || null
        , [frentistas, frentistaSelecionadoId]);

    // Handlers
    const handleNovoFrentista = () => {
        setFrentistaEditando(null);
        setModalAberto(true);
    };

    const handleEditarFrentista = (frentista: PerfilFrentista) => {
        setFrentistaEditando(frentista);
        setModalAberto(true);
    };

    const handleExcluirFrentista = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este frentista?')) {
            try {
                await excluirFrentista(id);
                if (frentistaSelecionadoId === id) {
                    setFrentistaSelecionadoId(null);
                }
            } catch (error) {
                alert('Erro ao excluir frentista.');
            }
        }
    };

    if (loading && frentistas.length === 0) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Users className="text-blue-600 dark:text-blue-400" />
                        Gestão de Equipe
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie frentistas, acessos e históricos</p>
                </div>

                <button
                    onClick={handleNovoFrentista}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <UserPlus size={20} />
                    Novo Colaborador
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome..."
                        value={termoBusca}
                        onChange={(e) => setTermoBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    <Filter className="text-gray-400" size={20} />
                    {(['Todos', 'Ativo', 'Inativo'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFiltroStatus(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filtroStatus === status
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista (Esquerda) */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden h-fit max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                    <ListaFrentistas
                        frentistas={frentistasFiltrados}
                        frentistaSelecionadoId={frentistaSelecionadoId}
                        onSelecionar={setFrentistaSelecionadoId}
                    />
                </div>

                {/* Detalhes (Direita - Ocupa 2 colunas) */}
                <div className="lg:col-span-2">
                    {frentistaSelecionado ? (
                        <DetalhesFrentista
                            frentista={frentistaSelecionado}
                            onEditar={handleEditarFrentista}
                            onExcluir={handleExcluirFrentista}
                        />
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                            <Users size={48} className="mb-4 opacity-50" />
                            <p className="font-medium">Selecione um colaborador para ver detalhes</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Cadastro/Edição */}
            <FormFrentista
                isOpen={modalAberto}
                onClose={() => setModalAberto(false)}
                frentista={frentistaEditando}
                onSalvar={salvarFrentista}
                loading={saving}
            />
        </div>
    );
};

export default TelaGestaoFrentistas;
