import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    QrCode,
    CheckCircle2,
    XCircle,
    Fuel,
    User,
    Clock,
    AlertTriangle,
    RefreshCw,
    ArrowRight,
    Ticket,
    Droplets
} from 'lucide-react-native';

// Tipos
interface TokenInfo {
    id: number;
    cliente_nome: string;
    cliente_cpf: string;
    combustivel_nome: string;
    combustivel_codigo: string;
    quantidade_litros: number;
    token_pin: string;
    data_expiracao: string;
    status: string;
    posto_nome: string;
}

export default function VoucherScreen() {
    const [pin, setPin] = useState('');
    const [validating, setValidating] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [validatedToken, setValidatedToken] = useState<TokenInfo | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [frentistaId, setFrentistaId] = useState<number | null>(null);
    const [postoId, setPostoId] = useState<number | null>(null);

    // Buscar dados do frentista logado
    useEffect(() => {
        async function fetchFrentista() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: frentista } = await supabase
                        .from('Frentista')
                        .select('id, posto_id')
                        .eq('user_id', user.id)
                        .single();

                    if (frentista) {
                        setFrentistaId(frentista.id);
                        setPostoId(frentista.posto_id);
                    }
                }
            } catch (error) {
                console.log('Erro ao buscar frentista:', error);
            }
        }
        fetchFrentista();
    }, []);

    // Limpar PIN
    const clearPin = () => {
        setPin('');
        setValidatedToken(null);
        setValidationError(null);
    };

    // Validar Token
    const validateToken = async () => {
        if (pin.length !== 6) {
            Alert.alert('Atenção', 'Insira o PIN completo de 6 dígitos');
            return;
        }

        setValidating(true);
        setValidationError(null);
        setValidatedToken(null);

        try {
            // Buscar token pelo PIN
            const { data: token, error } = await supabase
                .from('TokenAbastecimento')
                .select(`
                    id,
                    token_pin,
                    quantidade_litros,
                    data_expiracao,
                    status,
                    cliente:ClienteBaratencia!cliente_id (
                        id,
                        nome,
                        cpf
                    ),
                    combustivel:Combustivel!combustivel_id (
                        id,
                        nome,
                        codigo
                    ),
                    posto:Posto!posto_id (
                        id,
                        nome
                    )
                `)
                .eq('token_pin', pin)
                .single();

            if (error || !token) {
                setValidationError('Token não encontrado. Verifique o PIN e tente novamente.');
                return;
            }

            // Verificar status
            if (token.status !== 'PENDENTE') {
                const statusMessages: Record<string, string> = {
                    'USADO': 'Este token já foi utilizado.',
                    'EXPIRADO': 'Este token expirou.',
                    'CANCELADO': 'Este token foi cancelado.',
                };
                setValidationError(statusMessages[token.status] || 'Token inválido.');
                return;
            }

            // Verificar expiração
            const dataExpiracao = new Date(token.data_expiracao);
            if (dataExpiracao < new Date()) {
                setValidationError('Este token expirou. O cliente precisa gerar um novo.');
                return;
            }

            // Token válido!
            const clienteData = token.cliente as any;
            const combustivelData = token.combustivel as any;
            const postoData = token.posto as any;

            setValidatedToken({
                id: token.id,
                cliente_nome: clienteData?.nome || 'Cliente',
                cliente_cpf: clienteData?.cpf || '',
                combustivel_nome: combustivelData?.nome || 'Combustível',
                combustivel_codigo: combustivelData?.codigo || '',
                quantidade_litros: Number(token.quantidade_litros),
                token_pin: token.token_pin,
                data_expiracao: token.data_expiracao,
                status: token.status,
                posto_nome: postoData?.nome || ''
            });

        } catch (error: any) {
            console.error('Erro ao validar token:', error);
            setValidationError('Erro ao validar token. Tente novamente.');
        } finally {
            setValidating(false);
        }
    };

    // Confirmar abastecimento
    const confirmAbastecimento = async () => {
        if (!validatedToken || !frentistaId) return;

        setConfirming(true);

        try {
            const { error } = await supabase
                .from('TokenAbastecimento')
                .update({
                    status: 'USADO',
                    frentista_id_resgatou: frentistaId,
                    data_resgate: new Date().toISOString()
                })
                .eq('id', validatedToken.id);

            if (error) throw error;

            setShowSuccessModal(true);

            setTimeout(() => {
                setShowSuccessModal(false);
                clearPin();
            }, 3000);

        } catch (error: any) {
            console.error('Erro ao confirmar:', error);
            Alert.alert('Erro', 'Não foi possível confirmar. Tente novamente.');
        } finally {
            setConfirming(false);
        }
    };

    // Formatar tempo restante
    const getTimeRemaining = (expirationDate: string) => {
        const now = new Date();
        const expiration = new Date(expirationDate);
        const diffMs = expiration.getTime() - now.getTime();

        if (diffMs <= 0) return 'Expirado';

        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);

        return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
    };

    // Mascarar CPF
    const maskCPF = (cpf: string) => {
        if (!cpf) return '';
        const clean = cpf.replace(/\D/g, '');
        if (clean.length !== 11) return cpf;
        return `${clean.slice(0, 3)}.***.***-${clean.slice(9)}`;
    };

    const isPinComplete = pin.length === 6;

    return (
        <View className="flex-1 bg-gray-50">
            {/* Modal de Sucesso */}
            {showSuccessModal && (
                <View className="absolute inset-0 bg-green-500/90 z-50 items-center justify-center p-6">
                    <CheckCircle2 size={120} color="white" />
                    <Text className="text-white text-3xl font-bold mt-6 text-center">Resgatado com Sucesso!</Text>
                    <Text className="text-white text-lg mt-2 text-center">O abastecimento foi registrado.</Text>
                </View>
            )}

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="p-6">
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-8">
                        <View>
                            <Text className="text-gray-500 text-sm font-medium">Voucher</Text>
                            <Text className="text-gray-900 text-3xl font-bold tracking-tight">Baratência</Text>
                        </View>
                        <View className="w-14 h-14 bg-purple-100 rounded-2xl items-center justify-center">
                            <QrCode size={32} color="#7c3aed" />
                        </View>
                    </View>

                    {/* Scanner / PIN Toggle */}
                    <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-gray-800 text-lg font-bold">Validar Token</Text>
                            <Ticket size={20} color="#7c3aed" />
                        </View>

                        <View className="flex-row gap-2 mb-6">
                            <TouchableOpacity
                                className="flex-1 bg-purple-600 h-14 rounded-xl items-center justify-center flex-row shadow-sm shadow-purple-200"
                                onPress={() => Alert.alert('Scanner', 'O scanner de QR Code requer a biblioteca expo-camera. Por favor, utilize o PIN por enquanto.')}
                            >
                                <QrCode size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Abrir Scanner</Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">Ou digite o PIN de 6 dígitos</Text>
                        <TextInput
                            className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-center text-3xl font-black text-gray-800 tracking-widest"
                            placeholder="000000"
                            placeholderTextColor="#d1d5db"
                            keyboardType="number-pad"
                            maxLength={6}
                            value={pin}
                            onChangeText={(text) => setPin(text.replace(/\D/g, '').slice(0, 6))}
                        />

                        {validationError && (
                            <View className="mt-4 bg-red-50 p-4 rounded-xl flex-row items-center border border-red-100">
                                <XCircle size={20} color="#ef4444" />
                                <Text className="text-red-600 ml-2 flex-1 text-sm">{validationError}</Text>
                            </View>
                        )}

                        <View className="flex-row gap-2 mt-6">
                            <TouchableOpacity
                                className="w-16 h-16 bg-gray-100 rounded-2xl items-center justify-center"
                                onPress={clearPin}
                            >
                                <RefreshCw size={24} color="#6b7280" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`flex-1 h-16 rounded-2xl items-center justify-center flex-row ${validating || pin.length < 6 ? 'bg-gray-200' : 'bg-purple-600 shadow-lg shadow-purple-200'}`}
                                onPress={validateToken}
                                disabled={validating || pin.length < 6}
                            >
                                {validating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text className={`text-lg font-bold ${pin.length < 6 ? 'text-gray-400' : 'text-white'}`}>Verificar Token</Text>
                                        <ArrowRight size={20} color={pin.length < 6 ? '#9ca3af' : 'white'} style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Detalhes do Token Validado */}
                    {validatedToken && (
                        <View className="bg-white rounded-3xl p-6 shadow-sm border-2 border-green-500 mb-6 shadow-green-100">
                            <View className="flex-row items-center mb-6">
                                <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center">
                                    <CheckCircle2 size={24} color="#22c55e" />
                                </View>
                                <View className="ml-3 flex-1">
                                    <Text className="text-green-600 font-bold mb-0.5">Token Válido</Text>
                                    <View className="flex-row items-center">
                                        <Clock size={12} color="#6b7280" />
                                        <Text className="text-gray-500 text-xs ml-1 font-medium">Expira em: {getTimeRemaining(validatedToken.data_expiracao)}</Text>
                                    </View>
                                </View>
                            </View>

                            <View className="gap-4">
                                <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <View className="flex-row items-center mb-1">
                                        <User size={14} color="#9ca3af" />
                                        <Text className="text-gray-400 text-[10px] font-bold uppercase ml-1 tracking-wider">Cliente</Text>
                                    </View>
                                    <Text className="text-gray-900 text-lg font-bold">{validatedToken.cliente_nome}</Text>
                                    <Text className="text-gray-500 font-medium">{maskCPF(validatedToken.cliente_cpf)}</Text>
                                </View>

                                <View className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex-row justify-between items-center">
                                    <View>
                                        <View className="flex-row items-center mb-1">
                                            <Fuel size={14} color="#a855f7" />
                                            <Text className="text-purple-400 text-[10px] font-bold uppercase ml-1 tracking-wider">Combustível</Text>
                                        </View>
                                        <Text className="text-purple-900 text-lg font-bold">{validatedToken.combustivel_nome}</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-purple-600 text-[10px] font-bold uppercase mb-1 tracking-wider">Quantidade</Text>
                                        <View className="flex-row items-baseline">
                                            <Text className="text-purple-900 text-3xl font-black">{validatedToken.quantidade_litros.toFixed(1)}</Text>
                                            <Text className="text-purple-600 text-lg font-bold ml-1">L</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                className={`mt-8 h-20 rounded-2xl items-center justify-center flex-row ${confirming || !frentistaId ? 'bg-gray-300' : 'bg-green-600 shadow-xl shadow-green-200'}`}
                                onPress={() => {
                                    Alert.alert(
                                        '⛽ Confirmar Abastecimento',
                                        `Confirma ${validatedToken.quantidade_litros.toFixed(1)}L de ${validatedToken.combustivel_nome}?`,
                                        [
                                            { text: 'Cancelar', style: 'cancel' },
                                            { text: 'Confirmar', onPress: confirmAbastecimento }
                                        ]
                                    );
                                }}
                                disabled={confirming || !frentistaId}
                            >
                                {confirming ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Droplets size={28} color="white" />
                                        <Text className="text-white text-xl font-bold ml-3">Liberar Abastecimento</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {!frentistaId && (
                                <View className="mt-4 flex-row items-center justify-center gap-2">
                                    <AlertTriangle size={16} color="#ef4444" />
                                    <Text className="text-red-500 text-xs font-bold italic">
                                        Vincule seu perfil de frentista para resgatar.
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Instruções */}
                    {!validatedToken && (
                        <View className="bg-white p-6 rounded-3xl border border-gray-100 mt-4 shadow-sm">
                            <View className="flex-row items-center mb-4">
                                <View className="w-8 h-8 bg-blue-50 rounded-lg items-center justify-center">
                                    <AlertTriangle size={18} color="#3b82f6" />
                                </View>
                                <Text className="text-gray-800 font-bold ml-2">Instruções de Uso</Text>
                            </View>

                            <View className="gap-3">
                                <View className="flex-row">
                                    <View className="w-6 h-6 bg-gray-100 rounded-full items-center justify-center border border-gray-200">
                                        <Text className="text-gray-600 text-xs font-bold">1</Text>
                                    </View>
                                    <Text className="text-gray-500 text-xs flex-1 ml-2 leading-4">
                                        Cliente apresenta o <Text className="font-bold text-gray-700">PIN de 6 dígitos</Text> gerado no App Baratência.
                                    </Text>
                                </View>
                                <View className="flex-row">
                                    <View className="w-6 h-6 bg-gray-100 rounded-full items-center justify-center border border-gray-200">
                                        <Text className="text-gray-600 text-xs font-bold">2</Text>
                                    </View>
                                    <Text className="text-gray-500 text-xs flex-1 ml-2 leading-4">
                                        Valide o PIN para conferir o <Text className="font-bold text-gray-700">combustível e a litragem</Text> autorizados.
                                    </Text>
                                </View>
                                <View className="flex-row">
                                    <View className="w-6 h-6 bg-gray-100 rounded-full items-center justify-center border border-gray-200">
                                        <Text className="text-gray-600 text-xs font-bold">3</Text>
                                    </View>
                                    <Text className="text-gray-500 text-xs flex-1 ml-2 leading-4">
                                        Após o abastecimento físico, clique em <Text className="font-bold text-gray-700">Liberar</Text> para concluir.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
