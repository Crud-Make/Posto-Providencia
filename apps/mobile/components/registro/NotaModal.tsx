import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { X, Search, Check, Ban, Plus } from 'lucide-react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import type { Cliente } from '../../services/cliente';
import { formatCurrencyInput, parseValue } from '../../lib/utils';

/**
 * Props para o componente NotaModal.
 */
interface NotaModalProps {
    /** Controla a visibilidade do modal */
    visible: boolean;
    /** Função para fechar o modal */
    onClose: () => void;
    /** Lista completa de clientes disponíveis */
    clientes: Cliente[];
    /** Cliente atualmente selecionado */
    selectedCliente: Cliente | null;
    /** Função para atualizar o cliente selecionado */
    setSelectedCliente: (c: Cliente | null) => void;
    /** Valor temporário da nota sendo criada (string formatada) */
    valorNotaTemp: string;
    /** Função para atualizar o valor temporário */
    setValorNotaTemp: (v: string) => void;
    /** Termo de busca para filtrar clientes */
    buscaCliente: string;
    /** Função para atualizar o termo de busca */
    setBuscaCliente: (v: string) => void;
    /** Função chamada ao confirmar a adição da nota */
    onAddNota: () => void;
    /** Insets de área segura (para espaçamento inferior) */
    insets: EdgeInsets;
}

/**
 * Modal para adicionar uma nova nota/vale a um cliente.
 * Permite buscar clientes, selecionar um e informar o valor.
 *
 * @param {NotaModalProps} props - Propriedades do componente.
 * @returns {JSX.Element} O componente renderizado.
 */
export function NotaModal({
    visible,
    onClose,
    clientes,
    selectedCliente,
    setSelectedCliente,
    valorNotaTemp,
    setValorNotaTemp,
    buscaCliente,
    setBuscaCliente,
    onAddNota,
    insets
}: NotaModalProps) {
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
                <View className="bg-white rounded-t-[40px] p-6 shadow-2xl">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-black text-gray-800">Nova Nota / Vale</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-gray-100 p-2 rounded-full"
                        >
                            <X size={20} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest">Cliente</Text>

                    {/* Campo de Busca de Cliente */}
                    <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 mb-4">
                        <Search size={20} color="#9ca3af" style={{ marginRight: 8 }} />
                        <TextInput
                            className="flex-1 text-base text-gray-800"
                            placeholder="Buscar cliente..."
                            placeholderTextColor="#9ca3af"
                            value={buscaCliente}
                            onChangeText={setBuscaCliente}
                            autoCapitalize="words"
                        />
                        {buscaCliente.length > 0 && (
                            <TouchableOpacity onPress={() => setBuscaCliente('')}>
                                <X size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View className="mb-6 h-64">
                        {clientes.length === 0 ? (
                            <View className="p-4 bg-gray-50 rounded-2xl items-center border border-gray-100">
                                <Text className="text-gray-400 italic">Nenhum cliente cadastrado no sistema</Text>
                            </View>
                        ) : buscaCliente.length === 0 ? (
                            <View className="flex-1 items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-4">
                                <Search size={32} color="#9ca3af" style={{ opacity: 0.5, marginBottom: 8 }} />
                                <Text className="text-gray-400 text-center font-medium">Digite o nome para buscar...</Text>
                            </View>
                        ) : (
                            <ScrollView
                                nestedScrollEnabled={true}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={true}
                                className="border border-gray-100 rounded-2xl bg-gray-50/50"
                            >
                                <View className="p-2">
                                    {clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase())).length === 0 ? (
                                        <View className="p-4 items-center">
                                            <Text className="text-gray-400">Nenhum cliente encontrado</Text>
                                        </View>
                                    ) : (
                                        clientes
                                            .filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()))
                                            .map((cliente) => (
                                                <TouchableOpacity
                                                    key={cliente.id}
                                                    onPress={() => {
                                                        setSelectedCliente(cliente);
                                                        setBuscaCliente('');
                                                    }}
                                                    className={`px-4 py-3 rounded-xl border-2 mb-2 w-full flex-row justify-between items-center ${cliente.bloqueado ? 'bg-gray-200 border-gray-300 opacity-70' : selectedCliente?.id === cliente.id ? 'bg-cyan-600 border-cyan-600' : 'bg-white border-gray-200'}`}
                                                >
                                                    <View className="flex-1">
                                                        <View className="flex-row items-center gap-2">
                                                            <Text className={`font-bold text-base ${cliente.bloqueado ? 'text-gray-500' : selectedCliente?.id === cliente.id ? 'text-white' : 'text-gray-800'}`}>
                                                                {cliente.nome}
                                                            </Text>
                                                            {cliente.bloqueado && (
                                                                <View className="bg-red-500 px-2 py-0.5 rounded">
                                                                    <Text className="text-white text-[10px] font-bold">BLOQUEADO</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        {cliente.documento && (
                                                            <Text className={`text-xs mt-0.5 ${cliente.bloqueado ? 'text-gray-400' : selectedCliente?.id === cliente.id ? 'text-cyan-100' : 'text-gray-400'}`}>
                                                                {cliente.documento}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    {cliente.bloqueado ? (
                                                        <Ban size={20} color="#ef4444" />
                                                    ) : selectedCliente?.id === cliente.id ? (
                                                        <Check size={20} color="white" />
                                                    ) : null}
                                                </TouchableOpacity>
                                            ))
                                    )}
                                </View>
                            </ScrollView>
                        )}
                    </View>

                    <Text className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest">Valor da Nota</Text>
                    <View className="flex-row items-center bg-gray-50 rounded-3xl p-4 border-2 border-cyan-100 mb-8">
                        <Text className="text-2xl font-bold text-cyan-600 mr-2">R$</Text>
                        <TextInput
                            className="flex-1 text-3xl font-black text-gray-800"
                            placeholder="0,00"
                            value={valorNotaTemp}
                            onChangeText={(text) => setValorNotaTemp(formatCurrencyInput(text))}
                            keyboardType="numeric"
                        />
                    </View>

                    <TouchableOpacity
                        onPress={onAddNota}
                        className={`py-4 rounded-3xl flex-row justify-center items-center shadow-lg ${!selectedCliente || parseValue(valorNotaTemp) === 0 ? 'bg-gray-300' : 'bg-cyan-600 shadow-cyan-200'}`}
                        disabled={!selectedCliente || parseValue(valorNotaTemp) === 0}
                    >
                        <Plus size={24} color="white" style={{ marginRight: 8 }} />
                        <Text className="text-white text-lg font-black">Adicionar Nota</Text>
                    </TouchableOpacity>
                    <View style={{ height: insets.bottom + 20 }} />
                </View>
            </View>
        </Modal>
    );
}
