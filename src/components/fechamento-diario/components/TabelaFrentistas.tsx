import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { SessaoFrentista } from '../../../types/fechamento';
import { Frentista } from '../../../types/database/index';
import { paraReais, parseValue } from '../../../utils/formatters';

interface SecaoSessoesFrentistasProps {
  sessoes: SessaoFrentista[];
  frentistas: Frentista[];
  onSessaoChange: (tempId: string, campo: keyof SessaoFrentista, valor: string) => void;
  onSessaoBlur: (tempId: string, campo: keyof SessaoFrentista, valor: string) => void;
  onRemoverSessao: (tempId: string) => void;
  onAdicionarSessao: () => void;
  isLoading?: boolean;
}

/**
 * Componente de Detalhamento por Frentista
 * 
 * @remarks
 * Exibe tabela matricial com linhas de meios de pagamento
 * e colunas dinâmicas por frentista. Layout idêntico à produção.
 */
export const SecaoSessoesFrentistas: React.FC<SecaoSessoesFrentistasProps> = ({
  sessoes,
  frentistas,
  onSessaoChange,
  onSessaoBlur,
  onRemoverSessao,
  onAdicionarSessao,
  isLoading
}) => {

  // Definição das linhas da matriz (Tipos de Pagamento)
  const linhasPagamento = [
    { key: 'valor_pix', label: 'Pix' },
    { key: 'valor_cartao_debito', label: 'Cartão Débito' },
    { key: 'valor_cartao_credito', label: 'Cartão Crédito' },
    { key: 'valor_nota', label: 'Nota a Prazo' },
    { key: 'valor_dinheiro', label: 'Dinheiro' },
    { key: 'valor_baratao', label: 'Outros' },
  ] as const;

  // Cálculos auxiliares
  const calcularTotalSessao = (sessao: SessaoFrentista) => {
    return linhasPagamento.reduce((acc, linha) => acc + parseValue(sessao[linha.key]), 0);
  };

  const calcularTotalPorTipo = (chave: typeof linhasPagamento[number]['key']) => {
    return sessoes.reduce((acc, sessao) => acc + parseValue(sessao[chave]), 0);
  };

  const totalGeralCaixa = sessoes.reduce((acc, sessao) => acc + calcularTotalSessao(sessao), 0);

  // Obter nome do frentista
  const getNomeFrentista = (frentistaId: number | null) => {
    if (!frentistaId) return 'SELECIONE';
    const f = frentistas.find(fr => fr.id === frentistaId);
    return f ? f.nome.toUpperCase() : 'SELECIONE';
  };

  return (
    <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 p-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-100">
          Detalhamento por Frentista
        </h2>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
            {sessoes.length} Ativos
          </span>
          <button
            onClick={onAdicionarSessao}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Adicionar Frentista"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[200px]">
                MEIO DE PAGAMENTO
              </th>
              {sessoes.map((sessao) => (
                <th key={sessao.tempId} className="py-3 px-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">
                  <select
                    value={sessao.frentistaId || ''}
                    onChange={(e) => onSessaoChange(sessao.tempId, 'frentistaId', e.target.value)}
                    disabled={isLoading}
                    className="bg-transparent border-none text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white focus:outline-none text-center appearance-none"
                  >
                    <option value="" className="bg-slate-800">SELECIONE</option>
                    {frentistas.filter(f => f.ativo).map(f => (
                      <option key={f.id} value={f.id} className="bg-slate-800">{f.nome.toUpperCase()}</option>
                    ))}
                  </select>
                </th>
              ))}
              <th className="py-3 px-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">
                TOTAL CAIXA
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Linhas de Pagamento */}
            {linhasPagamento.map((linha) => {
              const totalLinha = calcularTotalPorTipo(linha.key);
              return (
                <tr key={linha.key} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {linha.label}
                  </td>
                  {sessoes.map((sessao) => (
                    <td key={`${sessao.tempId}-${linha.key}`} className="py-2 px-2 text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={sessao[linha.key]}
                        onChange={(e) => onSessaoChange(sessao.tempId, linha.key, e.target.value)}
                        onBlur={(e) => onSessaoBlur(sessao.tempId, linha.key, e.target.value)}
                        disabled={isLoading}
                        className="w-full bg-transparent border-none text-sm text-right text-slate-300 font-mono focus:outline-none focus:bg-slate-700/50 rounded px-2 py-1 placeholder-slate-600"
                        placeholder="R$ 0,00"
                      />
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right text-sm font-medium font-mono text-slate-300">
                    {paraReais(totalLinha)}
                  </td>
                </tr>
              );
            })}

            {/* Linha Total Geral */}
            <tr className="border-t border-slate-600 bg-slate-900/30">
              <td className="py-4 px-4 text-sm font-medium text-slate-300">
                Total Geral
              </td>
              {sessoes.map((sessao) => (
                <td key={`total-${sessao.tempId}`} className="py-4 px-4 text-center text-sm font-bold font-mono text-emerald-400">
                  {paraReais(calcularTotalSessao(sessao))}
                </td>
              ))}
              <td className="py-4 px-4 text-right text-sm font-bold font-mono text-emerald-400">
                {paraReais(totalGeralCaixa)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Botão Adicionar se não tiver sessões */}
      {sessoes.length === 0 && (
        <div className="text-center py-8">
          <button
            onClick={onAdicionarSessao}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            <Plus size={16} className="inline mr-2" />
            Adicionar Frentista
          </button>
        </div>
      )}
    </div>
  );
};
