import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { paraReais, parseValue } from '../../../../utils/formatters';
import type { Frentista, SessaoFrentista } from '../../../../types/fechamento';
import type { LinhaDetalhamento } from '../../services/calculosResumo';

/**
 * Propriedades para o componente de Tabela de Resumo.
 */
interface ResumoTabelaProps {
    /** Sessões de frentistas ativas no fechamento */
    sessoes: SessaoFrentista[];
    /** Cadastro de Frentistas */
    frentistas: Frentista[];
    /** Dados processados para a tabela pivô (linhas geradas) */
    tabelaDetalhamento: LinhaDetalhamento[];
    /** Valor total geral de vendas para rodapé */
    totalSessoes: number;
    /** Estado de carregamento para botão de atualizar */
    isLoading?: boolean;
    /** Função de callback para recarregar dados */
    onRefresh?: () => void;
}

/**
 * Componente que renderiza a tabela detalhada de produtividade e arrecadação por frentista.
 * Cruza Meios de Pagamento (linhas) x Frentistas (colunas).
 *
 * @param props ResumoTabelaProps
 * @returns React Component
 */
export const ResumoTabela: React.FC<ResumoTabelaProps> = ({
    sessoes,
    frentistas,
    tabelaDetalhamento,
    totalSessoes,
    isLoading,
    onRefresh
}) => {
    return (
        <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-100">Detalhamento por Frentista</h3>
                    <span className="text-xs font-bold px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                        {sessoes.filter(s => s.frentistaId).length} Ativos
                    </span>
                </div>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="p-2 rounded-lg border border-slate-700/60 bg-slate-900/40 hover:bg-slate-900/70 transition-colors disabled:opacity-50"
                        title="Atualizar"
                    >
                        <RefreshCcw size={16} className="text-slate-300" />
                    </button>
                )}
            </div>
            {sessoes.filter(s => s.frentistaId).length === 0 ? (
                <div className="p-8 text-center text-slate-400">Nenhum envio do mobile para esta data/turno.</div>
            ) : (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-slate-700/50">
                        <thead className="bg-slate-900/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Meio de Pagamento
                                </th>
                                {sessoes.filter(s => s.frentistaId).map((s, idx) => {
                                    const nome = frentistas.find(f => f.id === s.frentistaId)?.nome.split(' ')[0] || 'Frentista';
                                    return (
                                        <th key={idx} scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {nome}
                                        </th>
                                    );
                                })}
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-100 uppercase tracking-wider bg-slate-900">
                                    Total Caixa
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700/50">
                            {tabelaDetalhamento.map((linha, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700/20'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-300 flex items-center">
                                        {linha.meio}
                                    </td>
                                    {sessoes.filter(s => s.frentistaId).map((s, colIdx) => {
                                        const valor = linha[s.tempId];
                                        return (
                                            <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-right font-mono">
                                                {typeof valor === 'number' && valor > 0 ? paraReais(valor) : <span className="text-slate-600">-</span>}
                                            </td>
                                        );
                                    })}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-100 text-right bg-slate-700/30 font-mono">
                                        {paraReais(linha.total as number)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {/* Linha de Totais Gerais */}
                        <tfoot className="bg-slate-900 font-bold border-t border-slate-700">
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">Total Geral</td>
                                {sessoes.filter(s => s.frentistaId).map((s, idx) => {
                                    const totalFrentista =
                                        parseValue(s.valor_dinheiro) +
                                        parseValue(s.valor_cartao_debito) +
                                        parseValue(s.valor_cartao) +
                                        parseValue(s.valor_cartao_credito) +
                                        parseValue(s.valor_pix) +
                                        parseValue(s.valor_nota) +
                                        parseValue(s.valor_baratao);
                                    return (
                                        <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-right text-emerald-400">
                                            {paraReais(totalFrentista)}
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-100 bg-slate-800 border-l border-slate-700">
                                    {paraReais(totalSessoes)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};
