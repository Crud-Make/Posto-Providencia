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
        <ScrollView
            style={{ flex: 1, backgroundColor: '#f9fafb' }}
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
        >
            {/* Header */}
            <View style={{
                margin: 16,
                padding: 20,
                backgroundColor: '#7c3aed',
                borderRadius: 24,
                flexDirection: 'row',
                alignItems: 'center'
            }}>
                <View style={{
                    width: 56,
                    height: 56,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                }}>
                    <QrCode size={28} color="#fff" />
                </View>
                <View>
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>Voucher Baratência</Text>
                    <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Valide o token do cliente</Text>
                </View>
            </View>

            {/* Input do PIN */}
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 }}>🔑 Token de Abastecimento</Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>Insira o PIN de 6 dígitos</Text>

                <TextInput
                    style={{
                        height: 64,
                        backgroundColor: '#fff',
                        borderRadius: 16,
                        fontSize: 32,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        letterSpacing: 8,
                        borderWidth: 2,
                        borderColor: pin.length === 6 ? '#7c3aed' : '#e5e7eb',
                        color: '#1f2937',
                        marginBottom: 16
                    }}
                    value={pin}
                    onChangeText={(text) => setPin(text.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="000000"
                    placeholderTextColor="#d1d5db"
                />

                {/* Botões */}
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            paddingVertical: 16,
                            backgroundColor: '#e5e7eb',
                            borderRadius: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 8
                        }}
                        onPress={clearPin}
                    >
                        <RefreshCw size={20} color="#6b7280" />
                        <Text style={{ marginLeft: 8, color: '#4b5563', fontWeight: 'bold' }}>Limpar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flex: 1,
                            paddingVertical: 16,
                            backgroundColor: isPinComplete ? '#7c3aed' : '#c4b5fd',
                            borderRadius: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onPress={validateToken}
                        disabled={!isPinComplete || validating}
                    >
                        {validating ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Validar</Text>
                                <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Erro */}
            {validationError && (
                <View style={{
                    margin: 16,
                    padding: 20,
                    backgroundColor: '#fef2f2',
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: '#fecaca',
                    flexDirection: 'row',
                    alignItems: 'center'
                }}>
                    <View style={{
                        width: 48,
                        height: 48,
                        backgroundColor: '#fee2e2',
                        borderRadius: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                    }}>
                        <XCircle size={28} color="#dc2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#b91c1c' }}>Token Inválido</Text>
                        <Text style={{ fontSize: 14, color: '#dc2626', marginTop: 4 }}>{validationError}</Text>
                    </View>
                </View>
            )}

            {/* Token Válido */}
            {validatedToken && (
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    <View style={{
                        backgroundColor: '#fff',
                        borderRadius: 24,
                        borderWidth: 2,
                        borderColor: '#bbf7d0',
                        overflow: 'hidden'
                    }}>
                        {/* Header Verde */}
                        <View style={{
                            backgroundColor: '#22c55e',
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 24,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12
                            }}>
                                <CheckCircle2 size={28} color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>Token Válido!</Text>
                                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>Pronto para abastecer</Text>
                            </View>
                            <View style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                paddingHorizontal: 12,
                                paddingVertical: 4,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}>
                                <Clock size={14} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 4 }}>
                                    {getTimeRemaining(validatedToken.data_expiracao)}
                                </Text>
                            </View>
                        </View>

                        {/* Corpo */}
                        <View style={{ padding: 20 }}>
                            {/* Cliente */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingBottom: 16,
                                marginBottom: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: '#f3f4f6'
                            }}>
                                <View style={{
                                    width: 48,
                                    height: 48,
                                    backgroundColor: '#f3e8ff',
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12
                                }}>
                                    <User size={24} color="#7c3aed" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Cliente</Text>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>{validatedToken.cliente_nome}</Text>
                                    <Text style={{ fontSize: 14, color: '#6b7280' }}>{maskCPF(validatedToken.cliente_cpf)}</Text>
                                </View>
                            </View>

                            {/* Combustível */}
                            <View style={{
                                backgroundColor: '#faf5ff',
                                padding: 16,
                                borderRadius: 16,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{
                                        width: 48,
                                        height: 48,
                                        backgroundColor: '#f3e8ff',
                                        borderRadius: 24,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12
                                    }}>
                                        <Fuel size={24} color="#7c3aed" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 12, color: '#7c3aed', textTransform: 'uppercase' }}>Combustível</Text>
                                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#581c87' }}>{validatedToken.combustivel_nome}</Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 12, color: '#7c3aed', textTransform: 'uppercase' }}>Quantidade</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                        <Text style={{ fontSize: 32, fontWeight: '900', color: '#7c3aed' }}>
                                            {validatedToken.quantidade_litros.toFixed(1)}
                                        </Text>
                                        <Text style={{ fontSize: 18, color: '#a855f7', marginLeft: 4 }}>L</Text>
                                    </View>
                                </View>
                            </View>

                            {/* PIN */}
                            <View style={{
                                backgroundColor: '#f9fafb',
                                padding: 12,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 16
                            }}>
                                <Ticket size={18} color="#6b7280" />
                                <Text style={{ marginLeft: 8, color: '#6b7280' }}>Token:</Text>
                                <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: 'bold', color: '#1f2937', letterSpacing: 4 }}>
                                    {validatedToken.token_pin}
                                </Text>
                            </View>

                            {/* Botão Confirmar */}
                            <TouchableOpacity
                                style={{
                                    paddingVertical: 20,
                                    backgroundColor: confirming ? '#86efac' : '#16a34a',
                                    borderRadius: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
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
                                disabled={confirming}
                            >
                                {confirming ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Droplets size={24} color="#fff" />
                                        <Text style={{ marginLeft: 12, color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                                            Confirmar Abastecimento
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Aviso */}
                    <View style={{
                        marginTop: 16,
                        padding: 16,
                        backgroundColor: '#fefce8',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#fef08a',
                        flexDirection: 'row',
                        alignItems: 'flex-start'
                    }}>
                        <AlertTriangle size={20} color="#eab308" />
                        <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: '#a16207' }}>
                            Confirme <Text style={{ fontWeight: 'bold' }}>somente após</Text> entregar o combustível.
                        </Text>
                    </View>
                </View>
            )}

            {/* Instruções */}
            {!validatedToken && !validationError && (
                <View style={{ paddingHorizontal: 16, marginTop: 32 }}>
                    <View style={{
                        backgroundColor: '#fff',
                        padding: 20,
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: '#f3f4f6'
                    }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 16, textAlign: 'center' }}>
                            📱 Como usar
                        </Text>

                        {[
                            { num: '1', title: 'Solicite o PIN', desc: 'Peça o código de 6 dígitos do app Baratência' },
                            { num: '2', title: 'Digite e valide', desc: 'Insira o PIN e toque em "Validar"' },
                            { num: '3', title: 'Abasteça e confirme', desc: 'Após entregar o combustível, confirme' },
                        ].map((step, index) => (
                            <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: index < 2 ? 12 : 0 }}>
                                <View style={{
                                    width: 32,
                                    height: 32,
                                    backgroundColor: '#f3e8ff',
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12
                                }}>
                                    <Text style={{ color: '#7c3aed', fontWeight: 'bold' }}>{step.num}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#1f2937', fontWeight: '600' }}>{step.title}</Text>
                                    <Text style={{ color: '#6b7280', fontSize: 14 }}>{step.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Modal Sucesso */}
            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 32
                }}>
                    <View style={{
                        backgroundColor: '#fff',
                        borderRadius: 24,
                        padding: 32,
                        alignItems: 'center',
                        width: '100%'
                    }}>
                        <View style={{
                            width: 96,
                            height: 96,
                            backgroundColor: '#dcfce7',
                            borderRadius: 48,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 24
                        }}>
                            <CheckCircle2 size={56} color="#22c55e" />
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: 'center', marginBottom: 8 }}>
                            Abastecimento Confirmado!
                        </Text>
                        <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
                            Crédito debitado da carteira do cliente.
                        </Text>
                        <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}>
                            <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Operação concluída</Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}
