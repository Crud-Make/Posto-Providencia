import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
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
    User,
    Users,
    Calendar,
    Coffee,
    Sun,
    Moon,
    Sunset,
    ShoppingBag
} from 'lucide-react-native';
import { registerForPushNotificationsAsync, savePushToken } from '../../lib/notifications';

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
    valorEncerrante: string;
    valorBaratao: string;
    faltaCaixa: string;
    observacoes: string;
}

interface Turno {
    id: string;
    nome: string;
    horario: string;
    icon: any;
}

interface FrentistaEscala {
    id: number;
    nome: string;
    status: 'trabalhando' | 'folga';
    turno?: string;
}

const FORMAS_PAGAMENTO: FormaPagamento[] = [
    { id: 'cartao', label: 'Cartão', icon: CreditCard, color: '#7c3aed', bgColor: '#f5f3ff' },
    { id: 'nota', label: 'Nota/Vale', icon: Receipt, color: '#0891b2', bgColor: '#ecfeff' },
    { id: 'pix', label: 'PIX', icon: Smartphone, color: '#059669', bgColor: '#ecfdf5' },
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: '#16a34a', bgColor: '#f0fdf4' },
    { id: 'baratao', label: 'Baratão', icon: ShoppingBag, color: '#e11d48', bgColor: '#fff1f2' },
];

const TURNOS: Turno[] = [
    { id: 'manha', nome: 'Manhã', horario: '06:00 - 14:00', icon: Sun },
    { id: 'tarde', nome: 'Tarde', horario: '14:00 - 22:00', icon: Sunset },
    { id: 'noite', nome: 'Noite', horario: '22:00 - 06:00', icon: Moon },
];

// Mock de escala do dia (será substituído por dados reais do Supabase)
const ESCALA_MOCK: FrentistaEscala[] = [
    { id: 1, nome: 'João Silva', status: 'trabalhando', turno: 'Manhã' },
    { id: 2, nome: 'Maria Santos', status: 'trabalhando', turno: 'Manhã' },
    { id: 3, nome: 'Pedro Oliveira', status: 'folga' },
    { id: 4, nome: 'Ana Costa', status: 'trabalhando', turno: 'Tarde' },
    { id: 5, nome: 'Carlos Lima', status: 'folga' },
];

