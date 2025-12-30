import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { submitMobileClosing, turnoService, frentistaService, clienteService, type SubmitClosingData, type Cliente, type Turno } from '../../lib/api';
import { usePosto } from '../../lib/PostoContext';
import {
    CreditCard,
    Receipt,
    Smartphone,
    Banknote,
    AlertTriangle,
    Check,
    Send,
    Calculator,
    CircleDollarSign,
    ChevronDown,
    Clock,
    User,
    Gauge,
    Plus,
    Trash2,
    X,
    Search
} from 'lucide-react-native';

// Tipos
interface FormaPagamento {
    id: string;
    label: string;
    icon: any;
    color: string;
    bgColor: string;
}

interface NotaItem {
    cliente_id: number;
    cliente_nome: string;
    valor: string; // formato exibição
    valor_number: number;
}

interface RegistroTurno {
    valorEncerrante: string;
    valorCartaoDebito: string;
    valorCartaoCredito: string;
    valorPix: string;
    valorDinheiro: string;
    observacoes: string;
}

const FORMAS_PAGAMENTO: FormaPagamento[] = [
    { id: 'cartao', label: 'Cartão', icon: CreditCard, color: '#7c3aed', bgColor: '#f5f3ff' },
    { id: 'nota', label: 'Nota/Vale', icon: Receipt, color: '#0891b2', bgColor: '#ecfeff' },
    { id: 'pix', label: 'PIX', icon: Smartphone, color: '#059669', bgColor: '#ecfdf5' },
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: '#16a34a', bgColor: '#f0fdf4' },
];

