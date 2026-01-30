// [18/01 17:50] Refatoração completa: extração de componentes e JSDoc
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { submitMobileClosing, type SubmitClosingData } from '../../services/fechamento';
import { turnoService, type Turno } from '../../services/turno';
import { frentistaService, type Frentista } from '../../services/frentista';
import { clienteService, type Cliente } from '../../services/cliente';
import { usePosto } from '../../lib/PostoContext';
import { Send, X } from 'lucide-react-native';

// Utilitários e Tipos Compartilhados
import { formatCurrency, parseValue, formatCurrencyInput, formatDateDisplay, formatDateForDB } from '../../lib/utils';
import type { RegistroTurno, NotaItem } from '../../components/registro/types';

// Novos Componentes Extraídos
import { HeaderCard } from '../../components/registro/HeaderCard';
import { DataFechamentoCard } from '../../components/registro/DataFechamentoCard';
import { EncerranteCard } from '../../components/registro/EncerranteCard';
import { FormasPagamentoList } from '../../components/registro/FormasPagamentoList';
import { NotasListCard } from '../../components/registro/NotasListCard';
import { ResumoCard } from '../../components/registro/ResumoCard';
import { NotaModal } from '../../components/registro/NotaModal';
import { FrentistaModal } from '../../components/registro/FrentistaModal';

