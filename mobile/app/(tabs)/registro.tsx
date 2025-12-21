import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
    User
} from 'lucide-react-native';

// Tipos
interface FormaPagamento {
    id: string;
    label: string;
    icon: any;
    color: string;
    bgColor: string;
}

interface RegistroTurno {
    valorCartao: string;
    valorNota: string;
    valorPix: string;
    valorDinheiro: string;
    faltaCaixa: string;
    observacoes: string;
}

const FORMAS_PAGAMENTO: FormaPagamento[] = [
    { id: 'cartao', label: 'Cartão', icon: CreditCard, color: '#7c3aed', bgColor: '#f5f3ff' },
    { id: 'nota', label: 'Nota/Vale', icon: Receipt, color: '#0891b2', bgColor: '#ecfeff' },
    { id: 'pix', label: 'PIX', icon: Smartphone, color: '#059669', bgColor: '#ecfdf5' },
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: '#16a34a', bgColor: '#f0fdf4' },
];

export default function RegistroScreen() {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [userName, setUserName] = useState('Frentista');
    const [turnoAtual, setTurnoAtual] = useState('Manhã');

    const [registro, setRegistro] = useState<RegistroTurno>({
        valorCartao: '',
        valorNota: '',
        valorPix: '',
        valorDinheiro: '',
        faltaCaixa: '',
        observacoes: '',
    });

    // Calcular totais
    const parseValue = (value: string): number => {
        const parsed = parseFloat(value.replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    };

    const totalInformado =
        parseValue(registro.valorCartao) +
        parseValue(registro.valorNota) +
        parseValue(registro.valorPix) +
        parseValue(registro.valorDinheiro);

    const faltaCaixaValue = parseValue(registro.faltaCaixa);

    const totalFinal = totalInformado - faltaCaixaValue;

    const temFalta = faltaCaixaValue > 0;

    // Buscar dados do usuário
    useEffect(() => {
        async function fetchUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                // Pegar nome do email antes do @
                const name = user.email.split('@')[0];
                setUserName(name.charAt(0).toUpperCase() + name.slice(1));
            }
        }
        fetchUser();
    }, []);

    // Determinar turno atual baseado na hora
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 14) {
            setTurnoAtual('Manhã');
        } else if (hour >= 14 && hour < 22) {
            setTurnoAtual('Tarde');
        } else {
            setTurnoAtual('Noite');
        }
    }, []);

    const handleChange = (field: keyof RegistroTurno, value: string) => {
        // Permite apenas números, vírgula e ponto
        const cleanValue = value.replace(/[^0-9.,]/g, '');
        setRegistro(prev => ({ ...prev, [field]: cleanValue }));
    };

    const formatCurrency = (value: number): string => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    const handleSubmit = async () => {
        if (totalInformado === 0) {
            Alert.alert('Atenção', 'Preencha pelo menos um valor de pagamento');
            return;
        }

        if (temFalta && !registro.observacoes.trim()) {
            Alert.alert('Atenção', 'Quando há falta de caixa, é obrigatório informar uma observação');
            return;
        }

        Alert.alert(
            'Confirmar Envio',
            `Deseja enviar o registro do turno?\n\nTotal Informado: ${formatCurrency(totalInformado)}\n${temFalta ? `Falta de Caixa: ${formatCurrency(faltaCaixaValue)}\nTotal Final: ${formatCurrency(totalFinal)}` : ''}`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();

                            // Aqui você integraria com o Supabase
                            // Por enquanto, simula o envio
                            await new Promise(resolve => setTimeout(resolve, 1500));

                            Alert.alert(
                                '✅ Enviado!',
                                'Seu registro foi enviado com sucesso.',
                                [{
                                    text: 'OK',
                                    onPress: () => {
                                        // Limpar formulário
                                        setRegistro({
                                            valorCartao: '',
                                            valorNota: '',
                                            valorPix: '',
                                            valorDinheiro: '',
                                            faltaCaixa: '',
                                            observacoes: '',
                                        });
                                    }
                                }]
                            );
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível enviar o registro. Tente novamente.');
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
                contentContainerStyle={{ paddingBottom: 100 }}
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
                                <Text className="text-sm text-gray-500">Registre seu turno</Text>
                            </View>
                        </View>
                        <View className="bg-primary-50 px-4 py-2 rounded-full flex-row items-center gap-2">
                            <Clock size={16} color="#b91c1c" />
                            <Text className="text-primary-700 font-bold text-sm">{turnoAtual}</Text>
                        </View>
                    </View>
                </View>

                {/* Seção de Valores */}
                <View className="px-4 mt-6">
                    <Text className="text-lg font-bold text-gray-800 mb-1">💰 Valores Recebidos</Text>
                    <Text className="text-sm text-gray-500 mb-4">Informe os valores por forma de pagamento</Text>

                    {renderInputField(FORMAS_PAGAMENTO[0], registro.valorCartao, 'valorCartao')}
                    {renderInputField(FORMAS_PAGAMENTO[1], registro.valorNota, 'valorNota')}
                    {renderInputField(FORMAS_PAGAMENTO[2], registro.valorPix, 'valorPix')}
                    {renderInputField(FORMAS_PAGAMENTO[3], registro.valorDinheiro, 'valorDinheiro')}
                </View>

                {/* Seção de Falta de Caixa */}
                <View className="px-4 mt-6">
                    <Text className="text-lg font-bold text-gray-800 mb-1">⚠️ Falta de Caixa</Text>
                    <Text className="text-sm text-gray-500 mb-4">Informe se houver diferença no caixa</Text>

                    <View
                        className={`flex-row items-center bg-white rounded-2xl border-2 overflow-hidden ${temFalta ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
                        style={{ shadowColor: temFalta ? '#ef4444' : '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: temFalta ? 0.15 : 0.05, shadowRadius: 8, elevation: 2 }}
                    >
                        <View
                            className={`p-4 items-center justify-center ${temFalta ? 'bg-red-100' : 'bg-orange-50'}`}
                        >
                            <AlertTriangle size={24} color={temFalta ? '#dc2626' : '#f59e0b'} />
                        </View>
                        <View className="flex-1 px-4">
                            <Text className={`text-xs font-medium ${temFalta ? 'text-red-500' : 'text-gray-400'}`}>
                                Valor da Falta
                            </Text>
                            <View className="flex-row items-center">
                                <Text className={`text-lg font-medium mr-1 ${temFalta ? 'text-red-500' : 'text-gray-500'}`}>R$</Text>
                                <TextInput
                                    className={`flex-1 text-xl font-bold py-2 ${temFalta ? 'text-red-600' : 'text-gray-800'}`}
                                    placeholder="0,00"
                                    placeholderTextColor="#d1d5db"
                                    value={registro.faltaCaixa}
                                    onChangeText={(text) => handleChange('faltaCaixa', text)}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>
                    </View>

                    {temFalta && (
                        <View className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200 flex-row items-start gap-2">
                            <AlertTriangle size={16} color="#dc2626" />
                            <Text className="flex-1 text-red-700 text-xs font-medium">
                                Quando há falta de caixa, é obrigatório informar o motivo nas observações abaixo.
                            </Text>
                        </View>
                    )}
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
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-gray-500">Total Informado</Text>
                                <Text className="text-lg font-bold text-gray-800">{formatCurrency(totalInformado)}</Text>
                            </View>

                            {temFalta && (
                                <View className="flex-row justify-between items-center mb-3 py-2 px-3 bg-red-50 rounded-lg -mx-1">
                                    <Text className="text-red-600 font-medium">Falta de Caixa</Text>
                                    <Text className="text-lg font-bold text-red-600">- {formatCurrency(faltaCaixaValue)}</Text>
                                </View>
                            )}

                            <View className="border-t border-dashed border-gray-200 pt-3 mt-2">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-gray-700 font-bold">Total Final</Text>
                                    <Text className={`text-2xl font-black ${temFalta ? 'text-red-600' : 'text-primary-700'}`}>
                                        {formatCurrency(totalFinal)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Botão Enviar */}
                <View className="px-4 mt-8 mb-4">
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
        </KeyboardAvoidingView>
    );
}
