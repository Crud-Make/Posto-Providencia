import React, { useEffect, useState } from 'react';
import { ShoppingBag, ChevronLeft, Package, Minus, Plus, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface VendasProps {
    frentistaId: number;
    frentistaNome: string;
    onVoltar: () => void;
}

interface Produto {
    id: number;
    nome: string;
    preco_venda: number;
    estoque_atual: number;
    categoria: string;
    unidade_medida: string;
}

interface CarrinhoItem {
    produto: Produto;
    quantidade: number;
}

const VendasScreen: React.FC<VendasProps> = ({ frentistaId, frentistaNome, onVoltar }) => {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
    const [vendasHoje, setVendasHoje] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        Promise.all([
            api.getProdutos(1),
            api.getVendasProdutoHoje(frentistaId)
        ]).then(([prods, vendas]) => {
            setProdutos(prods);
            setVendasHoje(vendas);
        }).catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [frentistaId]);

    const addToCarrinho = (produto: Produto) => {
        setCarrinho(prev => {
            const existing = prev.find(c => c.produto.id === produto.id);
            if (existing) {
                if (existing.quantidade >= produto.estoque_atual) return prev;
                return prev.map(c => c.produto.id === produto.id ? { ...c, quantidade: c.quantidade + 1 } : c);
            }
            return [...prev, { produto, quantidade: 1 }];
        });
    };

    const removeFromCarrinho = (produtoId: number) => {
        setCarrinho(prev => {
            const existing = prev.find(c => c.produto.id === produtoId);
            if (existing && existing.quantidade > 1) {
                return prev.map(c => c.produto.id === produtoId ? { ...c, quantidade: c.quantidade - 1 } : c);
            }
            return prev.filter(c => c.produto.id !== produtoId);
        });
    };

    const getQtdCarrinho = (produtoId: number) => {
        return carrinho.find(c => c.produto.id === produtoId)?.quantidade || 0;
    };

    const totalCarrinho = carrinho.reduce((sum, c) => sum + (c.produto.preco_venda * c.quantidade), 0);

    const handleEnviar = async () => {
        if (carrinho.length === 0) return;
        setEnviando(true);
        try {
            for (const item of carrinho) {
                await api.registrarVendaProduto({
                    frentista_id: frentistaId,
                    produto_id: item.produto.id,
                    quantidade: item.quantidade,
                    valor_unitario: item.produto.preco_venda,
                    valor_total: item.produto.preco_venda * item.quantidade
                });
            }
            alert('Vendas registradas com sucesso! ✅');
            setCarrinho([]);
            // Refresh
            const [prods, vendas] = await Promise.all([
                api.getProdutos(1),
                api.getVendasProdutoHoje(frentistaId)
            ]);
            setProdutos(prods);
            setVendasHoje(vendas);
        } catch (err: any) {
            alert(`Erro: ${err.message}`);
        } finally {
            setEnviando(false);
        }
    };

    const formatCurrency = (val: number) =>
        val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const categorias = [...new Set(produtos.map(p => p.categoria))].filter(Boolean);

    return (
        <div className="flex flex-col min-h-screen bg-[#0A0D14] text-slate-100 font-sans pb-40">
            <div className="p-5 flex-1 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={onVoltar} className="w-10 h-10 rounded-full bg-[#131722] flex items-center justify-center border border-slate-800/60">
                        <ChevronLeft size={20} className="text-slate-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">Venda de Produtos</h1>
                        <p className="text-sm text-slate-400">{frentistaNome} — Registrar vendas</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Produtos por Categoria */}
                        {categorias.map(cat => (
                            <div key={cat} className="mb-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">{cat}</h3>
                                <div className="space-y-2">
                                    {produtos.filter(p => p.categoria === cat).map(produto => {
                                        const qtd = getQtdCarrinho(produto.id);
                                        return (
                                            <div key={produto.id} className="bg-[#131722] rounded-2xl p-4 border border-slate-800/60 flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                                        <Package size={18} className="text-indigo-400" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-white font-semibold text-sm">{produto.nome}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-emerald-400 font-bold text-sm">R$ {formatCurrency(produto.preco_venda)}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${produto.estoque_atual <= (produto as any).estoque_minimo ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                                                Est: {produto.estoque_atual}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {qtd > 0 && (
                                                        <button onClick={() => removeFromCarrinho(produto.id)}
                                                            className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                                                            <Minus size={14} className="text-red-400" />
                                                        </button>
                                                    )}
                                                    {qtd > 0 && (
                                                        <span className="text-white font-bold text-lg w-6 text-center">{qtd}</span>
                                                    )}
                                                    <button onClick={() => addToCarrinho(produto)}
                                                        disabled={produto.estoque_atual <= 0}
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center border
                              ${produto.estoque_atual <= 0 ? 'bg-slate-800 border-slate-700 cursor-not-allowed' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
                                                        <Plus size={14} className={produto.estoque_atual <= 0 ? 'text-slate-600' : 'text-emerald-400'} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {produtos.length === 0 && (
                            <div className="bg-[#131722] rounded-3xl p-10 border border-slate-800/60 flex flex-col items-center justify-center text-center mt-6">
                                <ShoppingBag size={40} className="text-slate-600 mb-3" />
                                <p className="text-slate-400 font-semibold">Nenhum produto cadastrado</p>
                                <p className="text-slate-500 text-xs mt-1">Adicione produtos pelo painel de gestão</p>
                            </div>
                        )}

                        {/* Vendas de Hoje */}
                        {vendasHoje.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Vendas de hoje</h3>
                                <div className="space-y-2">
                                    {vendasHoje.map((v: any) => (
                                        <div key={v.id} className="bg-[#131722]/60 rounded-xl p-3 border border-slate-800/40 flex items-center justify-between">
                                            <div>
                                                <p className="text-slate-300 text-sm font-medium">{v.produto?.nome || 'Produto'}</p>
                                                <p className="text-slate-500 text-xs">{v.quantidade}x R$ {formatCurrency(v.valor_unitario)}</p>
                                            </div>
                                            <span className="text-emerald-400 font-bold text-sm">R$ {formatCurrency(v.valor_total)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Barra de Envio Fixa */}
            {carrinho.length > 0 && (
                <div className="fixed bottom-20 left-0 right-0 px-5 pb-4 z-50">
                    <button onClick={handleEnviar} disabled={enviando}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-lg
              ${enviando ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 shadow-indigo-600/30'}`}>
                        <Check size={20} />
                        {enviando ? 'Enviando...' : `Registrar ${carrinho.length} item(s) — R$ ${formatCurrency(totalCarrinho)}`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default VendasScreen;