export default function RegistroScreen() {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [userName, setUserName] = useState('Frentista');
    const [turnoSelecionado, setTurnoSelecionado] = useState<Turno>(TURNOS[0]);
    const [showTurnoModal, setShowTurnoModal] = useState(false);
    const [showEscalaModal, setShowEscalaModal] = useState(false);
    const [escalaHoje, setEscalaHoje] = useState<FrentistaEscala[]>(ESCALA_MOCK);

    const [registro, setRegistro] = useState<RegistroTurno>({
        valorCartao: '',
        valorNota: '',
        valorPix: '',
        valorDinheiro: '',
        valorEncerrante: '',
        valorBaratao: '',
        faltaCaixa: '',
        observacoes: '',
    });

    // Formatar valor para exibição (aceita vírgula e ponto)
    const formatInputValue = (value: string): string => {
        // Remove tudo que não for número, vírgula ou ponto
        let cleanValue = value.replace(/[^0-9.,]/g, '');

        // Substitui ponto por vírgula para padronizar
        cleanValue = cleanValue.replace('.', ',');

        // Garante apenas uma vírgula
        const parts = cleanValue.split(',');
        if (parts.length > 2) {
            cleanValue = parts[0] + ',' + parts.slice(1).join('');
        }

        // Limita a 2 casas decimais
        if (parts.length === 2 && parts[1].length > 2) {
            cleanValue = parts[0] + ',' + parts[1].substring(0, 2);
        }

        return cleanValue;
    };

    // Calcular totais
    const parseValue = (value: string): number => {
        if (!value) return 0;
        // Substitui vírgula por ponto para calcular
        const parsed = parseFloat(value.replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    };

    const totalInformado =
        parseValue(registro.valorCartao) +
        parseValue(registro.valorNota) +
        parseValue(registro.valorPix) +
        parseValue(registro.valorDinheiro) +
        parseValue(registro.valorBaratao);

    const encerranteValue = parseValue(registro.valorEncerrante);

    // Se o encerrante for informado, calcula a falta automaticamente
    // Se o total informado for menor que o encerrante, a diferença é falta de caixa
    const faltaCaixaCalculada = encerranteValue > totalInformado ? encerranteValue - totalInformado : 0;

    // Usa o valor calculado se o encerrante existir, senão usa o manual
    const faltaCaixaValue = encerranteValue > 0 ? faltaCaixaCalculada : parseValue(registro.faltaCaixa);

    const totalFinal = totalInformado; // O frentista entrega o que informou

    const temFalta = faltaCaixaValue > 0;

    // Buscar dados do usuário
    useEffect(() => {
        async function fetchUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                const name = user.email.split('@')[0];
                setUserName(name.charAt(0).toUpperCase() + name.slice(1));

                // Buscar o frentista e o id do usuario na tabela publica
                const [frentistaRes, usuarioRes] = await Promise.all([
                    supabase.from('Frentista').select('id').eq('user_id', user.id).single(),
                    supabase.from('Usuario').select('id').eq('email', user.email).single()
                ]);

                if (frentistaRes.data) {
                    // Tentar registrar notificações push
                    const token = await registerForPushNotificationsAsync();
                    if (token) {
                        await savePushToken(
                            frentistaRes.data.id,
                            usuarioRes.data?.id || 1, // Fallback para admin se não achar
                            token
                        );
                    }
                }
            }
        }
        fetchUser();
    }, []);

    // Determinar turno atual baseado na hora
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 14) {
            setTurnoSelecionado(TURNOS[0]); // Manhã
        } else if (hour >= 14 && hour < 22) {
            setTurnoSelecionado(TURNOS[1]); // Tarde
        } else {
            setTurnoSelecionado(TURNOS[2]); // Noite
        }
    }, []);

    // Buscar escala do dia (substituir por chamada real ao Supabase)
    useEffect(() => {
        async function fetchEscala() {
            try {
                // Aqui você buscaria a escala real do Supabase
                // const { data } = await supabase.from('escalas').select('*').eq('data', hoje);
                // setEscalaHoje(data);
            } catch (error) {
                console.log('Erro ao buscar escala:', error);
            }
        }
        fetchEscala();
    }, []);

    const handleChange = (field: keyof RegistroTurno, value: string) => {
        const formattedValue = formatInputValue(value);
        setRegistro(prev => ({ ...prev, [field]: formattedValue }));
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
            `Deseja enviar o registro do turno ${turnoSelecionado.nome}?\n\nTotal Informado: ${formatCurrency(totalInformado)}${temFalta ? `\nFalta de Caixa: ${formatCurrency(faltaCaixaValue)}\nTotal Final: ${formatCurrency(totalFinal)}` : ''}`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('Usuário não autenticado');

                            // 1. Buscar ID do Frentista e Posto
                            const { data: frentista } = await supabase
                                .from('Frentista')
                                .select('id, posto_id')
                                .eq('user_id', user.id)
                                .single();

                            if (!frentista) throw new Error('Frentista não encontrado');

                            // Buscar ID do Usuario p/ o fechamento (pai)
                            const { data: usuario } = await supabase
                                .from('Usuario')
                                .select('id')
                                .eq('email', user.email)
                                .single();

                            // 2. Buscar ou Criar Fechamento (Pai) para o dia/turno
                            const hoje = new Date().toISOString().split('T')[0];
                            let { data: fechamento } = await supabase
                                .from('Fechamento')
                                .select('id')
                                .eq('data', hoje)
                                .eq('turno_id', turnoSelecionado.id === 'manha' ? 1 : turnoSelecionado.id === 'tarde' ? 2 : 3)
                                .eq('posto_id', frentista.posto_id)
                                .maybeSingle();

                            if (!fechamento) {
                                const { data: newFechamento, error: errorFechamento } = await supabase
                                    .from('Fechamento')
                                    .insert({
                                        data: hoje,
                                        turno_id: turnoSelecionado.id === 'manha' ? 1 : turnoSelecionado.id === 'tarde' ? 2 : 3,
                                        usuario_id: usuario?.id || 1,
                                        status: 'RASCUNHO',
                                        total_vendas: 0,
                                        total_recebido: 0,
                                        diferenca: 0,
                                        posto_id: frentista.posto_id
                                    })
                                    .select('id')
                                    .single();

                                if (errorFechamento) throw errorFechamento;
                                fechamento = newFechamento;
                            }

                            // 3. Enviar FechamentoFrentista
                            const { error: errorFrentista } = await supabase
                                .from('FechamentoFrentista')
                                .insert({
                                    fechamento_id: fechamento.id,
                                    frentista_id: frentista.id,
                                    valor_cartao: parseValue(registro.valorCartao),
                                    valor_nota: parseValue(registro.valorNota),
                                    valor_pix: parseValue(registro.valorPix),
                                    valor_dinheiro: parseValue(registro.valorDinheiro),
                                    baratao: parseValue(registro.valorBaratao),
                                    encerrante: parseValue(registro.valorEncerrante),
                                    diferenca_calculada: faltaCaixaValue,
                                    valor_conferido: totalInformado,
                                    observacoes: registro.observacoes,
                                    posto_id: frentista.posto_id
                                });

                            if (errorFrentista) throw errorFrentista;

                            Alert.alert(
                                '✅ Enviado!',
                                `Registro do turno ${turnoSelecionado.nome} enviado com sucesso.`,
                                [{
                                    text: 'OK',
                                    onPress: () => {
                                        setRegistro({
                                            valorCartao: '',
                                            valorNota: '',
                                            valorPix: '',
                                            valorDinheiro: '',
                                            valorEncerrante: '',
                                            valorBaratao: '',
                                            faltaCaixa: '',
                                            observacoes: '',
                                        });
                                    }
                                }]
                            );
                        } catch (error: any) {
                            console.error(error);
                            Alert.alert('Erro', `Não foi possível enviar o registro: ${error.message}`);
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

    const TurnoIcon = turnoSelecionado.icon;
    const trabalhando = escalaHoje.filter(f => f.status === 'trabalhando');
    const folgas = escalaHoje.filter(f => f.status === 'folga');

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-gray-50"
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header Card com Seleção de Turno */}
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

                        {/* Botão de Seleção de Turno */}
                        <TouchableOpacity
                            className="bg-primary-50 px-4 py-2 rounded-full flex-row items-center gap-2"
                            onPress={() => setShowTurnoModal(true)}
                            activeOpacity={0.7}
                        >
                            <TurnoIcon size={16} color="#b91c1c" />
                            <Text className="text-primary-700 font-bold text-sm">{turnoSelecionado.nome}</Text>
                            <ChevronDown size={14} color="#b91c1c" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Card de Escala do Dia */}
                <TouchableOpacity
                    className="mx-4 mt-4 p-4 bg-white rounded-2xl border border-gray-100 flex-row items-center justify-between"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                    onPress={() => setShowEscalaModal(true)}
                    activeOpacity={0.7}
                >
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                            <Users size={20} color="#3b82f6" />
                        </View>
                        <View>
                            <Text className="text-base font-bold text-gray-800">Escala de Hoje</Text>
                            <Text className="text-xs text-gray-500">
                                {trabalhando.length} trabalhando • {folgas.length} de folga
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <View className="flex-row -space-x-2">
                            {trabalhando.slice(0, 3).map((f, i) => (
                                <View
                                    key={f.id}
                                    className="w-8 h-8 bg-green-100 rounded-full items-center justify-center border-2 border-white"
                                    style={{ marginLeft: i > 0 ? -8 : 0 }}
                                >
                                    <Text className="text-green-700 text-xs font-bold">{f.nome.charAt(0)}</Text>
                                </View>
                            ))}
                        </View>
                        <ChevronDown size={18} color="#9ca3af" />
                    </View>
                </TouchableOpacity>

                {/* Seção de Encerrante */}
                <View className="px-4 mt-6">
                    <Text className="text-lg font-bold text-gray-800 mb-1">⛽ Encerrante Total</Text>
                    <Text className="text-sm text-gray-500 mb-4">Valor total vendido (leitura da bomba)</Text>

                    <View
                        className="flex-row items-center bg-white rounded-2xl border-2 border-primary-100 overflow-hidden"
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
                    >
                        <View className="p-4 items-center justify-center bg-primary-50">
                            <Calculator size={24} color="#b91c1c" />
                        </View>
                        <View className="flex-1 px-4">
                            <Text className="text-xs text-primary-600 font-medium">Valor Vendido (Encerrante)</Text>
                            <View className="flex-row items-center">
                                <Text className="text-primary-700 text-lg font-medium mr-1">R$</Text>
                                <TextInput
                                    className="flex-1 text-xl font-bold text-primary-900 py-2"
                                    placeholder="0,00"
                                    placeholderTextColor="#fca5a5"
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

                    {renderInputField(FORMAS_PAGAMENTO[0], registro.valorCartao, 'valorCartao')}
                    {renderInputField(FORMAS_PAGAMENTO[1], registro.valorNota, 'valorNota')}
                    {renderInputField(FORMAS_PAGAMENTO[2], registro.valorPix, 'valorPix')}
                    {renderInputField(FORMAS_PAGAMENTO[3], registro.valorDinheiro, 'valorDinheiro')}
                    {renderInputField(FORMAS_PAGAMENTO[4], registro.valorBaratao, 'valorBaratao')}
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
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center gap-2">
                                    <Calculator size={20} color="#6b7280" />
                                    <Text className="text-base font-bold text-gray-700">Resumo do Turno</Text>
                                </View>
                                <View className="bg-primary-100 px-3 py-1 rounded-full">
                                    <Text className="text-primary-700 text-xs font-bold">{turnoSelecionado.nome}</Text>
                                </View>
                            </View>
                        </View>

                        <View className="p-5">
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-gray-500">Total Vendido (Encerrante)</Text>
                                <Text className="text-lg font-bold text-primary-700">{formatCurrency(encerranteValue)}</Text>
                            </View>

                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-gray-500">Total Recebido</Text>
                                <Text className="text-lg font-bold text-gray-800">{formatCurrency(totalInformado)}</Text>
                            </View>

                            {faltaCaixaValue > 0 && (
                                <View className="flex-row justify-between items-center mb-3 py-2 px-3 bg-red-50 rounded-lg -mx-1">
                                    <View>
                                        <Text className="text-red-600 font-medium">Falta de Caixa</Text>
                                        {encerranteValue > 0 && <Text className="text-[10px] text-red-400">Calculado automaticamente</Text>}
                                    </View>
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

            {/* Modal de Seleção de Turno */}
            <Modal
                visible={showTurnoModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTurnoModal(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-end"
                    activeOpacity={1}
                    onPress={() => setShowTurnoModal(false)}
                >
                    <View className="bg-white rounded-t-3xl">
                        <View className="p-6 border-b border-gray-100">
                            <View className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                            <Text className="text-xl font-bold text-gray-800 text-center">Selecionar Turno</Text>
                        </View>

                        <View className="p-4">
                            {TURNOS.map((turno) => {
                                const Icon = turno.icon;
                                const isSelected = turnoSelecionado.id === turno.id;
                                return (
                                    <TouchableOpacity
                                        key={turno.id}
                                        className={`flex-row items-center p-4 rounded-2xl mb-3 ${isSelected ? 'bg-primary-50 border-2 border-primary-500' : 'bg-gray-50 border-2 border-transparent'}`}
                                        onPress={() => {
                                            setTurnoSelecionado(turno);
                                            setShowTurnoModal(false);
                                        }}
                                    >
                                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${isSelected ? 'bg-primary-100' : 'bg-gray-200'}`}>
                                            <Icon size={24} color={isSelected ? '#b91c1c' : '#6b7280'} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`text-lg font-bold ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                                                {turno.nome}
                                            </Text>
                                            <Text className="text-sm text-gray-500">{turno.horario}</Text>
                                        </View>
                                        {isSelected && (
                                            <View className="w-8 h-8 bg-primary-500 rounded-full items-center justify-center">
                                                <Check size={18} color="#fff" strokeWidth={3} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View className="p-4 pb-8">
                            <TouchableOpacity
                                className="w-full py-4 bg-gray-100 rounded-2xl items-center"
                                onPress={() => setShowTurnoModal(false)}
                            >
                                <Text className="text-gray-600 font-bold">Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal de Escala do Dia */}
            <Modal
                visible={showEscalaModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEscalaModal(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-end"
                    activeOpacity={1}
                    onPress={() => setShowEscalaModal(false)}
                >
                    <View className="bg-white rounded-t-3xl max-h-[80%]">
                        <View className="p-6 border-b border-gray-100">
                            <View className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                            <View className="flex-row items-center justify-center gap-2">
                                <Calendar size={24} color="#3b82f6" />
                                <Text className="text-xl font-bold text-gray-800">Escala de Hoje</Text>
                            </View>
                            <Text className="text-center text-gray-500 mt-1">
                                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </Text>
                        </View>

                        <ScrollView className="p-4">
                            {/* Trabalhando */}
                            <View className="mb-6">
                                <View className="flex-row items-center gap-2 mb-3">
                                    <View className="w-3 h-3 bg-green-500 rounded-full" />
                                    <Text className="text-base font-bold text-gray-700">Trabalhando ({trabalhando.length})</Text>
                                </View>
                                {trabalhando.map((frentista) => (
                                    <View
                                        key={frentista.id}
                                        className="flex-row items-center p-3 bg-green-50 rounded-xl mb-2"
                                    >
                                        <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                                            <Text className="text-green-700 font-bold">{frentista.nome.charAt(0)}</Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-base font-semibold text-gray-800">{frentista.nome}</Text>
                                            <Text className="text-xs text-gray-500">Turno: {frentista.turno}</Text>
                                        </View>
                                        <View className="bg-green-100 px-3 py-1 rounded-full">
                                            <Text className="text-green-700 text-xs font-bold">Ativo</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* De Folga */}
                            <View className="mb-6">
                                <View className="flex-row items-center gap-2 mb-3">
                                    <View className="w-3 h-3 bg-orange-500 rounded-full" />
                                    <Text className="text-base font-bold text-gray-700">De Folga ({folgas.length})</Text>
                                </View>
                                {folgas.map((frentista) => (
                                    <View
                                        key={frentista.id}
                                        className="flex-row items-center p-3 bg-orange-50 rounded-xl mb-2"
                                    >
                                        <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                                            <Coffee size={18} color="#f59e0b" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-base font-semibold text-gray-800">{frentista.nome}</Text>
                                            <Text className="text-xs text-gray-500">Dia de descanso</Text>
                                        </View>
                                        <View className="bg-orange-100 px-3 py-1 rounded-full">
                                            <Text className="text-orange-700 text-xs font-bold">Folga</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>

                        <View className="p-4 pb-8 border-t border-gray-100">
                            <TouchableOpacity
                                className="w-full py-4 bg-gray-100 rounded-2xl items-center"
                                onPress={() => setShowEscalaModal(false)}
                            >
                                <Text className="text-gray-600 font-bold">Fechar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
}
