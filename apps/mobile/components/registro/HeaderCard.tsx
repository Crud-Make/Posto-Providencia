import { View, Text, TouchableOpacity } from 'react-native';
import { User, ChevronDown } from 'lucide-react-native';

/**
 * Props para o componente HeaderCard.
 */
interface HeaderCardProps {
    /** ID do frentista selecionado atualmente */
    frentistaId: number | null;
    /** Nome do frentista selecionado para exibição */
    userName: string;
    /** Nome do posto ativo */
    postoNome: string;
    /** Função callback chamada ao pressionar para selecionar frentista */
    onPressSelect: () => void;
}

/**
 * Componente de cabeçalho que exibe o frentista atual e o posto.
 * Permite abrir o modal de seleção de frentista.
 *
 * @param {HeaderCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} O componente renderizado.
 */
export function HeaderCard({ frentistaId, userName, postoNome, onPressSelect }: HeaderCardProps) {
    return (
        <View
            className="mx-4 mt-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}
        >
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center">
                        <User size={24} color="#b91c1c" />
                    </View>
                    <View>
                        {/* Dropdown SEMPRE ativo - Modo Plataforma Universal */}
                        <TouchableOpacity
                            onPress={onPressSelect}
                            className="flex-row items-center gap-1"
                            activeOpacity={0.7}
                        >
                            <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                {frentistaId ? `Olá, ${userName}!` : 'Selecionar Frentista'}
                            </Text>
                            <ChevronDown size={16} color="#4b5563" />
                        </TouchableOpacity>
                        <Text className="text-sm text-gray-500">{postoNome || 'Posto Providência'}</Text>
                    </View>
                </View>
                {/* Badge de Modo Diário (apenas informativo, não clicável) */}
                <View className="bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                    <Text className="text-gray-600 dark:text-gray-400 font-bold text-xs">Diário</Text>
                </View>
            </View>
        </View>
    );
}