export default function RegistroScreen() {
    const insets = useSafeAreaInsets();
    const { postoAtivo, postoAtivoId } = usePosto();

    // Estados principais - Modo Plataforma Universal v1.4.0
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userName, setUserName] = useState('Frentista');
    const [turnoId, setTurnoId] = useState<number | null>(null);
    const [frentistas, setFrentistas] = useState<Frentista[]>([]);
    const [frentistaId, setFrentistaId] = useState<number | null>(null);
    const [modalFrentistaVisible, setModalFrentistaVisible] = useState(false);
    const [frentistasQueFecharam, setFrentistasQueFecharam] = useState<number[]>([]);

    const [registro, setRegistro] = useState<RegistroTurno>({
        valorEncerrante: '',
        valorCartaoDebito: '',
        valorCartaoCredito: '',
        valorPix: '',
        valorDinheiro: '',
        valorMoedas: '',
        valorBaratao: '',
        observacoes: '',
    });

    const [notasAdicionadas, setNotasAdicionadas] = useState<NotaItem[]>([]);
    const [modalNotaVisible, setModalNotaVisible] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [valorNotaTemp, setValorNotaTemp] = useState('');
    const [buscaCliente, setBuscaCliente] = useState('');

    // Estados para Data de Fechamento
    const [dataFechamento, setDataFechamento] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [modalDataVisible, setModalDataVisible] = useState(false);

    /**
     * Handler para mudança de data no DatePicker
     */
    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios'); // No iOS mantém aberto, no Android fecha
        if (selectedDate) {
            setDataFechamento(selectedDate);
        }
    };

    // Função para limpar formulário ao trocar de frentista (Modo Dispositivo Compartilhado)
    const resetFormulario = () => {
        setRegistro({
            valorEncerrante: '',
            valorCartaoDebito: '',
            valorCartaoCredito: '',
            valorPix: '',
            valorDinheiro: '',
            valorMoedas: '',
            valorBaratao: '',
            observacoes: '',
        });
        setNotasAdicionadas([]);
    };

    const handleChange = (field: keyof RegistroTurno, value: string) => {
        if (field === 'observacoes') {
            setRegistro(prev => ({ ...prev, [field]: value }));
            return;
        }
        const formatted = formatCurrencyInput(value);
        setRegistro(prev => ({ ...prev, [field]: formatted }));
    };

    // Cálculos
    const valorEncerrante = parseValue(registro.valorEncerrante);
    const totalCartao = parseValue(registro.valorCartaoDebito) + parseValue(registro.valorCartaoCredito);
    const totalNotas = notasAdicionadas.reduce((acc, current) => acc + current.valor_number, 0);
    const totalMoedas = parseValue(registro.valorMoedas);
    const totalBaratao = parseValue(registro.valorBaratao);
    const totalInformado = totalCartao + totalNotas + parseValue(registro.valorPix) + parseValue(registro.valorDinheiro) + totalMoedas + totalBaratao;
    const diferencaCaixa = valorEncerrante - totalInformado;
    const temFalta = diferencaCaixa > 0;
    const temSobra = diferencaCaixa < 0;
    const caixaBateu = diferencaCaixa === 0 && valorEncerrante > 0;

    // Carregar dados (User, Turnos, Clientes)
    useEffect(() => {
        async function loadFrentistasQueFecharam(turnoIdParam: number) {
            if (!postoAtivoId || !turnoIdParam) return;

            try {
                const hoje = new Date().toISOString().split('T')[0];

                // Buscar fechamentos do turno atual
                const { data, error } = await supabase
                    .from('FechamentoFrentista')
                    .select(`
                        frentista_id,
                        fechamento_id,
                        Fechamento!inner(data, turno_id)
                    `)
                    .eq('Fechamento.data', hoje)
                    .eq('Fechamento.turno_id', turnoIdParam)
                    .eq('posto_id', postoAtivoId);

                if (error) {
                    console.error('Erro ao buscar fechamentos:', error);
                    return;
                }

                const frentistaIds = data?.map(f => f.frentista_id) || [];
                setFrentistasQueFecharam(frentistaIds);
            } catch (error) {
                console.error('Erro ao carregar frentistas que fecharam:', error);
            }
        }

        /**
         * loadAllData - Carrega todos os dados necessários para a tela
         * REFATORADO v1.4.0: Modo Universal sem verificação de admin
         */
        async function loadAllData() {
            if (!postoAtivoId) return;

            setLoading(true);
            try {
                // Carregar Turnos, Clientes e Frentistas em paralelo
                const [turnosData, clientesData, turnoAuto, frentistasData] = await Promise.all([
                    turnoService.getAll(postoAtivoId),
                    clienteService.getAll(postoAtivoId),
                    turnoService.getCurrentTurno(postoAtivoId),
                    frentistaService.getAllByPosto(postoAtivoId)
                ]);

                setTurnos(turnosData);
                setClientes(clientesData);
                setFrentistas(frentistasData);

                // Determinar turno automaticamente (Modo Diário)
                let turnoIdFinal = null;

                if (turnoAuto) {
                    // Usa o turno automático baseado na hora atual
                    setTurnoId(turnoAuto.id);
                    turnoIdFinal = turnoAuto.id;
                } else if (turnosData.length > 0) {
                    // Fallback: primeiro turno disponível
                    setTurnoId(turnosData[0].id);
                    turnoIdFinal = turnosData[0].id;
                }

                // Carregar frentistas que já fecharam hoje
                if (turnoIdFinal) {
                    await loadFrentistasQueFecharam(turnoIdFinal);
                }
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
            } finally {
                setLoading(false);
            }
        }

        loadAllData();

        // Realtime para Turnos, Fechamentos e FechamentoFrentista
        const subscription = supabase
            .channel('turnos_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Turno' }, () => loadAllData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Fechamento' }, () => loadAllData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'FechamentoFrentista' }, () => {
                if (turnoId) loadFrentistasQueFecharam(turnoId);
            })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [postoAtivoId]);

    const handleAddNota = () => {
        if (!selectedCliente || !valorNotaTemp) {
            Alert.alert('Atenção', 'Selecione um cliente e informe o valor');
            return;
        }

        // Verificar se o cliente está bloqueado
        if (selectedCliente.bloqueado) {
            Alert.alert(
                'Cliente Bloqueado',
                `O cliente ${selectedCliente.nome} está bloqueado e não pode realizar novas compras a prazo. Entre em contato com a administração.`,
                [{ text: 'OK' }]
            );
            return;
        }

        const valorNumber = parseValue(valorNotaTemp);
        if (valorNumber <= 0) {
            Alert.alert('Atenção', 'O valor deve ser maior que zero');
            return;
        }

        const novaNota: NotaItem = {
            cliente_id: selectedCliente.id,
            cliente_nome: selectedCliente.nome,
            valor: valorNotaTemp,
            valor_number: valorNumber
        };

        setNotasAdicionadas(prev => [...prev, novaNota]);
        setModalNotaVisible(false);
        setSelectedCliente(null);
        setValorNotaTemp('');
    };

    const handleRemoveNota = (index: number) => {
        setNotasAdicionadas(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (valorEncerrante === 0) {
            Alert.alert('Atenção', 'Informe o valor do encerrante');
            return;
        }

        if (totalInformado === 0) {
            Alert.alert('Atenção', 'Preencha pelo menos um valor de pagamento');
            return;
        }

        if (!turnoId) {
            // Tentativa de recuperação de emergência
            setLoading(true);
            try {
                const retryTurno = await turnoService.getCurrentTurno(postoAtivoId!);
                if (retryTurno) {
                    setTurnoId(retryTurno.id);
                } else {
                    Alert.alert(
                        'Erro de Configuração',
                        `Não foi possível identificar o turno para o posto (ID: ${postoAtivoId}).\n\nVerifique se os turnos estão ativos no painel administrativo.`
                    );
                    setLoading(false);
                    return;
                }
            } catch (e) {
                Alert.alert('Erro Crítico', 'Falha na comunicação com o servidor ao buscar turnos.');
                setLoading(false);
                return;
            }
        }

        // Montar mensagem de confirmação
        let mensagemConfirmacao = `Data: ${formatDateDisplay(dataFechamento)}\nEncerrante: ${formatCurrency(valorEncerrante)}\nTotal Pagamentos: ${formatCurrency(totalInformado)}`;

        if (caixaBateu) {
            mensagemConfirmacao += '\n\n✅ Caixa bateu!';
        } else if (temFalta) {
            mensagemConfirmacao += `\n\n❌ Falta: ${formatCurrency(diferencaCaixa)}`;
        } else if (temSobra) {
            mensagemConfirmacao += `\n\n⚠️ Sobra: ${formatCurrency(Math.abs(diferencaCaixa))}`;
        }

        Alert.alert(
            'Confirmar Envio',
            mensagemConfirmacao,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            // Preparar dados para envio - USANDO DATA SELECIONADA
                            const closingData: SubmitClosingData = {
                                data: formatDateForDB(dataFechamento),
                                turno_id: turnoId!,
                                valor_cartao_debito: parseValue(registro.valorCartaoDebito),
                                valor_cartao_credito: parseValue(registro.valorCartaoCredito),
                                valor_nota: totalNotas,
                                valor_pix: parseValue(registro.valorPix),
                                valor_dinheiro: parseValue(registro.valorDinheiro),
                                valor_moedas: parseValue(registro.valorMoedas),
                                valor_baratao: parseValue(registro.valorBaratao),
                                valor_encerrante: valorEncerrante,
                                falta_caixa: temFalta ? diferencaCaixa : 0,
                                observacoes: registro.observacoes,
                                posto_id: postoAtivoId!,
                                frentista_id: frentistaId || undefined,
                                notas: notasAdicionadas.map(n => ({
                                    cliente_id: n.cliente_id,
                                    valor: n.valor_number
                                }))
                            };

                            const result = await submitMobileClosing(closingData);

                            if (result.success) {
                                Alert.alert(
                                    '✅ Enviado!',
                                    result.message,
                                    [{
                                        text: 'OK',
                                        onPress: () => {
                                            // Limpar formulário
                                            setRegistro({
                                                valorEncerrante: '',
                                                valorCartaoDebito: '',
                                                valorCartaoCredito: '',
                                                valorPix: '',
                                                valorDinheiro: '',
                                                valorMoedas: '',
                                                valorBaratao: '',
                                                observacoes: '',
                                            });
                                            setNotasAdicionadas([]);
                                        }
                                    }]
                                );
                            } else {
                                Alert.alert('❌ Erro', result.message);
                            }
                        } catch (error) {
                            console.error('Error submitting closing:', error);
                            Alert.alert(
                                'Erro',
                                'Não foi possível enviar o registro. Verifique sua conexão e tente novamente.'
                            );
                        } finally {
                            setSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-gray-50 dark:bg-slate-950"
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: insets.bottom + 180 }}
                showsVerticalScrollIndicator={false}
            >
                <HeaderCard
                    frentistaId={frentistaId}
                    userName={userName}
                    postoNome={postoAtivo?.nome || 'Posto Providência'}
                    onPressSelect={() => setModalFrentistaVisible(true)}
                />

                <DataFechamentoCard
                    data={dataFechamento}
                    onPressChange={() => {
                        if (Platform.OS === 'android') {
                            setShowDatePicker(true);
                        } else {
                            setModalDataVisible(true);
                        }
                    }}
                />

                <FrentistaModal
                    visible={modalFrentistaVisible}
                    onClose={() => setModalFrentistaVisible(false)}
                    frentistas={frentistas}
                    frentistaId={frentistaId}
                    frentistasQueFecharam={frentistasQueFecharam}
                    onSelect={(id, nome) => {
                        if (id !== frentistaId) resetFormulario();
                        setFrentistaId(id);
                        setUserName(nome);
                        setModalFrentistaVisible(false);
                    }}
                />

                <EncerranteCard
                    value={registro.valorEncerrante}
                    onChangeText={(text) => handleChange('valorEncerrante', text)}
                />

                <FormasPagamentoList
                    registro={registro}
                    onChange={handleChange}
                />

                <NotasListCard
                    notasAdicionadas={notasAdicionadas}
                    totalNotas={totalNotas}
                    onAddPress={() => setModalNotaVisible(true)}
                    onRemoveNota={handleRemoveNota}
                />

                <ResumoCard
                    valorEncerrante={valorEncerrante}
                    totalInformado={totalInformado}
                    registro={registro}
                    totalNotas={totalNotas}
                    notasAdicionadas={notasAdicionadas}
                    diferencaCaixa={diferencaCaixa}
                    temFalta={temFalta}
                    temSobra={temSobra}
                    caixaBateu={caixaBateu}
                />

                {/* Botão Enviar */}
                <View className="px-4 mt-8" style={{ marginBottom: insets.bottom + 40 }}>
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

            <NotaModal
                visible={modalNotaVisible}
                onClose={() => setModalNotaVisible(false)}
                clientes={clientes}
                selectedCliente={selectedCliente}
                setSelectedCliente={setSelectedCliente}
                valorNotaTemp={valorNotaTemp}
                setValorNotaTemp={setValorNotaTemp}
                buscaCliente={buscaCliente}
                setBuscaCliente={setBuscaCliente}
                onAddNota={handleAddNota}
                insets={insets}
            />

            {/* DatePicker para Android */}
            {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={dataFechamento}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                />
            )}

            {/* Modal com DatePicker para iOS */}
            <Modal
                visible={modalDataVisible && Platform.OS === 'ios'}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalDataVisible(false)}
            >
                <View className="flex-1 bg-black/60 justify-end">
                    <TouchableOpacity
                        className="absolute inset-0"
                        onPress={() => setModalDataVisible(false)}
                    />
                    <View className="bg-white rounded-t-[32px] p-6 shadow-2xl">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-2xl font-black text-gray-800">Selecionar Data</Text>
                            <TouchableOpacity
                                onPress={() => setModalDataVisible(false)}
                                className="bg-gray-100 p-2 rounded-full"
                            >
                                <X size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <DateTimePicker
                            value={dataFechamento}
                            mode="date"
                            display="spinner"
                            onChange={handleDateChange}
                            maximumDate={new Date()}
                            textColor="#000"
                        />

                        <TouchableOpacity
                            onPress={() => setModalDataVisible(false)}
                            className="mt-4 bg-blue-600 py-4 rounded-2xl"
                        >
                            <Text className="text-white font-bold text-center text-lg">Confirmar</Text>
                        </TouchableOpacity>
                        <View style={{ height: insets.bottom + 10 }} />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView >
    );
}
