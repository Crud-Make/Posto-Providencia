import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import {
    Calendar,
    Check,
    AlertTriangle,
    ChevronRight,
    Clock,
    TrendingUp,
    TrendingDown,
    Filter
} from 'lucide-react-native';

interface HistoricoItem {
    id: string;
    data: string;
    turno: string;
    totalInformado: number;
    faltaCaixa: number;
    status: 'ok' | 'divergente';
    observacoes?: string;
}

// Dados mock para demonstração
const MOCK_HISTORICO: HistoricoItem[] = [
    {
        id: '1',
        data: '21/12/2024',
        turno: 'Manhã',
        totalInformado: 2839.08,
        faltaCaixa: 0,
        status: 'ok',
    },
    {
        id: '2',
        data: '20/12/2024',
        turno: 'Manhã',
        totalInformado: 3156.50,
        faltaCaixa: 45.30,
        status: 'divergente',
        observacoes: 'Cliente foi embora sem pagar R$ 45,30'
    },
    {
        id: '3',
        data: '19/12/2024',
        turno: 'Manhã',
        totalInformado: 2654.00,
        faltaCaixa: 0,
        status: 'ok',
    },
    {
        id: '4',
        data: '18/12/2024',
        turno: 'Manhã',
        totalInformado: 2987.75,
        faltaCaixa: 0,
        status: 'ok',
    },
    {
        id: '5',
        data: '17/12/2024',
        turno: 'Manhã',
        totalInformado: 2456.00,
        faltaCaixa: 20.00,
        status: 'divergente',
        observacoes: 'Erro no troco'
    },
];

export default function HistoricoScreen() {
    const [historico, setHistorico] = useState<HistoricoItem[]>(MOCK_HISTORICO);
    const [refreshing, setRefreshing] = useState(false);
    const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ok' | 'divergente'>('todos');

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Simula busca de dados
        setTimeout(() => {
            setRefreshing(false);
        }, 1500);
    }, []);

    const formatCurrency = (value: number): string => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    const historicoFiltrado = historico.filter(item => {
        if (filtroAtivo === 'todos') return true;
        return item.status === filtroAtivo;
    });

    const totalOk = historico.filter(h => h.status === 'ok').length;
    const totalDivergente = historico.filter(h => h.status === 'divergente').length;

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
                        <Text className="text-gray-500 text-xs font-medium">Sem Falta</Text>
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
                        <Text className="text-gray-500 text-xs font-medium">Com Falta</Text>
                    </View>
                    <Text className="text-3xl font-black text-gray-800">{totalDivergente}</Text>
                    <Text className="text-xs text-gray-400 mt-1">registros</Text>
                </View>
            </View>

            {/* Filtros */}
            <View className="flex-row px-4 mt-4 gap-2">
                {[
                    { key: 'todos', label: 'Todos' },
                    { key: 'ok', label: 'Sem Falta' },
                    { key: 'divergente', label: 'Com Falta' },
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
                contentContainerStyle={{ paddingBottom: 20 }}
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
                                        <Text className="text-base font-bold text-gray-800">{item.data}</Text>
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
                                    <Text className="text-xs text-gray-400 mb-1">Total Informado</Text>
                                    <Text className="text-lg font-bold text-gray-800">{formatCurrency(item.totalInformado)}</Text>
                                </View>

                                {item.faltaCaixa > 0 && (
                                    <View className="bg-red-50 px-3 py-2 rounded-xl">
                                        <Text className="text-xs text-red-500 mb-0.5">Falta</Text>
                                        <Text className="text-base font-bold text-red-600">- {formatCurrency(item.faltaCaixa)}</Text>
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
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
