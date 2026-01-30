import { View, Text } from 'react-native';
import { Calculator, Check, AlertTriangle } from 'lucide-react-native';
import { formatCurrency, parseValue } from '../../lib/utils';
import type { RegistroTurno, NotaItem } from './types';

/**
 * Props para o componente ResumoCard.
 */
interface ResumoCardProps {
    /** Valor total do encerrante (já parseado como number) */
    valorEncerrante: number;
    /** Soma total dos pagamentos informados */
    totalInformado: number;
    /** Objeto com os valores dos inputs de registro */
    registro: RegistroTurno;
    /** Total somado das notas/vales */
    totalNotas: number;
    /** Lista de notas adicionadas (para contagem) */
    notasAdicionadas: NotaItem[];
    /** Diferença calculada (Encerrante - Total) */
    diferencaCaixa: number;
    /** Indica se há falta de caixa */
    temFalta: boolean;
    /** Indica se há sobra de caixa */
    temSobra: boolean;
    /** Indica se o caixa bateu (diferença zero) */
    caixaBateu: boolean;
}

/**
 * Componente que exibe o resumo financeiro do fechamento.
 * Mostra o detalhamento dos pagamentos e o status do caixa (Bateu/Falta/Sobra).
 *
 * @param {ResumoCardProps} props - Propriedades do componente.
 * @returns {JSX.Element} O componente renderizado.
 */
export function ResumoCard({
    valorEncerrante,
    totalInformado,
    registro,
    totalNotas,
    notasAdicionadas,
    diferencaCaixa,
    temFalta,
    temSobra,
    caixaBateu
}: ResumoCardProps) {
    return (
        <View className="px-4 mt-6">
            <View
                className="bg-white rounded-3xl border border-gray-100 overflow-hidden"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}
            >
                <View className="bg-gray-50 px-5 py-4 border-b border-gray-100">
                    <View className="flex-row items-center gap-2">
                        <Calculator size={20} color="#6b7280" />
                        <Text className="text-base font-bold text-gray-700">Resumo do Turno</Text>
                    </View>
                </View>

                <View className="p-5">
                    {/* Encerrante */}
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-gray-500">Encerrante</Text>
                        <Text className="text-lg font-bold text-purple-700">{formatCurrency(valorEncerrante)}</Text>
                    </View>

                    {/* Total Pagamentos */}
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-gray-500">Total Pagamentos</Text>
                        <Text className="text-lg font-bold text-gray-800">{formatCurrency(totalInformado)}</Text>
                    </View>

                    {/* Detalhamento de Pagamentos */}
                    <View className="pl-2 border-l-2 border-gray-100 mb-3">
                        {parseValue(registro.valorCartaoDebito) > 0 && (
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-gray-400 text-xs">Cartão Débito</Text>
                                <Text className="text-xs font-medium text-gray-600">{formatCurrency(parseValue(registro.valorCartaoDebito))}</Text>
                            </View>
                        )}
                        {parseValue(registro.valorCartaoCredito) > 0 && (
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-gray-400 text-xs">Cartão Crédito</Text>
                                <Text className="text-xs font-medium text-gray-600">{formatCurrency(parseValue(registro.valorCartaoCredito))}</Text>
                            </View>
                        )}
                        {totalNotas > 0 && (
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-gray-400 text-xs">Notas/Vales ({notasAdicionadas.length})</Text>
                                <Text className="text-xs font-medium text-gray-600">{formatCurrency(totalNotas)}</Text>
                            </View>
                        )}
                        {parseValue(registro.valorPix) > 0 && (
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-gray-400 text-xs">PIX</Text>
                                <Text className="text-xs font-medium text-gray-600">{formatCurrency(parseValue(registro.valorPix))}</Text>
                            </View>
                        )}
                        {parseValue(registro.valorDinheiro) > 0 && (
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-gray-400 text-xs">Dinheiro</Text>
                                <Text className="text-xs font-medium text-gray-600">{formatCurrency(parseValue(registro.valorDinheiro))}</Text>
                            </View>
                        )}
                        {parseValue(registro.valorMoedas) > 0 && (
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-gray-400 text-xs">Moedas</Text>
                                <Text className="text-xs font-medium text-gray-600">{formatCurrency(parseValue(registro.valorMoedas))}</Text>
                            </View>
                        )}
                        {parseValue(registro.valorBaratao) > 0 && (
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-gray-400 text-xs">Baratão</Text>
                                <Text className="text-xs font-medium text-gray-600">{formatCurrency(parseValue(registro.valorBaratao))}</Text>
                            </View>
                        )}

                    </View>

                    {/* Status da Diferença */}
                    <View className="border-t border-dashed border-gray-200 pt-3 mt-2">
                        {caixaBateu && (
                            <View className="flex-row justify-between items-center py-2 px-3 bg-green-50 rounded-lg -mx-1">
                                <View className="flex-row items-center gap-2">
                                    <Check size={18} color="#16a34a" />
                                    <Text className="text-green-700 font-bold">Caixa Bateu!</Text>
                                </View>
                                <Text className="text-lg font-black text-green-600">✓</Text>
                            </View>
                        )}

                        {temFalta && (
                            <View className="flex-row justify-between items-center py-2 px-3 bg-red-50 rounded-lg -mx-1">
                                <View className="flex-row items-center gap-2">
                                    <AlertTriangle size={18} color="#dc2626" />
                                    <Text className="text-red-600 font-bold">Falta de Caixa</Text>
                                </View>
                                <Text className="text-lg font-black text-red-600">- {formatCurrency(diferencaCaixa)}</Text>
                            </View>
                        )}

                        {temSobra && (
                            <View className="flex-row justify-between items-center py-2 px-3 bg-yellow-50 rounded-lg -mx-1">
                                <View className="flex-row items-center gap-2">
                                    <AlertTriangle size={18} color="#ca8a04" />
                                    <Text className="text-yellow-700 font-bold">Sobra de Caixa</Text>
                                </View>
                                <Text className="text-lg font-black text-yellow-600">+ {formatCurrency(Math.abs(diferencaCaixa))}</Text>
                            </View>
                        )}

                        {valorEncerrante === 0 && (
                            <View className="flex-row items-center gap-2 py-2">
                                <Text className="text-gray-400 text-sm">Informe o encerrante para ver o status</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
}
