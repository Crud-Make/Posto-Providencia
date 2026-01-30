import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { formatDateDisplay } from '../../lib/utils';

/**
 * Props para o componente DataFechamentoCard.
 */
interface DataFechamentoCardProps {
    /** Data selecionada para o fechamento */
    data: Date;
    /** Função callback chamada ao pressionar o botão de alterar */
    onPressChange: () => void;
}

/**
 * Componente que exibe a data de fechamento selecionada e permite alteração.
 *
 * @param {DataFechamentoCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} O componente renderizado.
 */
export function DataFechamentoCard({ data, onPressChange }: DataFechamentoCardProps) {
    return (
        <View
            className="mx-4 mt-3 p-4 bg-white rounded-2xl border border-gray-100"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
        >
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                        <Calendar size={20} color="#2563eb" />
                    </View>
                    <View>
                        <Text className="text-xs text-gray-500 font-medium uppercase tracking-wider">Data do Fechamento</Text>
                        <Text className="text-base font-bold text-gray-800">{formatDateDisplay(data)}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={onPressChange}
                    className="bg-blue-600 px-4 py-2 rounded-xl"
                    activeOpacity={0.7}
                >
                    <Text className="text-white font-bold text-sm">Alterar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
