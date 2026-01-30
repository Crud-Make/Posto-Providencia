import { View, Text, Modal, TouchableOpacity, FlatList } from 'react-native';
import { X, Check } from 'lucide-react-native';
import type { Frentista } from '../../services/frentista';

/**
 * Props para o componente FrentistaModal.
 */
interface FrentistaModalProps {
    /** Controla a visibilidade do modal */
    visible: boolean;
    /** Função para fechar o modal */
    onClose: () => void;
    /** Lista de frentistas disponíveis */
    frentistas: Frentista[];
    /** ID do frentista atualmente selecionado */
    frentistaId: number | null;
    /** Lista de IDs de frentistas que já fecharam o turno hoje */
    frentistasQueFecharam: number[];
    /** Função chamada ao selecionar um frentista */
    onSelect: (id: number, nome: string) => void;
}

/**
 * Modal para seleção do frentista responsável pelo registro.
 * Exibe lista de frentistas e status de fechamento (se já fechou hoje).
 *
 * @param {FrentistaModalProps} props - Propriedades do componente.
 * @returns {JSX.Element} O componente renderizado.
 */
export function FrentistaModal({
    visible,
    onClose,
    frentistas,
    frentistaId,
    frentistasQueFecharam,
    onSelect
}: FrentistaModalProps) {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60 justify-end">
                <TouchableOpacity
                    className="absolute inset-0"
                    onPress={onClose}
                />
                <View className="bg-white rounded-t-[32px] shadow-2xl" style={{ maxHeight: '60%' }}>
                    {/* Header */}
                    <View className="bg-primary-700 p-5 rounded-t-[32px] flex-row justify-between items-center">
                        <View>
                            <Text className="text-white font-bold text-xl">Quem está trabalhando?</Text>
                            <Text className="text-primary-200 text-sm mt-0.5">{frentistas.length} frentistas ativos</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-white/20 p-2 rounded-full"
                        >
                            <X size={22} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Lista de Frentistas */}
                    <FlatList
                        data={frentistas}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ paddingVertical: 8 }}
                        renderItem={({ item }) => {
                            const isSelected = item.id === frentistaId;
                            const jaFechou = frentistasQueFecharam.includes(item.id);
                            const inicial = item.nome.charAt(0).toUpperCase();
                            return (
                                <TouchableOpacity
                                    className={`mx-4 my-1.5 p-4 rounded-2xl flex-row justify-between items-center ${isSelected ? 'bg-primary-50 border-2 border-primary-200' : 'bg-gray-50'}`}
                                    onPress={() => onSelect(item.id, item.nome)}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center gap-4">
                                        {/* Avatar com Inicial */}
                                        <View className={`w-12 h-12 rounded-full items-center justify-center ${isSelected ? 'bg-primary-700' : 'bg-gray-300'}`}>
                                            <Text className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                                                {inicial}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text className={`text-base font-bold ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                                                {item.nome}
                                            </Text>
                                            <Text className="text-gray-400 text-xs">
                                                {jaFechou ? 'Já fechou o turno' : 'Toque para selecionar'}
                                            </Text>
                                        </View>
                                    </View>
                                    {isSelected && (
                                        <View className="bg-primary-700 w-7 h-7 rounded-full items-center justify-center">
                                            <Check size={16} color="white" strokeWidth={3} />
                                        </View>
                                    )}
                                    {!isSelected && jaFechou && (
                                        <View className="bg-green-500 w-7 h-7 rounded-full items-center justify-center">
                                            <Check size={16} color="white" strokeWidth={3} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </View>
        </Modal>
    );
}
