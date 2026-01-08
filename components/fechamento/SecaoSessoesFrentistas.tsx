/**
 * SecaoSessoesFrentistas - Componente para gerenciamento de sessões de frentistas
 *
 * @remarks
 * - Exibe lista de frentistas com suas sessões
 * - Permite adicionar e remover sessões
 * - Entrada de valores monetários formatados (R$ X,XX)
 * - Validação de entrada (apenas números e vírgula)
 * - Calcula total por frentista e total geral
 *
 * @component
 */

import React from 'react';
import { SessaoFrentista } from '../../types/fechamento';
import { toCurrency } from '../../utils/formatters';

interface SecaoSessoesFrentistasProps {
  /** Array de sessões de frentistas */
  sessoes: SessaoFrentista[];
  /** Callback para alteração de valor de sessão */
  onSessaoChange: (indexFrentista: number, indexSessao: number, valor: string) => void;
  /** Callback para formatação ao sair do campo */
  onSessaoBlur: (indexFrentista: number, indexSessao: number) => void;
  /** Callback para adicionar nova sessão */
  onAdicionarSessao: (indexFrentista: number) => void;
  /** Callback para remover sessão */
  onRemoverSessao: (indexFrentista: number, indexSessao: number) => void;
  /** Total calculado de todas as sessões */
  totalSessoes: number;
  /** Flag indicando se está em modo de carregamento */
  isLoading?: boolean;
}

/**
 * Componente de seção de sessões de frentistas
 *
 * @example
 * ```tsx
 * <SecaoSessoesFrentistas
 *   sessoes={sessoes}
 *   onSessaoChange={handleChange}
 *   onSessaoBlur={handleBlur}
 *   onAdicionarSessao={handleAdicionar}
 *   onRemoverSessao={handleRemover}
 *   totalSessoes={2500.75}
 * />
 * ```
 */
export const SecaoSessoesFrentistas: React.FC<SecaoSessoesFrentistasProps> = ({
  sessoes,
  onSessaoChange,
  onSessaoBlur,
  onAdicionarSessao,
  onRemoverSessao,
  totalSessoes,
  isLoading = false
}) => {
  /**
   * Calcula o total de um frentista específico
   */
  const calcularTotalFrentista = (sessoesFrentista: string[]): number => {
    return sessoesFrentista.reduce((total, valorStr) => {
      const valor = parseFloat(valorStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      return total + valor;
    }, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        👤 Sessões de Frentistas
      </h2>

      <div className="space-y-6">
        {sessoes.map((frentista, indexFrentista) => {
          const totalFrentista = calcularTotalFrentista(frentista.sessoes);

          return (
            <div key={indexFrentista} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              {/* Cabeçalho do Frentista */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-700">
                  {frentista.nome}
                </h3>
                <span className="text-lg font-semibold text-blue-600">
                  Total: {toCurrency(totalFrentista)}
                </span>
              </div>

              {/* Lista de Sessões */}
              <div className="space-y-3">
                {frentista.sessoes.map((valorSessao, indexSessao) => (
                  <div key={indexSessao} className="flex items-center gap-3">
                    <span className="text-gray-600 font-medium min-w-[100px]">
                      Sessão {indexSessao + 1}:
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={valorSessao}
                      onChange={(e) => onSessaoChange(indexFrentista, indexSessao, e.target.value)}
                      onBlur={() => onSessaoBlur(indexFrentista, indexSessao)}
                      disabled={isLoading}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg disabled:bg-gray-100"
                      placeholder="R$ 0,00"
                    />
                    <button
                      onClick={() => onRemoverSessao(indexFrentista, indexSessao)}
                      disabled={isLoading || frentista.sessoes.length === 1}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      title="Remover sessão"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>

              {/* Botão Adicionar Sessão */}
              <button
                onClick={() => onAdicionarSessao(indexFrentista)}
                disabled={isLoading}
                className="mt-4 w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors font-semibold"
              >
                ➕ Adicionar Sessão
              </button>
            </div>
          );
        })}
      </div>

      {/* Total Geral de Sessões */}
      <div className="border-t-2 border-gray-300 mt-6 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold text-gray-800">
            Total Geral de Sessões:
          </span>
          <span className="text-2xl font-bold text-blue-600">
            {toCurrency(totalSessoes)}
          </span>
        </div>
      </div>

      {sessoes.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Nenhum frentista cadastrado
        </div>
      )}
    </div>
  );
};
