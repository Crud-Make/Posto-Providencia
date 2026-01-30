import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { turnoService, type Turno } from '../services/turno';
import { frentistaService, type Frentista } from '../services/frentista';
import { Clock, Check, LogOut } from 'lucide-react-native';

/**
 * Tela de Abertura de Caixa.
 * Permite que o frentista selecione o turno atual e inicie as operações.
 * Verifica o frentista logado e lista os turnos disponíveis para o posto.
 * 
 * @component
 * @returns {JSX.Element} O componente da tela de abertura de caixa.
 */
export default function AberturaCaixaScreen() {
    const insets = useSafeAreaInsets();
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [turnos, setTurnos] = useState<Turno[]>([]);
    const [selectedTurnoId, setSelectedTurnoId] = useState<number | null>(null);
	const [frentista, setFrentista] = useState<Frentista | null>(null);

    /**
     * Efeito inicial para carregar dados do frentista e turnos.
     */
    useEffect(() => {
        loadData();
    }, []);

    /**
     * Carrega os dados do frentista logado e os turnos do posto.
     * Redireciona para login se não houver usuário.
     */
    async function loadData() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/');
                return;
            }

            const frentistaData = await frentistaService.getByUserId(user.id);
            if (!frentistaData) {
                Alert.alert('Erro', 'Frentista não encontrado.');
                router.replace('/');
                return;
            }
            setFrentista(frentistaData);

            // Carregar turnos do posto do frentista
            if (frentistaData.posto_id) {
                const turnosData = await turnoService.getAll(frentistaData.posto_id);
                setTurnos(turnosData);
            }

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            Alert.alert('Erro', 'Falha ao carregar informações');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Processa a abertura do caixa para o turno selecionado.
     * Chama a procedure RPC 'abrir_caixa' no Supabase.
     */
    async function handleAbrirCaixa() {
        if (!selectedTurnoId) {
            Alert.alert('Atenção', 'Selecione um turno para iniciar.');
            return;
        }

        if (!frentista?.posto_id) {
            Alert.alert('Erro', 'Posto não identificado.');
            return;
        }

        setSubmitting(true);
        try {
            const { data, error } = await supabase.rpc('abrir_caixa', {
                p_turno_id: selectedTurnoId,
                p_posto_id: frentista.posto_id,
                p_frentista_id: frentista.id
            });

            if (error) throw error;

            // Sucesso! Redirecionar para o app principal
            router.replace('/(tabs)/registro');
		} catch (error) {
			console.error('Erro ao abrir caixa:', error);
			const message = error instanceof Error ? error.message : 'Falha ao iniciar turno';
			Alert.alert('Erro', 'Falha ao iniciar turno: ' + message);
        } finally {
            setSubmitting(false);
        }
    }

    /**
     * Realiza o logout do usuário.
     */
    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace('/');
    }

    if (loading) {
        return (
            <View className="flex-1 bg-primary-700 items-center justify-center">
                <ActivityIndicator size="large" color="#FFF" />
                <Text className="text-white mt-4 font-medium">Preparando sistema...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-primary-700 px-6 pt-12 pb-8 rounded-b-[40px] shadow-lg">
                <View className="flex-row justify-between items-center mb-6" style={{ paddingTop: insets.top }}>
                    <View>
                        <Text className="text-primary-100 text-lg">Olá, {frentista?.nome?.split(' ')[0]}</Text>
                        <Text className="text-white text-3xl font-bold">Iniciar Turno</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleLogout}
                        className="bg-primary-600 p-3 rounded-full"
                    >
                        <LogOut size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <Text className="text-primary-100 opacity-80 leading-5">
                    Selecione o turno atual para registrar sua entrada e liberar o caixa.
                </Text>
            </View>

            {/* Content */}
            <View className="flex-1 px-6 pt-8">
                <Text className="text-gray-800 font-bold text-lg mb-4">Qual é o seu turno hoje?</Text>

                <View className="gap-4">
                    {turnos.map((turno) => {
                        const isSelected = selectedTurnoId === turno.id;
                        return (
                            <TouchableOpacity
                                key={turno.id}
                                onPress={() => setSelectedTurnoId(turno.id)}
                                activeOpacity={0.7}
                                className={`flex-row items-center p-5 rounded-2xl border-2 transition-all ${isSelected
                                        ? 'bg-primary-50 border-primary-600 shadow-sm'
                                        : 'bg-white border-transparent shadow-sm'
                                    }`}
                            >
                                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${isSelected ? 'bg-primary-600' : 'bg-gray-100'
                                    }`}>
                                    <Clock size={24} color={isSelected ? '#FFF' : '#6b7280'} />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-lg font-bold ${isSelected ? 'text-primary-900' : 'text-gray-700'
                                        }`}>
                                        {turno.nome}
                                    </Text>
                                    <Text className="text-gray-500 text-sm">
                                        Clique para selecionar
                                    </Text>
                                </View>
                                {isSelected && (
                                    <View className="bg-primary-600 rounded-full p-1">
                                        <Check size={16} color="#FFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Footer Button */}
            <View className="p-6 bg-white border-t border-gray-100 shadow-lg pb-10">
                <TouchableOpacity
                    onPress={handleAbrirCaixa}
                    disabled={submitting || !selectedTurnoId}
                    className={`w-full py-4 rounded-2xl items-center justify-center shadow-md ${selectedTurnoId ? 'bg-primary-700' : 'bg-gray-300'
                        }`}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text className="text-white font-bold text-xl">
                            Abrir Caixa
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
