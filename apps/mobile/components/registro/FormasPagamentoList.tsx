import { View, Text, TextInput } from 'react-native';
import type { RegistroTurno, FormaPagamento } from './types';
import { FORMAS_PAGAMENTO } from './constants';

/**
 * Props para o componente FormasPagamentoList.
 */
interface FormasPagamentoListProps {
    /** Estado atual dos registros */
    registro: RegistroTurno;
    /** Função para atualizar um campo específico */
    onChange: (field: keyof RegistroTurno, value: string) => void;
}

/**
 * Componente que renderiza a lista de inputs para cada forma de pagamento.
 * Mapeia a constante FORMAS_PAGAMENTO para gerar os campos.
 *
 * @param {FormasPagamentoListProps} props - Propriedades do componente.
 * @returns {JSX.Element} O componente renderizado.
 */
export function FormasPagamentoList({ registro, onChange }: FormasPagamentoListProps) {
    /**
     * Mapeia o ID da forma de pagamento para a chave correspondente no estado RegistroTurno.
     * @param {string} id - ID da forma de pagamento (ex: 'debito').
     * @returns {keyof RegistroTurno} A chave correspondente no estado.
     */
    const getFieldKey = (id: string): keyof RegistroTurno => {
        switch (id) {
            case 'debito': return 'valorCartaoDebito';
            case 'credito': return 'valorCartaoCredito';
            case 'pix': return 'valorPix';
            case 'dinheiro': return 'valorDinheiro';
            // Nota/Vale é tratado separadamente, mas se estivesse aqui seria valorNota (não usado diretamente neste input)
            default: return 'valorDinheiro'; // Fallback seguro
        }
    };

    /**
     * Renderiza um único campo de input.
     */
    const renderInputField = (forma: FormaPagamento) => {
        // Pula 'nota' pois ela tem UI específica (modal)
        if (forma.id === 'nota') return null;

        const field = getFieldKey(forma.id);
        const value = registro[field];
        const Icon = forma.icon;

        return (
            <View key={forma.id} className="mb-4">
                <View
                    className="flex-row items-center bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                >
                    <View
                        className="p-4 items-center justify-center"
                        style={{ backgroundColor: forma.bgColor }}
                    >
                        <Icon size={24} color={forma.color} />
                    </View>
                    <View className="flex-1 px-4">
                        <Text className="text-xs text-gray-400 font-medium">{forma.label}</Text>
                        <View className="flex-row items-center">
                            <Text className="text-gray-500 text-lg font-medium mr-1">R$</Text>
                            <TextInput
                                className="flex-1 text-xl font-bold text-gray-800 py-2"
                                placeholder="0,00"
                                placeholderTextColor="#d1d5db"
                                value={value}
                                onChangeText={(text) => onChange(field, text)}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View className="px-4 mt-6">
            {FORMAS_PAGAMENTO.map(renderInputField)}

            {/* Input separado para Moedas (não está na lista principal de constantes com ícone específico no design original, mas pode ser adicionado) */}
            <View className="mb-4">
                <View
                    className="flex-row items-center bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                >
                    <View
                        className="p-4 items-center justify-center bg-yellow-50"
                    >
                        {/* Reutilizando Banknote ou criando um ícone de moeda se necessário, aqui usando Banknote genérico */}
                        {/* Na verdade o Lucide tem 'Coins' */}
                        <Text className="text-2xl">🪙</Text>
                    </View>
                    <View className="flex-1 px-4">
                        <Text className="text-xs text-gray-400 font-medium">Moedas</Text>
                        <View className="flex-row items-center">
                            <Text className="text-gray-500 text-lg font-medium mr-1">R$</Text>
                            <TextInput
                                className="flex-1 text-xl font-bold text-gray-800 py-2"
                                placeholder="0,00"
                                placeholderTextColor="#d1d5db"
                                value={registro.valorMoedas}
                                onChangeText={(text) => onChange('valorMoedas', text)}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* Input separado para Baratão */}
            <View className="mb-4">
                <View
                    className="flex-row items-center bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                >
                    <View
                        className="p-4 items-center justify-center bg-purple-50"
                    >
                        <Text className="text-2xl">🏷️</Text>
                    </View>
                    <View className="flex-1 px-4">
                        <Text className="text-xs text-gray-400 font-medium">Baratão</Text>
                        <View className="flex-row items-center">
                            <Text className="text-gray-500 text-lg font-medium mr-1">R$</Text>
                            <TextInput
                                className="flex-1 text-xl font-bold text-gray-800 py-2"
                                placeholder="0,00"
                                placeholderTextColor="#d1d5db"
                                value={registro.valorBaratao}
                                onChangeText={(text) => onChange('valorBaratao', text)}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}
