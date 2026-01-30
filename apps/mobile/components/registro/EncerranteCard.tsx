import { View, Text, TextInput } from 'react-native';
import { Gauge } from 'lucide-react-native';

/**
 * Props para o componente EncerranteCard.
 */
interface EncerranteCardProps {
    /** Valor atual do encerrante (string formatada) */
    value: string;
    /** Função chamada ao alterar o texto */
    onChangeText: (text: string) => void;
}

/**
 * Componente principal para entrada do valor do encerrante (bomba).
 * Possui destaque visual na tela.
 *
 * @param {EncerranteCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} O componente renderizado.
 */
export function EncerranteCard({ value, onChangeText }: EncerranteCardProps) {
    return (
        <View className="px-4 mt-6">
            <View
                className="bg-indigo-600 rounded-[32px] p-6 shadow-xl"
                style={{ elevation: 8, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}
            >
                <View className="flex-row items-center gap-3 mb-4">
                    <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center border border-white/30">
                        <Gauge size={22} color="white" />
                    </View>
                    <View>
                        <Text className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Conferência de Vendas</Text>
                        <Text className="text-white text-lg font-black">Total Vendido (R$)</Text>
                    </View>
                </View>

                <View className="bg-white/10 rounded-2xl p-4 border border-white/20">
                    <View className="flex-row items-center">
                        <Text className="text-indigo-200 text-2xl font-bold mr-2">R$</Text>
                        <TextInput
                            className="flex-1 text-3xl font-black text-white py-1"
                            placeholder="0,00"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={value}
                            onChangeText={onChangeText}
                            keyboardType="decimal-pad"
                        />
                    </View>
                </View>
            </View>
        </View>
    );
}
