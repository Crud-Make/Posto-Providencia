import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { frentistaService, fechamentoFrentistaService } from '../../lib/api';
import { usePosto } from '../../lib/PostoContext';
import {
    Calendar,
    Check,
    AlertTriangle,
    ChevronRight,
    Clock,
    Gauge
} from 'lucide-react-native';

interface HistoricoItem {
    id: number;
    data: string;
    turno: string;
    totalInformado: number;
    encerrante: number;
    diferenca: number;
    status: 'ok' | 'divergente';
    observacoes?: string;
}

export default function HistoricoScreen() {
    const insets = useSafeAreaInsets();
    const { postoAtivoId } = usePosto();
    const [historico, setHistorico] = useState<HistoricoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ok' | 'divergente'>('todos');

    const loadHistorico = async () => {
        if (!postoAtivoId) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const frentista = await frentistaService.getByUserId(user.id);
            if (!frentista) return;

            const dados = await fechamentoFrentistaService.getHistorico(frentista.id, postoAtivoId);
            setHistorico(dados);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistorico();
    }, [postoAtivoId]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadHistorico();
        setRefreshing(false);
    }, []);

    const formatCurrency = (value: number): string => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    const formatDate = (dateStr: string): string => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        return date.toLocaleDateString('pt-BR');
    };

    const historicoFiltrado = historico.filter(item => {
        if (filtroAtivo === 'todos') return true;
        return item.status === filtroAtivo;
    });

    const totalOk = historico.filter(h => h.status === 'ok').length;
    const totalDivergente = historico.filter(h => h.status === 'divergente').length;

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#b91c1c" />
                <Text className="text-gray-500 mt-4">Carregando histórico...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Stats Cards */}
            <View className="flex-row px-4 pt-4 gap-3">
                <View
                    className="flex-1 bg-white rounded-2xl p-4 border border-gray-100"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                >
                    <View className="flex-row items-center gap-2 mb-2">
                        <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center">
                            <Check size={16} color="#16a34a" strokeWidth={3} />
                        </View>
                        <Text className="text-gray-500 text-xs font-medium">Caixa OK</Text>
                    </View>
                    <Text className="text-3xl font-black text-gray-800">{totalOk}</Text>
                    <Text className="text-xs text-gray-400 mt-1">registros</Text>
                </View>

                <View
                    className="flex-1 bg-white rounded-2xl p-4 border border-gray-100"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                >
                    <View className="flex-row items-center gap-2 mb-2">
                        <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center">
                            <AlertTriangle size={16} color="#dc2626" />
                        </View>
                        <Text className="text-gray-500 text-xs font-medium">Divergente</Text>
                    </View>
                    <Text className="text-3xl font-black text-gray-800">{totalDivergente}</Text>
                    <Text className="text-xs text-gray-400 mt-1">registros</Text>
                </View>
            </View>

            {/* Filtros */}
            <View className="flex-row px-4 mt-4 gap-2">
                {[
                    { key: 'todos', label: 'Todos' },
                    { key: 'ok', label: 'Caixa OK' },
                    { key: 'divergente', label: 'Divergente' },
                ].map((filtro) => (
                    <TouchableOpacity
                        key={filtro.key}
                        className={`px-4 py-2 rounded-full ${filtroAtivo === filtro.key ? 'bg-primary-700' : 'bg-white border border-gray-200'}`}
                        onPress={() => setFiltroAtivo(filtro.key as any)}
                    >
                        <Text className={`text-sm font-semibold ${filtroAtivo === filtro.key ? 'text-white' : 'text-gray-600'}`}>
                            {filtro.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Lista de Histórico */}
            <ScrollView
                className="flex-1 px-4 mt-4"
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#b91c1c']}
                        tintColor="#b91c1c"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {historicoFiltrado.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        className={`bg-white rounded-2xl mb-3 overflow-hidden border ${item.status === 'divergente' ? 'border-red-200' : 'border-gray-100'}`}
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                        activeOpacity={0.7}
                    >
                        <View className="p-4">
                            {/* Header do Card */}
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center gap-3">
                                    <View className={`w-10 h-10 rounded-full items-center justify-center ${item.status === 'ok' ? 'bg-green-100' : 'bg-red-100'}`}>
                                        {item.status === 'ok' ? (
                                            <Check size={20} color="#16a34a" strokeWidth={3} />
                                        ) : (
                                            <AlertTriangle size={20} color="#dc2626" />
                                        )}
                                    </View>
                                    <View>
                                        <Text className="text-base font-bold text-gray-800">{formatDate(item.data)}</Text>
                                        <View className="flex-row items-center gap-1 mt-0.5">
                                            <Clock size={12} color="#9ca3af" />
                                            <Text className="text-xs text-gray-400">Turno {item.turno}</Text>
                                        </View>
                                    </View>
                                </View>
                                <ChevronRight size={20} color="#9ca3af" />
                            </View>

                            {/* Valores */}
                            <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
                                <View>
                                    <Text className="text-xs text-gray-400 mb-1">Total Pagamentos</Text>
                                    <Text className="text-lg font-bold text-gray-800">{formatCurrency(item.totalInformado)}</Text>
                                </View>

                                <View className="items-end">
                                    <View className="flex-row items-center gap-1 mb-1">
                                        <Gauge size={12} color="#7c3aed" />
                                        <Text className="text-xs text-purple-600">Encerrante</Text>
                                    </View>
                                    <Text className="text-lg font-bold text-purple-700">{formatCurrency(item.encerrante)}</Text>
                                </View>

                                {item.diferenca !== 0 && (
                                    <View className={`px-3 py-2 rounded-xl ${item.diferenca > 0 ? 'bg-red-50' : 'bg-yellow-50'}`}>
                                        <Text className={`text-xs ${item.diferenca > 0 ? 'text-red-500' : 'text-yellow-600'} mb-0.5`}>
                                            {item.diferenca > 0 ? 'Falta' : 'Sobra'}
                                        </Text>
                                        <Text className={`text-base font-bold ${item.diferenca > 0 ? 'text-red-600' : 'text-yellow-700'}`}>
                                            {item.diferenca > 0 ? '- ' : '+ '}{formatCurrency(Math.abs(item.diferenca))}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Observações */}
                            {item.observacoes && (
                                <View className="mt-3 p-3 bg-gray-50 rounded-xl">
                                    <Text className="text-xs text-gray-500">{item.observacoes}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}

                {historicoFiltrado.length === 0 && (
                    <View className="items-center justify-center py-16">
                        <Calendar size={48} color="#d1d5db" />
                        <Text className="text-gray-400 text-base mt-4">Nenhum registro encontrado</Text>
                        <Text className="text-gray-300 text-sm mt-1">Seus fechamentos aparecerão aqui</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
