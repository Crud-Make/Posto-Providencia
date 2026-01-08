/**
 * SecaoResumo - Componente para exibição de totalizadores e diferenças do fechamento
 *
 * @remarks
 * - Exibe total de litros vendidos
 * - Exibe total em reais (sessões de frentistas)
 * - Exibe total de pagamentos recebidos
 * - Calcula e destaca diferenças (sobra/falta de caixa)
 * - Usa cores semânticas (verde para ok, vermelho para diferença)
 *
 * @component
 */

import React from 'react';
import { toCurrency } from '../../utils/formatters';

interface SecaoResumoProps {
  /** Total de litros vendidos (soma das diferenças de leituras) */
  totalLitros: number;
  /** Total em reais das sessões de frentistas */
  totalSessoes: number;
  /** Total em reais dos pagamentos recebidos */
  totalPagamentos: number;
  /** Flag indicando se está em modo de carregamento */
  isLoading?: boolean;
}

/**
 * Componente de seção de resumo e totalizadores
 *
 * @example
 * ```tsx
 * <SecaoResumo
 *   totalLitros={5000.50}
 *   totalSessoes={12500.00}
 *   totalPagamentos={12450.00}
 * />
 * ```
 */
export const SecaoResumo: React.FC<SecaoResumoProps> = ({
  totalLitros,
  totalSessoes,
  totalPagamentos,
  isLoading = false
}) => {
  // Calcula a diferença entre sessões e pagamentos
  const diferenca = totalSessoes - totalPagamentos;
  const temDiferenca = Math.abs(diferenca) > 0.01; // Tolerância de 1 centavo

  // Define cor baseada na diferença
  const corDiferenca = temDiferenca
    ? (diferenca > 0 ? 'text-orange-600' : 'text-red-600')
    : 'text-green-600';

  const textoDiferenca = temDiferenca
    ? (diferenca > 0 ? 'Sobra de Caixa' : 'Falta no Caixa')
    : 'Caixa Fechado';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        📈 Resumo do Fechamento
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total de Litros */}
        <div className="border-2 border-blue-300 rounded-lg p-5 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total de Litros Vendidos</p>
              <p className="text-3xl font-bold text-blue-700">
                {totalLitros.toFixed(2)} L
              </p>
            </div>
            <span className="text-5xl">⛽</span>
          </div>
        </div>

        {/* Total de Sessões */}
        <div className="border-2 border-purple-300 rounded-lg p-5 bg-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total de Sessões (Frentistas)</p>
              <p className="text-3xl font-bold text-purple-700">
                {toCurrency(totalSessoes)}
              </p>
            </div>
            <span className="text-5xl">👥</span>
          </div>
        </div>

        {/* Total de Pagamentos */}
        <div className="border-2 border-green-300 rounded-lg p-5 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total de Pagamentos</p>
              <p className="text-3xl font-bold text-green-700">
                {toCurrency(totalPagamentos)}
              </p>
            </div>
            <span className="text-5xl">💰</span>
          </div>
        </div>

        {/* Diferença (Sobra/Falta) */}
        <div className={`border-2 rounded-lg p-5 ${
          temDiferenca
            ? (diferenca > 0 ? 'border-orange-300 bg-orange-50' : 'border-red-300 bg-red-50')
            : 'border-green-300 bg-green-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{textoDiferenca}</p>
              <p className={`text-3xl font-bold ${corDiferenca}`}>
                {toCurrency(Math.abs(diferenca))}
              </p>
            </div>
            <span className="text-5xl">
              {temDiferenca ? (diferenca > 0 ? '📈' : '📉') : '✅'}
            </span>
          </div>
        </div>
      </div>

      {/* Observações sobre a diferença */}
      {temDiferenca && (
        <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Atenção:</strong> {' '}
            {diferenca > 0
              ? 'Há sobra de caixa. Verifique se todos os pagamentos foram registrados corretamente.'
              : 'Há falta no caixa. Verifique se todas as sessões foram lançadas corretamente ou se houve erro de digitação.'
            }
          </p>
        </div>
      )}

      {isLoading && (
        <div className="mt-4 text-center text-gray-500">
          Carregando dados...
        </div>
      )}
    </div>
  );
};
