import { View, Text, TouchableOpacity } from 'react-native';
import { Receipt, Plus, Trash2 } from 'lucide-react-native';
import { formatCurrency } from '../../lib/utils';
import type { NotaItem } from './types';

/**
 * Props para o componente NotasListCard.
 */
interface NotasListCardProps {
    /** Lista de notas adicionadas */
    notasAdicionadas: NotaItem[];
    /** Valor total das notas somadas */
    totalNotas: number;
    /** Função chamada ao pressionar o botão de adicionar */
    onAddPress: () => void;
    /** Função chamada ao remover uma nota específica */
    onRemoveNota: (index: number) => void;
}

/**
 * Componente que exibe a lista de notas/vales adicionados e o total.
 * Permite adicionar novas notas e remover existentes.
 *
 * @param {NotasListCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} O componente renderizado.
 */
export function NotasListCard({
    notasAdicionadas,
    totalNotas,
    onAddPress,
    onRemoveNota
}: NotasListCardProps) {
    return (
        <View className="mb-4 px-4">
            <View className="flex-row items-center justify-between mb-3 px-1">
                <View>
                    <Text className="text-lg font-black text-gray-800">📑 Notas / Vales</Text>
                    <Text className="text-xs text-gray-400">Vendas faturadas a prazo</Text>
                </View>
                <TouchableOpacity
                    className="bg-cyan-600 px-4 py-2.5 rounded-2xl flex-row items-center gap-2 shadow-sm"
                    onPress={onAddPress}
                >
                    <Plus size={16} color="white" strokeWidth={3} />
                    <Text className="text-white font-black text-sm uppercase">Adicionar</Text>
                </TouchableOpacity>
            </View>

            {notasAdicionadas.length === 0 ? (
                <View className="bg-gray-100 rounded-[32px] p-10 border-2 border-gray-200 border-dashed items-center justify-center">
                    <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-4">
                        <Receipt size={32} color="#9ca3af" />
                    </View>
                    <Text className="text-gray-400 text-sm font-bold text-center">Nenhuma nota pendente</Text>
                    <Text className="text-gray-300 text-[10px] uppercase mt-1 tracking-tighter">Toque em adicionar para registrar</Text>
                </View>
            ) : (
                <View
                    className="bg-white rounded-[32px] border-2 border-cyan-100 overflow-hidden shadow-sm"
                    style={{ elevation: 3 }}
                >
                    {notasAdicionadas.map((item, index) => (
                        <View key={index} className={`flex-row items-center justify-between p-5 ${index !== notasAdicionadas.length - 1 ? 'border-b border-gray-50' : ''}`}>
                            <View className="flex-1 pr-2">
                                <Text className="text-gray-800 font-black text-base" numberOfLines={1}>{item.cliente_nome}</Text>
                                <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Venda faturada</Text>
                            </View>
                            <View className="flex-row items-center gap-4">
                                <View className="bg-cyan-50 px-3 py-1.5 rounded-xl border border-cyan-100">
                                    <Text className="font-black text-cyan-700 text-base">{formatCurrency(item.valor_number)}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => onRemoveNota(index)}
                                    className="bg-red-50 p-2 rounded-xl border border-red-100"
                                >
                                    <Trash2 size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    <View className="bg-cyan-600 p-5 flex-row justify-between items-center">
                        <Text className="text-white font-black text-sm uppercase tracking-widest">Total em Notas</Text>
                        <Text className="text-white font-black text-2xl">{formatCurrency(totalNotas)}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}
