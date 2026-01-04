import React, { useState, useEffect } from 'react';
import {
    Package,
    Plus,
    Search,
    AlertTriangle,
    ArrowUpCircle,
    ArrowDownCircle,
    History,
    MoreVertical,
    Filter,
    DollarSign,
    Box,
    Tags,
    Edit2,
    Trash2,
    X,
    Save,
    Loader2
} from 'lucide-react';
import { stockService } from '../services/stockService';
import { Produto, MovimentacaoEstoque } from '../services/database.types';
import { usePosto } from '../contexts/PostoContext';

const TelaGestaoEstoque: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<Produto[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

    // Modals
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
    const [selectedProductForMovement, setSelectedProductForMovement] = useState<Produto | null>(null);
    const [movementType, setMovementType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');

    // Stats
    const lowStockCount = products.filter(p => p.estoque_atual <= p.estoque_minimo).length;
    const totalValue = products.reduce((acc, p) => acc + (p.estoque_atual * p.preco_custo), 0);

    useEffect(() => {
        loadProducts();
    }, [postoAtivoId]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await stockService.getAllProducts(postoAtivoId);
            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.codigo_barras?.includes(searchTerm);
        const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const productData = {
            nome: formData.get('nome') as string,
            codigo_barras: formData.get('codigo_barras') as string,
            categoria: formData.get('categoria') as string,
            preco_custo: Number(formData.get('preco_custo')),
            preco_venda: Number(formData.get('preco_venda')),
            estoque_minimo: Number(formData.get('estoque_minimo')),
            unidade_medida: formData.get('unidade_medida') as string,
            descricao: formData.get('descricao') as string,
        };

        try {
            if (editingProduct) {
                await stockService.updateProduct(editingProduct.id, productData);
            } else {
                await stockService.createProduct({
                    ...productData,
                    estoque_atual: Number(formData.get('estoque_inicial') || 0),
                    posto_id: postoAtivoId
                });
            }
            setIsProductModalOpen(false);
            setEditingProduct(null);
            loadProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Erro ao salvar produto');
        }
    };

    const handleSaveMovement = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedProductForMovement) return;

        const formData = new FormData(e.currentTarget);
        const type = formData.get('tipo') as 'entrada' | 'saida' | 'ajuste';
        const quantity = Number(formData.get('quantidade'));

        try {
            await stockService.registerMovement({
                produto_id: selectedProductForMovement.id,
                tipo: type,
                quantidade: quantity,
                valor_unitario: type === 'entrada' ? Number(formData.get('valor_unitario')) : undefined,
                observacao: formData.get('observacao') as string,
                data: new Date().toISOString(),
                posto_id: postoAtivoId
            } as any);
            setIsMovementModalOpen(false);
            setSelectedProductForMovement(null);
            setMovementType('entrada'); // Reset default
            loadProducts();
        } catch (error) {
            console.error('Error saving movement:', error);
            alert('Erro ao registrar movimentação');
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-6 font-sans text-gray-800">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-gray-900">Gestão de Estoque (Produtos)</h2>
                    <p className="text-gray-500 mt-1">Gerencie lubrificantes, aditivos e outros itens da loja.</p>
                </div>
                <button
                    onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all"
                >
                    <Plus size={20} />
                    Novo Produto
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Produtos</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{products.length}</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Package size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Itens com Estoque Baixo</p>
                        <p className="text-2xl font-black text-red-600 mt-1">{lowStockCount}</p>
                    </div>
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                        <AlertTriangle size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valor em Estoque (Custo)</p>
                        <p className="text-2xl font-black text-green-600 mt-1">
                            {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <DollarSign size={24} />
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                    {['Todos', 'Lubrificante', 'Aditivo', 'Filtro', 'Acessorio', 'Outros'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${selectedCategory === cat
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 size={32} className="animate-spin text-blue-600" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                        <Package size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">Nenhum produto encontrado</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Produto</th>
                                    <th className="px-6 py-4">Categoria</th>
                                    <th className="px-6 py-4 text-center">Estoque</th>
                                    <th className="px-6 py-4 text-right">Preço Venda</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-gray-900">{product.nome}</p>
                                                <p className="text-xs text-gray-500">{product.codigo_barras || '-'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {product.categoria}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`font-bold text-base ${product.estoque_atual <= product.estoque_minimo ? 'text-red-600' : 'text-gray-900'
                                                    }`}>
                                                    {product.estoque_atual} {product.unidade_medida}
                                                </span>
                                                {product.estoque_atual <= product.estoque_minimo && (
                                                    <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-0.5">
                                                        <AlertTriangle size={10} /> Baixo
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                                            {product.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedProductForMovement(product);
                                                        setMovementType('entrada');
                                                        setIsMovementModalOpen(true);
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg tooltip"
                                                    title="Movimentar Estoque"
                                                >
                                                    <ArrowUpCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Movement Modal */}
            {isMovementModalOpen && selectedProductForMovement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Registrar Movimentação</h3>
                            <button onClick={() => setIsMovementModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMovement} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                    {selectedProductForMovement.nome}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select
                                        name="tipo"
                                        value={movementType}
                                        onChange={(e) => setMovementType(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" required
                                    >
                                        <option value="entrada">Entrada (+)</option>
                                        <option value="saida">Saída (-)</option>
                                        <option value="ajuste">Balanco/Ajuste</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                                    <input
                                        type="number"
                                        name="quantidade"
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {movementType === 'entrada' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Custo Unitário da Entrada (R$)</label>
                                    <input
                                        type="number"
                                        name="valor_unitario"
                                        step="0.01"
                                        defaultValue={selectedProductForMovement.preco_custo}
                                        className="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <p className="text-xs text-blue-600 mt-1">Este valor será usado para recalcular o custo médio.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                                <textarea
                                    name="observacao"
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                    placeholder="Ex: Compra NF 123, Quebra, Consumo interno..."
                                ></textarea>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsMovementModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
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

            {/* Product Edit/Create Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">
                                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                            </h3>
                            <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                                    <input
                                        type="text"
                                        name="nome"
                                        defaultValue={editingProduct?.nome}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
                                    <input
                                        type="text"
                                        name="codigo_barras"
                                        defaultValue={editingProduct?.codigo_barras || ''}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                    <select
                                        name="categoria"
                                        defaultValue={editingProduct?.categoria || 'Lubrificante'}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="Lubrificante">Lubrificante</option>
                                        <option value="Aditivo">Aditivo</option>
                                        <option value="Filtro">Filtro</option>
                                        <option value="Acessorio">Acessório</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Custo (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="preco_custo"
                                        defaultValue={editingProduct?.preco_custo}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="preco_venda"
                                        defaultValue={editingProduct?.preco_venda}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
                                    <input
                                        type="number"
                                        name="estoque_minimo"
                                        defaultValue={editingProduct?.estoque_minimo || 5}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                                    <select
                                        name="unidade_medida"
                                        defaultValue={editingProduct?.unidade_medida || 'unidade'}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="unidade">Unidade (un)</option>
                                        <option value="litro">Litro (l)</option>
                                        <option value="caixa">Caixa (cx)</option>
                                    </select>
                                </div>

                                {!editingProduct && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Inicial</label>
                                        <input
                                            type="number"
                                            name="estoque_inicial"
                                            defaultValue={0}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
                                    <textarea
                                        name="descricao"
                                        defaultValue={editingProduct?.descricao || ''}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
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
};

export default TelaGestaoEstoque;
