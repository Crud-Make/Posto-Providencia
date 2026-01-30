import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, Search, Plus } from 'lucide-react-native';

import { supabase } from '../../lib/supabase';
import { frentistaService } from '../../services/frentista';
import { produtoService, type Produto } from '../../services/produto';
import { vendaProdutoService, type VendaProduto } from '../../services/vendaProduto';

/**
 * Interface que representa os dados básicos do frentista na tela de vendas.
 */
interface Frentista {
    /** ID único do frentista */
    id: number;
    /** Nome do frentista */
    nome: string;
    /** ID do posto associado */
    posto_id: number;
}

/**
 * Tela de Venda de Produtos.
 * Permite que o frentista registre vendas de produtos (óleo, aditivos, etc.)
 * e visualize as vendas realizadas no dia atual.
 * 
 * @component
 * @returns {JSX.Element} O componente da tela de vendas.
 */
export default function VendasScreen() {
    const insets = useSafeAreaInsets();
    const [frentista, setFrentista] = useState<Frentista | null>(null);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [vendasHoje, setVendasHoje] = useState<VendaProduto[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form
    const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(null);
    const [quantidade, setQuantidade] = useState('1');
    const [searchTerm, setSearchTerm] = useState('');

    /**
     * Efeito inicial para carregar o usuário logado e dados iniciais.
     */
    useEffect(() => {
        loadUser();
        loadData();
    }, []);

    /**
     * Carrega as informações do frentista logado.
     * Busca o usuário autenticado no Supabase e seus dados na tabela de frentistas.
     */
    const loadUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const frentistaData = await frentistaService.getByUserId(user.id);
                if (frentistaData) {
                    setFrentista(frentistaData);
                }
            }
        } catch (e) {
            console.error('Erro ao carregar usuário:', e);
            Alert.alert('Erro', 'Não foi possível carregar as informações do usuário.');
        }
    };

    /**
     * Efeito que recarrega vendas e produtos quando o frentista é identificado.
     */
    useEffect(() => {
        if (frentista?.id) {
            loadVendas();
            loadData(); // Agora que temos o frentista e seu posto_id, recarregamos os produtos
        }
    }, [frentista?.id, frentista?.posto_id]);

    /**
     * Realtime subscriptions para Produtos e VendaProduto
     */
    useEffect(() => {
        if (!frentista?.id || !frentista?.posto_id) return;

        const subscription = supabase
            .channel('vendas_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Produto' }, () => {
                console.log('🔄 Produtos alterados, recarregando...');
                loadData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'VendaProduto' }, () => {
                console.log('🔄 Vendas alteradas, recarregando...');
                loadVendas();
            })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [frentista?.id, frentista?.posto_id]);

    /**
     * Carrega a lista de produtos disponíveis para o posto do frentista.
     */
    const loadData = async () => {
        try {
            setLoading(true);
            const data = await produtoService.getAll(frentista?.posto_id);
            setProdutos(data);
            if (data.length > 0) setSelectedProdutoId(data[0].id);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar os produtos.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Carrega as vendas de produtos realizadas pelo frentista no dia de hoje.
     */
    const loadVendas = async () => {
        if (!frentista?.id) return;
        try {
            const data = await vendaProdutoService.getByFrentistaToday(frentista.id);
            setVendasHoje(data);
        } catch (error) {
            console.error(error);
        }
    };

    /**
     * Processa o registro de uma nova venda.
     * Valida o estoque, quantidade e registra a venda no banco de dados.
     */
    const handleVenda = async () => {
        if (!selectedProdutoId || !frentista?.id) return;

        const produto = produtos.find(p => p.id === selectedProdutoId);
        if (!produto) return;

        const qtd = parseFloat(quantidade.replace(',', '.'));
        if (isNaN(qtd) || qtd <= 0) {
            Alert.alert('Erro', 'Quantidade inválida.');
            return;
        }

        if (produto.estoque_atual < qtd) {
            Alert.alert('Atenção', `Estoque insuficiente! Disponível: ${produto.estoque_atual}`);
            return;
        }

        try {
            setSubmitting(true);
            await vendaProdutoService.create({
                frentista_id: frentista.id,
                produto_id: produto.id,
                quantidade: qtd,
                valor_unitario: produto.preco_venda,
                posto_id: frentista.posto_id
            });

            Alert.alert('Sucesso', 'Venda realizada!');
            setQuantidade('1');
            loadVendas();
            loadData(); // Atualiza estoque
        } catch (error) {
            Alert.alert('Erro', 'Falha ao registrar venda.');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredProdutos = produtos.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedProduto = produtos.find(p => p.id === selectedProdutoId);

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="bg-red-700 pt-4 pb-6 px-4">
                <Text className="text-white text-xl font-bold">Venda de Produtos</Text>
                <Text className="text-red-100 text-sm">Registre saídas de óleo, aditivos, etc.</Text>
            </View>

            <View className="p-4 -mt-4">
                {/* Card Nova Venda */}
                <View className="bg-white rounded-xl shadow-sm p-4 mb-4">
                    <Text className="text-lg font-bold text-gray-800 mb-4 flex-row items-center">
                        <Plus size={20} color="#b91c1c" /> Nova Venda
                    </Text>

                    {loading ? (
                        <ActivityIndicator color="#b91c1c" />
                    ) : (
                        <>
                            <Text className="text-sm font-semibold text-gray-500 mb-1">Buscar Produto</Text>
                            <View className="flex-row items-center bg-gray-100 rounded-lg px-3 mb-3 border border-gray-200">
                                <Search size={20} color="#9ca3af" />
                                <TextInput
                                    className="flex-1 py-3 px-2 text-gray-800"
                                    placeholder="Nome do produto..."
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                />
                            </View>

                            <Text className="text-sm font-semibold text-gray-500 mb-1">Selecionar Produto</Text>
                            {/* Custom Simple Selector since Picker might be missing */}
                            <ScrollView horizontal className="flex-row mb-4 h-24" showsHorizontalScrollIndicator={false}>
                                {filteredProdutos.map(p => (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => setSelectedProdutoId(p.id)}
                                        className={`mr-3 p-3 rounded-lg border w-40 justify-center ${selectedProdutoId === p.id ? 'bg-red-50 border-red-500' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`font-bold ${selectedProdutoId === p.id ? 'text-red-700' : 'text-gray-800'}`} numberOfLines={1}>{p.nome}</Text>
                                        <Text className="text-xs text-gray-500">R$ {p.preco_venda.toFixed(2)}</Text>
                                        <Text className="text-xs text-gray-400">Est: {p.estoque_atual}</Text>
                                    </TouchableOpacity>
                                ))}
                                {filteredProdutos.length === 0 && (
                                    <Text className="text-gray-400 py-4">Nenhum produto encontrado.</Text>
                                )}
                            </ScrollView>

                            <Text className="text-sm font-semibold text-gray-500 mb-1">Quantidade</Text>
                            <View className="bg-gray-100 rounded-lg px-3 mb-4 border border-gray-200">
                                <TextInput
                                    className="py-3 text-gray-800 text-lg font-bold"
                                    value={quantidade}
                                    onChangeText={setQuantidade}
                                    keyboardType="numeric"
                                    placeholder="1"
                                />
                            </View>

                            {selectedProduto && (
                                <Text className="text-right text-sm text-gray-500 mb-3">
                                    Total: R$ {(selectedProduto.preco_venda * (parseFloat(quantidade.replace(',', '.')) || 0)).toFixed(2)}
                                </Text>
                            )}

                            <TouchableOpacity
                                onPress={handleVenda}
                                disabled={submitting || !selectedProdutoId}
                                className={`rounded-lg py-3 flex-row justify-center items-center ${submitting || !selectedProdutoId ? 'bg-gray-300' : 'bg-red-700'}`}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">Registrar Venda</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Lista de Vendas Hoje */}
                <Text className="text-lg font-bold text-gray-800 mb-2 px-1">Vendas de Hoje</Text>
                {vendasHoje.length === 0 ? (
                    <View className="p-8 items-center bg-white rounded-xl shadow-sm">
                        <ShoppingBag size={48} color="#e5e7eb" />
                        <Text className="text-gray-400 mt-2 text-center">Nenhuma venda registrada hoje.</Text>
                    </View>
                ) : (
                    vendasHoje.map((venda) => (
                        <View key={venda.id} className="bg-white rounded-lg p-3 mb-2 shadow-sm border border-gray-100 flex-row justify-between items-center">
                            <View className="flex-1">
                                <Text className="font-bold text-gray-800">{venda.Produto?.nome || 'Produto Indefinido'}</Text>
                                <Text className="text-xs text-gray-500">
                                    {new Date(venda.data).toLocaleTimeString().slice(0, 5)} • {venda.quantidade} un x R$ {venda.valor_unitario.toFixed(2)}
                                </Text>
                            </View>
                            <Text className="font-bold text-red-700 text-base">
                                R$ {venda.valor_total.toFixed(2)}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            {/* Spacer para tab bar */}
            <View style={{ height: insets.bottom + 100 }} />
        </ScrollView>
    );
}