export default function RegistroScreen() {
    const insets = useSafeAreaInsets();
    const { postoAtivo, postoAtivoId } = usePosto();

    // Estados principais
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userName, setUserName] = useState('Frentista');
    const [turnoAtual, setTurnoAtual] = useState('Carregando...');
    const [turnoId, setTurnoId] = useState<number | null>(null);

    const [registro, setRegistro] = useState<RegistroTurno>({
        valorEncerrante: '',
        valorCartaoDebito: '',
        valorCartaoCredito: '',
        valorPix: '',
        valorDinheiro: '',
        observacoes: '',
    });

    const [notasAdicionadas, setNotasAdicionadas] = useState<NotaItem[]>([]);
    const [modalNotaVisible, setModalNotaVisible] = useState(false);
    const [modalTurnoVisible, setModalTurnoVisible] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [valorNotaTemp, setValorNotaTemp] = useState('');
    const [buscaCliente, setBuscaCliente] = useState(''); // Novo estado para busca

    // Formatação de Moeda
    const formatCurrency = (value: number): string => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    const parseValue = (value: string): number => {
        if (!value) return 0;
        const cleanStr = value.replace(/[^\d,]/g, '').replace(',', '.');
        const parsed = parseFloat(cleanStr);
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatCurrencyInput = (value: string) => {
        const onlyNumbers = value.replace(/\D/g, '');
        if (onlyNumbers === '') return '';
        const amount = parseInt(onlyNumbers) / 100;
        return amount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const handleChange = (field: keyof RegistroTurno, value: string) => {
        if (field === 'observacoes') {
            setRegistro(prev => ({ ...prev, [field]: value }));
            return;
        }
        const formatted = formatCurrencyInput(value);
        setRegistro(prev => ({ ...prev, [field]: formatted }));
    };

    // Cálculos
    const valorEncerrante = parseValue(registro.valorEncerrante);
    const totalCartao = parseValue(registro.valorCartaoDebito) + parseValue(registro.valorCartaoCredito);
    const totalNotas = notasAdicionadas.reduce((acc, current) => acc + current.valor_number, 0);
    const totalInformado = totalCartao + totalNotas + parseValue(registro.valorPix) + parseValue(registro.valorDinheiro);
    const diferencaCaixa = valorEncerrante - totalInformado;
    const temFalta = diferencaCaixa > 0;
    const temSobra = diferencaCaixa < 0;
    const caixaBateu = diferencaCaixa === 0 && valorEncerrante > 0;

    // Carregar dados (User, Turnos, Clientes)
    useEffect(() => {
        async function loadAllData() {
            if (!postoAtivoId) return;

            setLoading(true);
            try {
                // 1. Dados do Usuário
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const frentistaData = await frentistaService.getByUserId(user.id);
                    if (frentistaData?.nome) {
                        setUserName(frentistaData.nome);
                    } else if (user.email) {
                        const name = user.email.split('@')[0];
                        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
                    }
                }

                // 2. Turnos e Clientes em paralelo
                const [turnosData, clientesData, turnoAuto] = await Promise.all([
                    turnoService.getAll(postoAtivoId),
                    clienteService.getAll(postoAtivoId),
                    turnoService.getCurrentTurno(postoAtivoId)
                ]);

                setTurnos(turnosData);
                setClientes(clientesData);

                if (turnoAuto) {
                    setTurnoAtual(turnoAuto.nome);
                    setTurnoId(turnoAuto.id);
                } else if (turnosData.length > 0) {
                    setTurnoAtual(turnosData[0].nome);
                    setTurnoId(turnosData[0].id);
                } else {
                    setTurnoAtual('Selecione');
                }
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
            } finally {
                setLoading(false);
            }
        }

        loadAllData();

        // Realtime para Turnos
        const subscription = supabase
            .channel('turnos_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Turno' }, () => loadAllData())
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [postoAtivoId]);

    const handleAddNota = () => {
        if (!selectedCliente || !valorNotaTemp) {
            Alert.alert('Atenção', 'Selecione um cliente e informe o valor');
            return;
        }

        const valorNumber = parseValue(valorNotaTemp);
        if (valorNumber <= 0) {
            Alert.alert('Atenção', 'O valor deve ser maior que zero');
            return;
        }

        const novaNota: NotaItem = {
            cliente_id: selectedCliente.id,
            cliente_nome: selectedCliente.nome,
            valor: valorNotaTemp,
            valor_number: valorNumber
        };

        setNotasAdicionadas(prev => [...prev, novaNota]);
        setModalNotaVisible(false);
        setSelectedCliente(null);
        setValorNotaTemp('');
    };

    const handleRemoveNota = (index: number) => {
        setNotasAdicionadas(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (valorEncerrante === 0) {
            Alert.alert('Atenção', 'Informe o valor do encerrante');
            return;
        }

        if (totalInformado === 0) {
            Alert.alert('Atenção', 'Preencha pelo menos um valor de pagamento');
            return;
        }

        if (temFalta && !registro.observacoes.trim()) {
            Alert.alert('Atenção', 'Quando há falta de caixa, é obrigatório informar uma observação');
            return;
        }

        if (!turnoId) {
            Alert.alert('Erro', 'Não foi possível identificar o turno. Tente novamente mais tarde.');
            return;
        }

        // Montar mensagem de confirmação
        let mensagemConfirmacao = `Encerrante: ${formatCurrency(valorEncerrante)}\nTotal Pagamentos: ${formatCurrency(totalInformado)}`;

        if (caixaBateu) {
            mensagemConfirmacao += '\n\n✅ Caixa bateu!';
        } else if (temFalta) {
            mensagemConfirmacao += `\n\n❌ Falta: ${formatCurrency(diferencaCaixa)}`;
        } else if (temSobra) {
            mensagemConfirmacao += `\n\n⚠️ Sobra: ${formatCurrency(Math.abs(diferencaCaixa))}`;
        }

        Alert.alert(
            'Confirmar Envio',
            mensagemConfirmacao,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            // Preparar dados para envio
                            const closingData: SubmitClosingData = {
                                data: new Date().toISOString().split('T')[0],
                                turno_id: turnoId!,
                                valor_cartao_debito: parseValue(registro.valorCartaoDebito),
                                valor_cartao_credito: parseValue(registro.valorCartaoCredito),
                                valor_nota: totalNotas,
                                valor_pix: parseValue(registro.valorPix),
                                valor_dinheiro: parseValue(registro.valorDinheiro),
                                valor_encerrante: valorEncerrante,
                                falta_caixa: temFalta ? diferencaCaixa : 0,
                                observacoes: registro.observacoes,
                                posto_id: postoAtivoId!,
                                notas: notasAdicionadas.map(n => ({
                                    cliente_id: n.cliente_id,
                                    valor: n.valor_number
                                }))
                            };

                            // Enviar para o Supabase
                            const result = await submitMobileClosing(closingData);

                            if (result.success) {
                                Alert.alert(
                                    '✅ Enviado!',
                                    result.message,
                                    [{
                                        text: 'OK',
                                        onPress: () => {
                                            // Limpar formulário
                                            setRegistro({
                                                valorEncerrante: '',
                                                valorCartaoDebito: '',
                                                valorCartaoCredito: '',
                                                valorPix: '',
                                                valorDinheiro: '',
                                                observacoes: '',
                                            });
                                            setNotasAdicionadas([]);
                                        }
                                    }]
                                );
                            } else {
                                Alert.alert('❌ Erro', result.message);
                            }
                        } catch (error) {
                            console.error('Error submitting closing:', error);
                            Alert.alert(
                                'Erro',
                                'Não foi possível enviar o registro. Verifique sua conexão e tente novamente.'
                            );
                        } finally {
                            setSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    const renderInputField = (
        forma: FormaPagamento,
        value: string,
        field: keyof RegistroTurno
    ) => {
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
                                onChangeText={(text) => handleChange(field, text)}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-gray-50"
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: insets.bottom + 180 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Card */}
                <View
                    className="mx-4 mt-4 p-5 bg-white rounded-3xl border border-gray-100"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                            <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center">
                                <User size={24} color="#b91c1c" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-gray-800">Olá, {userName}!</Text>
                                <Text className="text-sm text-gray-500">{postoAtivo?.nome || 'Registre seu turno'}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            className="bg-primary-50 px-4 py-2 rounded-full flex-row items-center gap-2 border border-primary-100"
                            onPress={() => setModalTurnoVisible(true)}
                        >
                            <Clock size={16} color="#b91c1c" />
                            <Text className="text-primary-700 font-bold text-sm">{turnoAtual}</Text>
                            <ChevronDown size={14} color="#b91c1c" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Modal de Seleção de Turno */}
                <Modal
                    visible={modalTurnoVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setModalTurnoVisible(false)}
                >
                    <View className="flex-1 bg-black/50 justify-center items-center p-5">
                        <View className="bg-white w-full rounded-2xl overflow-hidden shadow-xl" style={{ maxHeight: '50%' }}>
                            <View className="bg-primary-700 p-4 flex-row justify-between items-center">
                                <Text className="text-white font-bold text-lg">Selecione o Turno</Text>
                                <TouchableOpacity onPress={() => setModalTurnoVisible(false)}>
                                    <Text className="text-white font-medium">Fechar</Text>
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={turnos}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        className={`p-4 border-b border-gray-100 flex-row justify-between items-center ${item.id === turnoId ? 'bg-primary-50' : 'bg-white'}`}
                                        onPress={async () => {
                                            setTurnoId(item.id);
                                            setTurnoAtual(item.nome);
                                            setModalTurnoVisible(false);

                                            // Sincroniza turno imediatamente com o banco
                                            if (postoAtivoId) {
                                                const { data: { user } } = await supabase.auth.getUser();
                                                if (user) {
                                                    const frentista = await frentistaService.getByUserId(user.id);
                                                    if (frentista) {
                                                        await frentistaService.update(frentista.id, { turno_id: item.id });
                                                    }
                                                }
                                            }
                                        }}
                                    >
                                        <View>
                                            <Text className={`font-bold ${item.id === turnoId ? 'text-primary-700' : 'text-gray-800'}`}>
                                                {item.nome}
                                            </Text>
                                            <Text className="text-gray-500 text-xs mt-1">
                                                {item.horario_inicio} - {item.horario_fim}
                                            </Text>
                                        </View>
                                        {item.id === turnoId && <Check size={20} color="#b91c1c" />}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Seção do Encerrante (MOVIDO PARA O TOPO) */}
                <View className="px-4 mt-6">
                    <Text className="text-lg font-bold text-gray-800 mb-1">📊 Encerrante</Text>
                    <Text className="text-sm text-gray-500 mb-4">Valor total vendido (leitura da bomba)</Text>

                    <View
                        className="flex-row items-center bg-white rounded-2xl border-2 border-purple-200 overflow-hidden"
                        style={{ shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
                    >
                        <View className="p-4 items-center justify-center bg-purple-50">
                            <Gauge size={24} color="#7c3aed" />
                        </View>
                        <View className="flex-1 px-4">
                            <Text className="text-xs font-medium text-purple-600">
                                Valor do Encerrante
                            </Text>
                            <View className="flex-row items-center">
                                <Text className="text-lg font-medium mr-1 text-purple-600">R$</Text>
                                <TextInput
                                    className="flex-1 text-xl font-bold py-2 text-purple-700"
                                    placeholder="0,00"
                                    placeholderTextColor="#c4b5fd"
                                    value={registro.valorEncerrante}
                                    onChangeText={(text) => handleChange('valorEncerrante', text)}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Seção de Valores */}
                <View className="px-4 mt-6">
                    <Text className="text-lg font-bold text-gray-800 mb-1">💰 Valores Recebidos</Text>
                    <Text className="text-sm text-gray-500 mb-4">Informe os valores por forma de pagamento</Text>

                    {/* Campos de Cartão - Débito e Crédito */}
                    {renderInputField({ ...FORMAS_PAGAMENTO[0], label: 'Cartão Débito' }, registro.valorCartaoDebito, 'valorCartaoDebito')}
                    {renderInputField({ ...FORMAS_PAGAMENTO[0], label: 'Cartão Crédito' }, registro.valorCartaoCredito, 'valorCartaoCredito')}

                    {/* Seção de Notas/Vales */}
                    <View className="mb-4">
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center gap-2">
                                <Receipt size={20} color="#0891b2" />
                                <Text className="font-bold text-gray-700">Notas / Vales</Text>
                            </View>
                            <TouchableOpacity
                                className="bg-cyan-50 px-3 py-1.5 rounded-full flex-row items-center gap-1 border border-cyan-100"
                                onPress={() => setModalNotaVisible(true)}
                            >
                                <Plus size={14} color="#0891b2" />
                                <Text className="text-cyan-700 font-bold text-xs">Adicionar</Text>
                            </TouchableOpacity>
                        </View>

                        {notasAdicionadas.length === 0 ? (
                            <View className="bg-white rounded-2xl p-6 border-2 border-gray-50 border-dashed items-center justify-center">
                                <Receipt size={32} color="#e5e7eb" style={{ marginBottom: 8 }} />
                                <Text className="text-gray-400 text-sm italic text-center">Nenhuma nota adicionada para este turno</Text>
                            </View>
                        ) : (
                            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }}>
                                {notasAdicionadas.map((item, index) => (
                                    <View key={index} className={`flex-row items-center justify-between p-4 ${index !== notasAdicionadas.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                        <View className="flex-1 pr-2">
                                            <Text className="text-gray-800 font-bold" numberOfLines={1}>{item.cliente_nome}</Text>
                                        </View>
                                        <View className="flex-row items-center gap-4">
                                            <Text className="font-black text-cyan-700 text-base">{formatCurrency(item.valor_number)}</Text>
                                            <TouchableOpacity onPress={() => handleRemoveNota(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                <Trash2 size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                                <View className="bg-cyan-600 p-3 flex-row justify-between items-center">
                                    <Text className="text-white font-bold text-xs uppercase tracking-wider">Total em Notas</Text>
                                    <View className="bg-white/20 px-3 py-1 rounded-lg">
                                        <Text className="text-white font-black text-base">{formatCurrency(totalNotas)}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {renderInputField(FORMAS_PAGAMENTO[2], registro.valorPix, 'valorPix')}
                    {renderInputField(FORMAS_PAGAMENTO[3], registro.valorDinheiro, 'valorDinheiro')}
                </View>



                {/* Seção de Observações */}
                <View className="px-4 mt-6">
                    <Text className="text-lg font-bold text-gray-800 mb-1">📝 Observações</Text>
                    <Text className="text-sm text-gray-500 mb-4">
                        {temFalta ? 'Obrigatório - Explique a falta' : 'Opcional - Informações adicionais'}
                    </Text>

                    <View
                        className={`bg-white rounded-2xl border-2 overflow-hidden ${temFalta && !registro.observacoes ? 'border-red-300' : 'border-gray-100'}`}
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                    >
                        <TextInput
                            className="p-4 text-base text-gray-800 min-h-[100px]"
                            placeholder={temFalta ? 'Explique o motivo da falta de caixa...' : 'Observações do turno...'}
                            placeholderTextColor="#9ca3af"
                            value={registro.observacoes}
                            onChangeText={(text) => setRegistro(prev => ({ ...prev, observacoes: text }))}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>
                </View>

                {/* Card de Resumo */}
                <View className="px-4 mt-6">
                    <View
                        className="bg-white rounded-3xl border border-gray-100 overflow-hidden"
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}
                    >
                        <View className="bg-gray-50 px-5 py-4 border-b border-gray-100">
                            <View className="flex-row items-center gap-2">
                                <Calculator size={20} color="#6b7280" />
                                <Text className="text-base font-bold text-gray-700">Resumo do Turno</Text>
                            </View>
                        </View>

                        <View className="p-5">
                            {/* Encerrante */}
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-gray-500">Encerrante</Text>
                                <Text className="text-lg font-bold text-purple-700">{formatCurrency(valorEncerrante)}</Text>
                            </View>

                            {/* Total Pagamentos */}
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-gray-500">Total Pagamentos</Text>
                                <Text className="text-lg font-bold text-gray-800">{formatCurrency(totalInformado)}</Text>
                            </View>

                            {/* Detalhamento de Pagamentos */}
                            <View className="pl-2 border-l-2 border-gray-100 mb-3">
                                {parseValue(registro.valorCartaoDebito) > 0 && (
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className="text-gray-400 text-xs">Cartão Débito</Text>
                                        <Text className="text-xs font-medium text-gray-600">{formatCurrency(parseValue(registro.valorCartaoDebito))}</Text>
                                    </View>
                                )}
                                {parseValue(registro.valorCartaoCredito) > 0 && (
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className="text-gray-400 text-xs">Cartão Crédito</Text>
                                        <Text className="text-xs font-medium text-gray-600">{formatCurrency(parseValue(registro.valorCartaoCredito))}</Text>
                                    </View>
                                )}
                                {totalNotas > 0 && (
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className="text-gray-400 text-xs">Notas/Vales ({notasAdicionadas.length})</Text>
                                        <Text className="text-xs font-medium text-gray-600">{formatCurrency(totalNotas)}</Text>
                                    </View>
                                )}
                                {parseValue(registro.valorPix) > 0 && (
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className="text-gray-400 text-xs">PIX</Text>
                                        <Text className="text-xs font-medium text-gray-600">{formatCurrency(parseValue(registro.valorPix))}</Text>
                                    </View>
                                )}
                                {parseValue(registro.valorDinheiro) > 0 && (
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-gray-400 text-xs">Dinheiro</Text>
                                        <Text className="text-xs font-medium text-gray-600">{formatCurrency(parseValue(registro.valorDinheiro))}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Status da Diferença */}
                            <View className="border-t border-dashed border-gray-200 pt-3 mt-2">
                                {caixaBateu && (
                                    <View className="flex-row justify-between items-center py-2 px-3 bg-green-50 rounded-lg -mx-1">
                                        <View className="flex-row items-center gap-2">
                                            <Check size={18} color="#16a34a" />
                                            <Text className="text-green-700 font-bold">Caixa Bateu!</Text>
                                        </View>
                                        <Text className="text-lg font-black text-green-600">✓</Text>
                                    </View>
                                )}

                                {temFalta && (
                                    <View className="flex-row justify-between items-center py-2 px-3 bg-red-50 rounded-lg -mx-1">
                                        <View className="flex-row items-center gap-2">
                                            <AlertTriangle size={18} color="#dc2626" />
                                            <Text className="text-red-600 font-bold">Falta de Caixa</Text>
                                        </View>
                                        <Text className="text-lg font-black text-red-600">- {formatCurrency(diferencaCaixa)}</Text>
                                    </View>
                                )}

                                {temSobra && (
                                    <View className="flex-row justify-between items-center py-2 px-3 bg-yellow-50 rounded-lg -mx-1">
                                        <View className="flex-row items-center gap-2">
                                            <AlertTriangle size={18} color="#ca8a04" />
                                            <Text className="text-yellow-700 font-bold">Sobra de Caixa</Text>
                                        </View>
                                        <Text className="text-lg font-black text-yellow-600">+ {formatCurrency(Math.abs(diferencaCaixa))}</Text>
                                    </View>
                                )}

                                {valorEncerrante === 0 && (
                                    <View className="flex-row items-center gap-2 py-2">
                                        <Text className="text-gray-400 text-sm">Informe o encerrante para ver o status</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Botão Enviar */}
                <View className="px-4 mt-8" style={{ marginBottom: insets.bottom + 40 }}>
                    <TouchableOpacity
                        className={`w-full py-5 rounded-2xl flex-row items-center justify-center gap-3 ${submitting || totalInformado === 0 ? 'bg-gray-300' : 'bg-primary-700'}`}
                        style={totalInformado > 0 ? { shadowColor: '#b91c1c', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10 } : {}}
                        onPress={handleSubmit}
                        disabled={submitting || totalInformado === 0}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <Send size={22} color="#FFF" />
                                <Text className="text-white font-bold text-lg">Enviar Registro</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Modal de Adicionar Nota */}
            <Modal
                visible={modalNotaVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalNotaVisible(false)}
            >
                <View className="flex-1 bg-black/60 justify-end">
                    <TouchableOpacity
                        className="absolute inset-0"
                        onPress={() => setModalNotaVisible(false)}
                    />
                    <View className="bg-white rounded-t-[40px] p-6 shadow-2xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-black text-gray-800">Nova Nota / Vale</Text>
                            <TouchableOpacity
                                onPress={() => setModalNotaVisible(false)}
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
                                                            setBuscaCliente(''); // Limpa busca pra UX ficar top (ou não, dependendo, mas aqui fecha o modal depois né?)
                                                            // Ah, não, aqui só seleciona. Então talvez manter o texto ajude a confirmar. Mas vou limpar pra ficar clean.
                                                        }}
                                                        className={`px-4 py-3 rounded-xl border-2 mb-2 w-full flex-row justify-between items-center ${selectedCliente?.id === cliente.id ? 'bg-cyan-600 border-cyan-600' : 'bg-white border-gray-200'}`}
                                                    >
                                                        <View className="flex-1">
                                                            <Text className={`font-bold text-base ${selectedCliente?.id === cliente.id ? 'text-white' : 'text-gray-800'}`}>
                                                                {cliente.nome}
                                                            </Text>
                                                            {cliente.documento && (
                                                                <Text className={`text-xs mt-0.5 ${selectedCliente?.id === cliente.id ? 'text-cyan-100' : 'text-gray-400'}`}>
                                                                    {cliente.documento}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        {selectedCliente?.id === cliente.id && <Check size={20} color="white" />}
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
                            onPress={handleAddNota}
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
        </KeyboardAvoidingView >
    );
}
