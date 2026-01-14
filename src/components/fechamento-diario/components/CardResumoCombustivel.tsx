/**
 * Componente de Resumo por Combustível
 * 
 * @remarks
 * Exibe uma tabela resumida com litros vendidos e valor por tipo de combustível.
 * Usado na aba "Leituras de Bombas" para visualização rápida dos totais.
 * 
 * Layout baseado na versão de produção (main) para manter consistência de UI.
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

// [14/01 08:38] Criação do componente para restaurar layout da produção (#24)
// Motivo: Separar resumo por combustível em componente dedicado

import React, { useMemo } from 'react';
import { paraReais, parseValue } from '../../../utils/formatters';
import type { Leitura } from '../hooks/useLeituras';
import type { BicoComDetalhes } from '../../../types/fechamento';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Props do componente CardResumoCombustivel
 */
interface CardResumoCombustivelProps {
    /** Mapa de leituras indexado por ID do bico */
    leituras: Record<number, Leitura>;
    /** Lista de bicos com detalhes de combustível */
    bicos: BicoComDetalhes[];
    /** Indica se os dados estão carregando */
    isLoading?: boolean;
}

/**
 * Estrutura de dados agregados por combustível
 */
interface DadosCombustivel {
    /** Nome do combustível para exibição */
    readonly nome: string;
    /** Código único do combustível */
    readonly codigo: string;
    /** Total de litros vendidos */
    litros: number;
    /** Valor total em reais */
    valor: number;
    /** Preço por litro */
    readonly preco: number;
}

/**
 * Cores do badge baseadas no tipo de combustível
 */
interface CoresCombustivel {
    /** Classe de background */
    readonly bg: string;
    /** Classe de borda */
    readonly border: string;
    /** Classe de texto */
    readonly text: string;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Retorna as classes de cor do badge baseado no tipo de combustível
 * 
 * @param nome - Nome do combustível
 * @returns Objeto com classes de bg, border e text
 */
const getCorCombustivel = (nome: string): CoresCombustivel => {
    const nomeLower = nome.toLowerCase();

    if (nomeLower.includes('gasolina') && nomeLower.includes('aditivada')) {
        return { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' };
    }
    if (nomeLower.includes('gasolina')) {
        return { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' };
    }
    if (nomeLower.includes('etanol')) {
        return { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' };
    }
    if (nomeLower.includes('diesel')) {
        return { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400' };
    }

    return { bg: 'bg-slate-500/20', border: 'border-slate-500/30', text: 'text-slate-400' };
};

// ============================================================================
// COMPONENTE
// ============================================================================

/**
 * Componente que exibe resumo de vendas agrupado por tipo de combustível
 * 
 * @param props - Props do componente
 * @returns Tabela com resumo por combustível
 * 
 * @example
 * ```tsx
 * <CardResumoCombustivel
 *   leituras={leituras}
 *   bicos={bicos}
 *   isLoading={false}
 * />
 * ```
 */
export const CardResumoCombustivel: React.FC<CardResumoCombustivelProps> = ({
    leituras,
    bicos,
    isLoading = false
}) => {
    /**
     * Agrupa dados por combustível calculando litros e valores
     */
    const dadosCombustivel = useMemo((): DadosCombustivel[] => {
        const dados: Record<string, DadosCombustivel> = {};

        bicos.forEach(bico => {
            const leitura = leituras[bico.id];
            if (!leitura) return;

            const inicial = parseValue(leitura.inicial);
            const final = parseValue(leitura.fechamento);
            const litros = final > inicial ? final - inicial : 0;

            const codigo = bico.combustivel.codigo;

            if (!dados[codigo]) {
                dados[codigo] = {
                    nome: bico.combustivel.nome,
                    codigo: codigo,
                    litros: 0,
                    valor: 0,
                    preco: bico.combustivel.preco_venda
                };
            }

            dados[codigo].litros += litros;
            dados[codigo].valor += litros * bico.combustivel.preco_venda;
        });

        return Object.values(dados);
    }, [bicos, leituras]);

    /** Total de litros vendidos */
    const totalLitros = useMemo(
        () => dadosCombustivel.reduce((acc, c) => acc + c.litros, 0),
        [dadosCombustivel]
    );

    /** Total em reais */
    const totalValor = useMemo(
        () => dadosCombustivel.reduce((acc, c) => acc + c.valor, 0),
        [dadosCombustivel]
    );

    // --- Render: Loading State ---
    if (isLoading) {
        return (
            <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 p-6 mb-6 animate-pulse">
                <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 bg-slate-700 rounded" />
                    ))}
                </div>
            </div>
        );
    }

    // --- Render: Main ---
    return (
        <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 p-6 mb-6">
            {/* Header */}
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-100">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <span className="text-xl">📊</span>
                </div>
                Resumo por Combustível
            </h2>

            {/* Tabela */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-slate-700/50">
                    <thead className="bg-slate-900/50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Combustível
                            </th>
                            <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Litros (L)
                            </th>
                            <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Valor R$
                            </th>
                            <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                %
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-slate-800 divide-y divide-slate-700/50">
                        {dadosCombustivel.map((combustivel) => {
                            const cores = getCorCombustivel(combustivel.nome);
                            const percentual = totalLitros > 0
                                ? (combustivel.litros / totalLitros) * 100
                                : 0;

                            return (
                                <tr
                                    key={combustivel.codigo}
                                    className="hover:bg-slate-700/30 transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${cores.bg} ${cores.text} border ${cores.border}`}>
                                            {combustivel.nome}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`text-lg font-bold font-mono ${combustivel.litros > 0 ? 'text-blue-400 bg-blue-500/10 px-3 py-1 rounded-md border border-blue-500/20' : 'text-slate-500'}`}>
                                            {combustivel.litros.toLocaleString('pt-BR', {
                                                minimumFractionDigits: 3,
                                                maximumFractionDigits: 3
                                            })} L
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`text-lg font-bold font-mono ${combustivel.valor > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            {paraReais(combustivel.valor)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="text-sm text-slate-400 font-mono">
                                            {percentual.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    <tfoot className="bg-slate-900/50 font-bold border-t border-slate-700/50">
                        <tr>
                            <td className="px-6 py-4 text-slate-400 uppercase tracking-wider text-xs">
                                Total
                            </td>
                            <td className="px-6 py-4 text-center text-blue-400 text-xl font-mono">
                                {totalLitros.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 3,
                                    maximumFractionDigits: 3
                                })} L
                            </td>
                            <td className="px-6 py-4 text-center text-emerald-400 text-xl font-mono">
                                {paraReais(totalValor)}
                            </td>
                            <td className="px-6 py-4 text-center text-slate-400 font-mono">
                                100%
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
