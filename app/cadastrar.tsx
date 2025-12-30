import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Modal, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { postoService, type Posto } from '../lib/api';
import { router } from 'expo-router';
import { UserPlus, ArrowLeft, User, Phone, FileText, Mail, Lock, Eye, EyeOff, Building2, ChevronDown } from 'lucide-react-native';

export default function SignUp() {
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Postos
    const [postos, setPostos] = useState<Posto[]>([]);
    const [selectedPosto, setSelectedPosto] = useState<Posto | null>(null);
    const [modalPostoVisible, setModalPostoVisible] = useState(false);
    const [loadingPostos, setLoadingPostos] = useState(true);

    useEffect(() => {
        loadPostos();
    }, []);

    const loadPostos = async () => {
        setLoadingPostos(true);
        try {
            const data = await postoService.getAll();
            setPostos(data);
            if (data.length === 1) {
                setSelectedPosto(data[0]); // Auto-seleciona se só tiver 1
            }
        } catch (error) {
            console.error('Erro ao carregar postos:', error);
        } finally {
            setLoadingPostos(false);
        }
    };

    async function handleSignUp() {
        if (!name || !cpf || !email || !password) {
            Alert.alert('Atenção', 'Preencha os campos obrigatórios (Nome, CPF, Email, Senha)');
            return;
        }

        if (!selectedPosto) {
            Alert.alert('Atenção', 'Selecione o posto onde você trabalha');
            return;
        }

        setLoading(true);

        try {
            // 1. Criar usuário no Auth (Passando metadados para o trigger do banco)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nome: name,
                        cpf: cpf,
                        telefone: phone,
                        posto_id: selectedPosto.id
                    }
                }
            });

            if (authError) throw authError;

            if (authData?.user) {
                // NOTA: No Supabase deste projeto, existe um TRIGGER chamado 'on_auth_user_created'
                // que automaticamente cria os registros nas tabelas 'Usuario' e 'Frentista'
                // usando os dados passados em 'raw_user_meta_data'.

                Alert.alert('Sucesso', 'Conta criada com sucesso!', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            // Se o trigger falhar, o Supabase Auth retorna "Database error saving new user"
            Alert.alert('Erro', error.message || 'Ocorreu um erro ao criar a conta');
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 bg-primary-700"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
            >
                {/* Header */}
                <View className="px-6 pt-12 pb-8">
                    <TouchableOpacity onPress={() => router.back()} className="mb-4">
                        <ArrowLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text className="text-white text-3xl font-bold tracking-tight">Criar Conta</Text>
                    <Text className="text-primary-200 text-base mt-2">Cadastre-se para acessar o sistema</Text>
                </View>

                {/* Formulário */}
                <View className="flex-1 bg-white rounded-t-[40px] px-8 pt-6 pb-80">

                    {/* Logo */}
                    <View className="items-center mb-6">
                        <Image
                            source={require('../assets/logo.png')}
                            className="w-32 h-32"
                            resizeMode="contain"
                        />
                    </View>

                    {/* Seleção de Posto */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">Posto *</Text>
                        <TouchableOpacity
                            onPress={() => setModalPostoVisible(true)}
                            className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4"
                            disabled={loadingPostos}
                        >
                            <Building2 size={20} color="#9ca3af" />
                            <Text className={`flex-1 px-3 text-base ${selectedPosto ? 'text-gray-800' : 'text-gray-400'}`}>
                                {loadingPostos ? 'Carregando...' : selectedPosto?.nome || 'Selecione o posto'}
                            </Text>
                            <ChevronDown size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Nome Completo */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">Nome Completo *</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4">
                            <User size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-4 px-3 text-base text-gray-800"
                                placeholder="Seu nome completo"
                                placeholderTextColor="#9ca3af"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    {/* CPF */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">CPF *</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4">
                            <FileText size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-4 px-3 text-base text-gray-800"
                                placeholder="000.000.000-00"
                                placeholderTextColor="#9ca3af"
                                value={cpf}
                                onChangeText={setCpf}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Telefone */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">Telefone</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4">
                            <Phone size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-4 px-3 text-base text-gray-800"
                                placeholder="(00) 00000-0000"
                                placeholderTextColor="#9ca3af"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* E-mail */}
                    <View className="mb-5">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">E-mail *</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4">
                            <Mail size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-4 px-3 text-base text-gray-800"
                                placeholder="seu@email.com"
                                placeholderTextColor="#9ca3af"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    {/* Senha */}
                    <View className="mb-8">
                        <Text className="text-gray-600 font-semibold text-sm mb-2 ml-1">Senha *</Text>
                        <View className="flex-row items-center bg-gray-50 border-2 border-gray-200 rounded-2xl px-4">
                            <Lock size={20} color="#9ca3af" />
                            <TextInput
                                className="flex-1 py-4 px-3 text-base text-gray-800"
                                placeholder="••••••••"
                                placeholderTextColor="#9ca3af"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Botão Cadastrar */}
                    <TouchableOpacity
                        className={`w-full py-4 rounded-2xl items-center flex-row justify-center gap-3 ${loading ? 'bg-primary-400' : 'bg-primary-700'}`}
                        onPress={handleSignUp}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <UserPlus size={22} color="#FFF" />
                                <Text className="text-white font-bold text-lg">Criar Conta</Text>
                            </>
                        )}
                    </TouchableOpacity>

                </View>
            </ScrollView>

            {/* Modal de Seleção de Posto */}
            <Modal
                visible={modalPostoVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalPostoVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl max-h-[70%]">
                        <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
                            <Text className="text-xl font-bold text-gray-800">Selecione o Posto</Text>
                            <TouchableOpacity onPress={() => setModalPostoVisible(false)}>
                                <Text className="text-primary-600 font-semibold">Fechar</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={postos}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className={`p-4 border-b border-gray-100 flex-row items-center gap-3 ${selectedPosto?.id === item.id ? 'bg-primary-50' : ''}`}
                                    onPress={() => {
                                        setSelectedPosto(item);
                                        setModalPostoVisible(false);
                                    }}
                                >
                                    <Building2 size={24} color={selectedPosto?.id === item.id ? '#b91c1c' : '#6b7280'} />
                                    <View className="flex-1">
                                        <Text className={`text-base font-semibold ${selectedPosto?.id === item.id ? 'text-primary-700' : 'text-gray-800'}`}>
                                            {item.nome}
                                        </Text>
                                        {item.cidade && (
                                            <Text className="text-sm text-gray-500">{item.cidade} - {item.estado}</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View className="p-8 items-center">
                                    <Text className="text-gray-500">Nenhum posto cadastrado</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}
