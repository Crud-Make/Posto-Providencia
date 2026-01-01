import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { Fuel, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react-native';

export default function Login() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true); // New state for initial check
    const [showPassword, setShowPassword] = useState(false);

    // Check for existing session on mount
    useEffect(() => {
        checkSession();
    }, []);

    async function checkSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Determine redirect based on user role/data if needed, for now go to tabs
                router.replace('/(tabs)/voucher');
            }
        } catch (error) {
            console.error('Error checking session:', error);
        } finally {
            setVerifying(false);
        }
    }

    async function ensureUserRecords(userId: string, userEmail: string, userName?: string) {
        try {
            // 1. Check/Create Usuario (Public Table)
            const { data: usuario, error: userError } = await supabase
                .from('Usuario')
                .select('id')
                .eq('email', userEmail)
                .single();

            if (!usuario) {
                const { error: insertUserError } = await supabase
                    .from('Usuario')
                    .insert({
                        email: userEmail,
                        nome: userName || userEmail.split('@')[0],
                        role: 'FRENTISTA',
                        ativo: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                if (insertUserError) {
                    console.error('Error creating Usuario:', insertUserError);
                }
            }

            // 2. Check/Create Frentista
            const { data: frentista, error: frentistaError } = await supabase
                .from('Frentista')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (!frentista) {
                // Create minimal Frentista record
                const { error: insertFrentistaError } = await supabase
                    .from('Frentista')
                    .insert({
                        nome: userName || userEmail.split('@')[0],
                        cpf: '000.000.000-00', // Placeholder
                        data_admissao: new Date().toISOString(),
                        ativo: true,
                        user_id: userId,
                        posto_id: 1 // Default to Posto Providencia (ID 1)
                    });

                if (insertFrentistaError) {
                    console.error('Error creating Frentista:', insertFrentistaError);
                    throw new Error('Falha ao criar perfil de frentista.');
                }
            }

            return true;

        } catch (error) {
            console.error('Error in ensureUserRecords:', error);
            return false;
        }
    }

    async function handleAuth() {
        if (!email || !password || (mode === 'register' && !fullName)) {
            Alert.alert('Atenção', 'Preencha todos os campos');
            return;
        }

        setLoading(true);

        try {
            if (mode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.session?.user) {
                    // Self-healing: Ensure records exist
                    await ensureUserRecords(data.session.user.id, data.session.user.email!, fullName);
                    router.replace('/(tabs)/registro');
                }

            } else {
                // Register
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            nome: fullName,
                        }
                    }
                });

                if (error) throw error;

                if (data.user) {
                    // Create records explicitly
                    // Note: Supabase might not return session immediately if e-mail confirmation is on, 
                    // but for dev it usually does.
                    const success = await ensureUserRecords(data.user.id, email, fullName);

                    if (success) {
                        Alert.alert('Sucesso', 'Conta criada com sucesso! Fazendo login...');
                        if (data.session) {
                            router.replace('/(tabs)/registro');
                        } else {
                            setMode('login');
                        }
                    } else {
                        Alert.alert('Aviso', 'Conta criada, mas houve um erro ao configurar o perfil. Tente fazer login.');
                        setMode('login');
                    }
                }
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Ocorreu um erro inesperado');
        } finally {
            setLoading(false);
        }
    }

    if (verifying) {
        return (
            <View className="flex-1 bg-primary-700 items-center justify-center">
                <ActivityIndicator size="large" color="#fff" />
                <Text className="text-white mt-4 font-bold">Verificando conta...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-primary-700"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header com Logo */}
                <View className="items-center pt-16 pb-8">
                    <View className="w-24 h-24 bg-white rounded-full items-center justify-center shadow-2xl mb-6">
                        <Fuel size={48} color="#b91c1c" strokeWidth={2} />
                    </View>
                    <Text className="text-white text-3xl font-bold tracking-tight">Posto Providência</Text>
                    <Text className="text-primary-200 text-base mt-2">App do Frentista</Text>
                </View>

                {/* Card de Login/Registro */}
                <View className="flex-1 bg-white rounded-t-[40px] px-8 pt-10 pb-12">
                    <Text className="text-2xl font-bold text-gray-800 mb-2">
                        {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                    </Text>
                    <Text className="text-gray-500 mb-8">
                        {mode === 'login'
                            ? 'Acesse sua conta para registrar o turno'
                            : 'Preencha os dados para começar'}
                    </Text>

                    {/* Campo Nome (apenas registro) */}
                    {mode === 'register' && (
                        <View className="mb-5">
                            <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">Nome Completo</Text>
                            <TextInput
                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-4 text-base text-gray-800"
                                placeholder="Seu nome"
                                placeholderTextColor="#9ca3af"
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>
                    )}

                    {/* Campo E-mail */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">E-mail</Text>
                        <TextInput
                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-4 text-base text-gray-800"
                            placeholder="seu@email.com"
                            placeholderTextColor="#9ca3af"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                        />
                    </View>

                    {/* Campo Senha */}
                    <View className="mb-8">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">Senha</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl">
                            <TextInput
                                className="flex-1 px-5 py-4 text-base text-gray-800"
                                placeholder="••••••••"
                                placeholderTextColor="#9ca3af"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                            />
                            <TouchableOpacity
                                className="px-4"
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff size={24} color="#6b7280" />
                                ) : (
                                    <Eye size={24} color="#6b7280" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Botão Principal */}
                    <TouchableOpacity
                        className={`w-full py-4 rounded-2xl items-center flex-row justify-center gap-3 ${loading ? 'bg-primary-400' : 'bg-primary-700'}`}
                        onPress={handleAuth}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                {mode === 'login' ? <LogIn size={22} color="#FFF" /> : <UserPlus size={22} color="#FFF" />}
                                <Text className="text-white font-bold text-lg">
                                    {mode === 'login' ? 'Entrar' : 'Cadastrar'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Toggle entre Login e Registro */}
                    <TouchableOpacity
                        className="mt-6 items-center"
                        onPress={() => {
                            setMode(mode === 'login' ? 'register' : 'login');
                        }}
                    >
                        <Text className="text-gray-600">
                            {mode === 'login' ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
                            <Text className="text-primary-700 font-bold">
                                {mode === 'login' ? 'Cadastre-se' : 'Faça login'}
                            </Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Link de ajuda (apenas login) */}
                    {mode === 'login' && (
                        <TouchableOpacity className="mt-4 items-center">
                            <Text className="text-primary-600 font-medium">Esqueceu a senha?</Text>
                        </TouchableOpacity>
                    )}

                    {/* Versão */}
                    <Text className="text-center text-gray-400 text-xs mt-8">
                        Versão 1.0.1 • Posto Providência
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
