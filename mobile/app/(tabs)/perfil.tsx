import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import {
    User,
    LogOut,
    ChevronRight,
    Bell,
    Shield,
    HelpCircle,
    Phone,
    Mail,
    Clock,
    TrendingUp,
    AlertTriangle,
    Check,
    Award,
    RefreshCw
} from 'lucide-react-native';
import * as Updates from 'expo-updates';

interface UserStats {
    totalRegistros: number;
    registrosSemFalta: number;
    registrosComFalta: number;
    taxaAcerto: number;
}

export default function PerfilScreen() {
    const [userName, setUserName] = useState('Frentista');
    const [userEmail, setUserEmail] = useState('');
    const [turno, setTurno] = useState('Manhã');
    const [loading, setLoading] = useState(false);
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [updateMsg, setUpdateMsg] = useState('Toque para verificar');

    const handleCheckUpdate = async () => {
        if (checkingUpdate) return;

        // Verificar se OTA está habilitado
        if (!Updates.isEnabled) {
            Alert.alert('Aviso', 'Atualizações OTA não estão habilitadas neste build. Use o APK mais recente.');
            return;
        }

        try {
            setCheckingUpdate(true);
            setUpdateMsg('Verificando...');

            console.log('🔍 Verificando atualizações...');
            console.log('Runtime Version:', Updates.runtimeVersion);
            console.log('Update ID:', Updates.updateId);

            const update = await Updates.checkForUpdateAsync();
            console.log('📦 Resultado:', update);

            if (update.isAvailable) {
                console.log('✅ Atualização disponível!');
                setUpdateMsg('Baixando atualização...');

                await Updates.fetchUpdateAsync();
                console.log('⬇️ Download concluído!');

                Alert.alert(
                    'Atualização Pronta',
                    'O aplicativo será reiniciado para aplicar a atualização.',
                    [{
                        text: 'OK',
                        onPress: async () => {
                            console.log('🔄 Reiniciando...');
                            await Updates.reloadAsync();
                        }
                    }]
                );
                setUpdateMsg('Atualização aplicada!');
            } else {
                console.log('ℹ️ Nenhuma atualização disponível');
                setUpdateMsg('App atualizado');
                Alert.alert('Tudo certo', `Você já está usando a versão mais recente.\n\nRuntime: ${Updates.runtimeVersion}`);
            }
        } catch (error: any) {
            console.error('❌ Erro:', error);
            setUpdateMsg('Erro ao verificar');

            let errorMessage = error.message || 'Erro desconhecido';
            let suggestion = '';

            // Check for common error scenarios
            if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                suggestion = '\n\n💡 Sugestão: Verifique sua conexão com a internet.';
            } else if (errorMessage.includes('runtime') || errorMessage.includes('version')) {
                suggestion = '\n\n💡 Sugestão: Este APK pode não ser compatível com as atualizações OTA. Instale a versão mais recente do APK.';
            } else if (errorMessage.includes('not enabled') || errorMessage.includes('development')) {
                suggestion = '\n\n💡 Sugestão: Este build não suporta atualizações OTA. Instale um build de produção.';
            } else {
                suggestion = `\n\n💡 Runtime: ${Updates.runtimeVersion || 'N/A'}\n💡 Sugestão: Tente reinstalar o APK mais recente da loja.`;
            }

            Alert.alert('Erro', `Não foi possível verificar atualizações.\n\n${errorMessage}${suggestion}`);
        } finally {
            setCheckingUpdate(false);
        }
    };

    // Estatísticas mock
    const [stats] = useState<UserStats>({
        totalRegistros: 45,
        registrosSemFalta: 43,
        registrosComFalta: 2,
        taxaAcerto: 95.6,
    });

    useEffect(() => {
        async function fetchUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
                const name = user.email.split('@')[0];
                setUserName(name.charAt(0).toUpperCase() + name.slice(1));
            }
        }
        fetchUser();
    }, []);

    const handleLogout = () => {
        Alert.alert(
            'Sair',
            'Deseja realmente sair da sua conta?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        await supabase.auth.signOut();
                        router.replace('/');
                    }
                }
            ]
        );
    };

    const MenuItem = ({
        icon: Icon,
        label,
        subtitle,
        onPress,
        iconColor = '#6b7280',
        iconBg = '#f3f4f6',
        showArrow = true,
        danger = false
    }: {
        icon: any;
        label: string;
        subtitle?: string;
        onPress?: () => void;
        iconColor?: string;
        iconBg?: string;
        showArrow?: boolean;
        danger?: boolean;
    }) => (
        <TouchableOpacity
            className="flex-row items-center p-4 bg-white"
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: iconBg }}
            >
                <Icon size={20} color={iconColor} />
            </View>
            <View className="flex-1">
                <Text className={`text-base font-semibold ${danger ? 'text-red-600' : 'text-gray-800'}`}>
                    {label}
                </Text>
                {subtitle && (
                    <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
                )}
            </View>
            {showArrow && <ChevronRight size={20} color="#d1d5db" />}
        </TouchableOpacity>
    );

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Header Card */}
            <View
                className="mx-4 mt-4 bg-primary-700 rounded-3xl overflow-hidden"
                style={{ shadowColor: '#b91c1c', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 }}
            >
                <View className="p-6 items-center">
                    <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-4">
                        <Text className="text-primary-700 text-3xl font-black">
                            {userName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text className="text-white text-xl font-bold">{userName}</Text>
                    <Text className="text-primary-200 text-sm mt-1">{userEmail}</Text>

                    <View className="flex-row items-center mt-4 bg-white/20 px-4 py-2 rounded-full">
                        <Clock size={14} color="#fff" />
                        <Text className="text-white font-medium text-sm ml-2">Turno {turno}</Text>
                    </View>
                </View>
            </View>

            {/* Estatísticas */}
            <View className="px-4 mt-6">
                <Text className="text-lg font-bold text-gray-800 mb-4">📊 Suas Estatísticas</Text>

                <View className="flex-row gap-3">
                    <View
                        className="flex-1 bg-white rounded-2xl p-4 border border-gray-100"
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                    >
                        <View className="w-10 h-10 bg-primary-100 rounded-xl items-center justify-center mb-3">
                            <TrendingUp size={20} color="#b91c1c" />
                        </View>
                        <Text className="text-2xl font-black text-gray-800">{stats.totalRegistros}</Text>
                        <Text className="text-xs text-gray-400 mt-1">Total de Registros</Text>
                    </View>

                    <View
                        className="flex-1 bg-white rounded-2xl p-4 border border-gray-100"
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                    >
                        <View className="w-10 h-10 bg-green-100 rounded-xl items-center justify-center mb-3">
                            <Award size={20} color="#16a34a" />
                        </View>
                        <Text className="text-2xl font-black text-green-600">{stats.taxaAcerto}%</Text>
                        <Text className="text-xs text-gray-400 mt-1">Taxa de Acerto</Text>
                    </View>
                </View>

                {/* Barra de Progresso */}
                <View
                    className="mt-4 bg-white rounded-2xl p-4 border border-gray-100"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                >
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm font-semibold text-gray-700">Desempenho do Mês</Text>
                        <Text className="text-sm font-bold text-green-600">{stats.taxaAcerto}%</Text>
                    </View>
                    <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <View
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${stats.taxaAcerto}%` }}
                        />
                    </View>
                    <View className="flex-row justify-between mt-3">
                        <View className="flex-row items-center gap-2">
                            <View className="w-3 h-3 bg-green-500 rounded-full" />
                            <Text className="text-xs text-gray-500">{stats.registrosSemFalta} sem falta</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <View className="w-3 h-3 bg-red-500 rounded-full" />
                            <Text className="text-xs text-gray-500">{stats.registrosComFalta} com falta</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Menu de Opções */}
            <View className="px-4 mt-6">
                <Text className="text-lg font-bold text-gray-800 mb-4">⚙️ Configurações</Text>

                <View
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                >
                    <MenuItem
                        icon={RefreshCw}
                        label="Verificar Atualizações"
                        subtitle={updateMsg}
                        onPress={handleCheckUpdate}
                        iconColor="#2563eb"
                        iconBg="#eff6ff"
                    />
                    <View className="h-px bg-gray-100 ml-16" />
                    <MenuItem
                        icon={Bell}
                        label="Notificações"
                        subtitle="Gerenciar alertas"
                        iconColor="#f59e0b"
                        iconBg="#fffbeb"
                    />
                    <View className="h-px bg-gray-100 ml-16" />
                    <MenuItem
                        icon={Shield}
                        label="Privacidade"
                        subtitle="Dados e segurança"
                        iconColor="#3b82f6"
                        iconBg="#eff6ff"
                    />
                    <View className="h-px bg-gray-100 ml-16" />
                    <MenuItem
                        icon={HelpCircle}
                        label="Ajuda"
                        subtitle="Central de suporte"
                        iconColor="#8b5cf6"
                        iconBg="#f5f3ff"
                    />
                </View>
            </View>

            {/* Contato */}
            <View className="px-4 mt-6">
                <Text className="text-lg font-bold text-gray-800 mb-4">📞 Contato</Text>

                <View
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                >
                    <MenuItem
                        icon={Phone}
                        label="Telefone"
                        subtitle="(11) 99999-9999"
                        iconColor="#16a34a"
                        iconBg="#f0fdf4"
                        showArrow={false}
                    />
                    <View className="h-px bg-gray-100 ml-16" />
                    <MenuItem
                        icon={Mail}
                        label="E-mail"
                        subtitle="suporte@postoProvidencia.com"
                        iconColor="#0891b2"
                        iconBg="#ecfeff"
                        showArrow={false}
                    />
                </View>
            </View>

            {/* Botão Sair */}
            <View className="px-4 mt-8">
                <TouchableOpacity
                    className="bg-white rounded-2xl p-4 flex-row items-center justify-center gap-3 border border-red-200"
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <LogOut size={20} color="#dc2626" />
                    <Text className="text-red-600 font-bold text-base">Sair da Conta</Text>
                </TouchableOpacity>
            </View>

            {/* Versão */}
            <Text className="text-center text-gray-400 text-xs mt-8">
                Versão 1.0.1 • Posto Providência
            </Text>
        </ScrollView>
    );
}
