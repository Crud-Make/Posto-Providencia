import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { Fuel, Eye, EyeOff, LogIn } from 'lucide-react-native';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function signInWithEmail() {
        if (!email || !password) {
            Alert.alert('Atenção', 'Preencha todos os campos');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            Alert.alert('Erro', error.message);
        } else {
            router.replace('/(tabs)/registro');
        }
        setLoading(false);
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

                {/* Card de Login */}
                <View className="flex-1 bg-white rounded-t-[40px] px-8 pt-10 pb-12">
                    <Text className="text-2xl font-bold text-gray-800 mb-2">Entrar</Text>
                    <Text className="text-gray-500 mb-8">Acesse sua conta para registrar o turno</Text>

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

                    {/* Botão Entrar */}
                    <TouchableOpacity
                        className={`w-full py-4 rounded-2xl items-center flex-row justify-center gap-3 ${loading ? 'bg-primary-400' : 'bg-primary-700'}`}
                        onPress={signInWithEmail}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <LogIn size={22} color="#FFF" />
                                <Text className="text-white font-bold text-lg">Entrar</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Link de ajuda */}
                    <TouchableOpacity className="mt-6 items-center">
                        <Text className="text-primary-600 font-medium">Esqueceu a senha?</Text>
                    </TouchableOpacity>

                    {/* Versão */}
                    <Text className="text-center text-gray-400 text-xs mt-8">
                        Versão 1.0.0 • Posto Providência
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
