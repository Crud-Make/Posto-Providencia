import { View, Text, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator, Modal, Share, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useUpdateChecker } from '../../lib/useUpdateChecker';
import type { Escala } from '@posto/types';
import QRCode from 'react-native-qrcode-svg';
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
    Calendar,
    Briefcase,
    RefreshCw,
    Share2,
    X,
    Download,
    QrCode
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

/**
 * Estatísticas de desempenho do usuário.
 */
interface UserStats {
    /** Total de registros de turno realizados */
    totalRegistros: number;
    /** Registros sem divergências (OK) */
    registrosSemFalta: number;
    /** Registros com divergências (falta/sobra) */
    registrosComFalta: number;
    /** Porcentagem de acerto (fechamentos OK / total) */
    taxaAcerto: number;
}

/**
 * Tela de Perfil do Usuário.
 * Exibe informações do frentista, estatísticas, escala de folgas e opções do aplicativo.
 * Permite verificar atualizações e compartilhar o app via QR Code.
 * 
 * @component
 * @returns {JSX.Element} O componente da tela de perfil.
 */
export default function PerfilScreen() {
    const insets = useSafeAreaInsets();
    const [userName, setUserName] = useState('Frentista');
    const [userEmail, setUserEmail] = useState('');
    const [postoNome, setPostoNome] = useState('Posto Providência');
    const [turno, setTurno] = useState('Manhã');
    const [loading, setLoading] = useState(false);

    // Estatísticas mock
    const [stats] = useState<UserStats>({
        totalRegistros: 45,
        registrosSemFalta: 43,
        registrosComFalta: 2,
        taxaAcerto: 95.6,
    });
    const [folgas, setFolgas] = useState<Escala[]>([]);
    const [showQRModal, setShowQRModal] = useState(false);

    // URL do APK para download - Link fixo para facilitar
    const APK_DOWNLOAD_URL = 'https://expo.dev/accounts/thygas8477/projects/posto-frentista/builds';

    const {
        status,
        isUpdateAvailable,
        checkingUpdate,
        promptForUpdate,
        checkForUpdate
    } = useUpdateChecker({
        checkOnMount: false, // O layout já faz isso
        checkOnForeground: false,
        autoDownload: true
    });

    /**
     * Verifica manualmente se há atualizações do app via Expo Updates.
     * Exibe alertas informando o status da verificação.
     */
    async function handleCheckUpdates() {
        if (__DEV__) {
            Alert.alert('Modo DEV', 'Updates não funcionam em desenvolvimento local.');
            return;
        }

        const available = await checkForUpdate();
        if (!available && status !== 'error') {
            Alert.alert('Atualizado', 'Você já está usando a versão mais recente.');
        } else if (status === 'error') {
            Alert.alert('Aviso', 'Não foi possível buscar atualizações agora. Verifique sua rede e tente novamente em instantes.');
        }
    }

    /**
     * Compartilha o link de download do aplicativo usando a API nativa de compartilhamento.
     */
    async function handleShareApp() {
        try {
            await Share.share({
                message: `📱 Baixe o App do Frentista!\n\nAcesse o link para baixar o aplicativo:\n${APK_DOWNLOAD_URL}\n\nOu peça para escanear o QR Code no app de quem já tem!`,
                title: 'Compartilhar App Frentista',
            });
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
        }
    }

    /**
     * Carrega dados iniciais do perfil.
     */
    useEffect(() => {
        loadData();
    }, []);

    /**
     * Simula o carregamento dos dados do usuário.
     * Em uma implementação completa, buscaria do Supabase.
     */
    async function loadData() {
        setLoading(true);
        try {
            // No modo sem login, poderíamos buscar o frentista selecionado localmente ou de outra forma
            // Por enquanto, mostra frentista genérico
            setUserName('Frentista');
            setUserEmail('Acesso Livre');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    /**
     * Executa a ação de logout (simulada para modo livre).
     */
    const handleLogout = () => {
        Alert.alert('Modo Livre', 'O login não é mais necessário neste aplicativo.');
    };

    /**
     * Componente interno para renderizar itens do menu de opções.
     */
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
        icon: LucideIcon;
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

            {/* Escala / Folgas */}
            <View className="px-4 mt-6">
                <Text className="text-lg font-bold text-gray-800 mb-4">📅 Minha Escala</Text>

                {folgas.length === 0 ? (
                    <View className="bg-white rounded-2xl p-6 border border-gray-100 items-center justify-center">
                        <Calendar size={32} color="#9ca3af" />
                        <Text className="text-gray-400 mt-2 text-center">Nenhuma folga agendada para os próximos dias.</Text>
                    </View>
                ) : (
                    <View
                        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                    >
                        {folgas.map((folga, index) => {
                            const date = new Date(folga.data);
                            date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); // Fix timezone visual
                            const day = date.getDate();
                            const month = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
                            const weekDay = date.toLocaleString('pt-BR', { weekday: 'long' });

                            return (
                                <View key={folga.id} className={`flex-row items-center p-4 ${index !== folgas.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                    <View className="bg-red-50 rounded-xl p-2 items-center justify-center w-14 h-14 mr-4 border border-red-100">
                                        <Text className="text-xs font-bold text-red-600">{month}</Text>
                                        <Text className="text-xl font-black text-red-700">{day}</Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-base font-bold text-gray-800 capitalize">{weekDay}</Text>
                                        <Text className="text-sm text-gray-500">Folga Programada</Text>
                                    </View>
                                    <View className="bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                        <Text className="text-xs font-bold text-green-700">Confirmado</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
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
                    <TouchableOpacity
                        className="flex-row items-center p-4 bg-white"
                        onPress={handleCheckUpdates}
                        activeOpacity={0.7}
                        disabled={checkingUpdate}
                    >
                        <View className="w-10 h-10 rounded-xl items-center justify-center mr-4 bg-purple-50">
                            {checkingUpdate ? (
                                <ActivityIndicator size="small" color="#9333ea" />
                            ) : (
                                <RefreshCw size={20} color="#9333ea" />
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-semibold text-gray-800">
                                {checkingUpdate ? 'Verificando...' : 'Buscar Atualizações'}
                            </Text>
                            <Text className="text-xs text-gray-400 mt-0.5">Toque para verificar novidades</Text>
                        </View>
                        <ChevronRight size={20} color="#d1d5db" />
                    </TouchableOpacity>
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
                    <View className="h-px bg-gray-100 ml-16" />
                    <MenuItem
                        icon={QrCode}
                        label="Compartilhar App"
                        subtitle="QR Code para baixar o app"
                        iconColor="#059669"
                        iconBg="#ecfdf5"
                        onPress={() => setShowQRModal(true)}
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

            {/* Informação do App */}
            <View className="px-4 mt-8 opacity-50">
                <View className="bg-gray-100 rounded-2xl p-4 items-center">
                    <Text className="text-gray-500 font-medium">Modo de Acesso Livre Ativado</Text>
                </View>
            </View>

            {/* Versão */}
            <Text className="text-center text-gray-400 text-xs mt-8" style={{ marginBottom: insets.bottom + 100 }}>
                {postoNome} • Canal: {Updates.channel || 'development'}
            </Text>

            {/* Modal QR Code */}
            <Modal
                visible={showQRModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowQRModal(false)}
            >
                <View className="flex-1 bg-black/60 items-center justify-center px-6">
                    <View
                        className="bg-white rounded-3xl p-6 w-full max-w-sm"
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20 }}
                    >
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 bg-green-100 rounded-xl items-center justify-center">
                                    <QrCode size={22} color="#059669" />
                                </View>
                                <View>
                                    <Text className="text-lg font-bold text-gray-800">Compartilhar App</Text>
                                    <Text className="text-xs text-gray-400">Escaneie o QR Code</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowQRModal(false)}
                                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                            >
                                <X size={18} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* QR Code */}
                        <View className="items-center bg-gray-50 rounded-2xl p-6 mb-6">
                            <QRCode
                                value={APK_DOWNLOAD_URL}
                                size={180}
                                color="#1f2937"
                                backgroundColor="transparent"
                            />
                        </View>

                        {/* Instruções */}
                        <View className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
                            <Text className="text-sm text-blue-800 text-center leading-5">
                                📱 Peça para o colega escanear este QR Code com a câmera do celular para baixar o app!
                            </Text>
                        </View>

                        {/* Botões */}
                        <View className="gap-3">
                            <TouchableOpacity
                                className="bg-green-600 py-4 rounded-xl flex-row items-center justify-center gap-2"
                                onPress={handleShareApp}
                                activeOpacity={0.8}
                            >
                                <Share2 size={20} color="#fff" />
                                <Text className="text-white font-bold text-base">Enviar Link</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="bg-gray-100 py-3 rounded-xl"
                                onPress={() => setShowQRModal(false)}
                                activeOpacity={0.7}
                            >
                                <Text className="text-gray-600 font-semibold text-center">Fechar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}
