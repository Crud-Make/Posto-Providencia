/**
 * SecaoPagamentos - Componente para gerenciamento de formas de pagamento
 *
 * @remarks
 * - Exibe todas as formas de pagamento disponíveis
 * - Permite entrada de valores monetários formatados
 * - Formata automaticamente para R$ X,XX no blur
 * - Valida entrada (apenas números e vírgula)
 * - Calcula total de pagamentos automaticamente
 *
 * @component
 */

import React from 'react';
import { Pagamento } from '../../types/fechamento';
import { toCurrency } from '../../utils/formatters';

interface SecaoPagamentosProps {
  /** Array de pagamentos com tipo e valor */
  pagamentos: Pagamento[];
  /** Callback para alteração de valor durante digitação */
  onPagamentoChange: (index: number, valor: string) => void;
  /** Callback para formatação ao sair do campo */
  onPagamentoBlur: (index: number) => void;
  /** Total calculado de todos os pagamentos */
  totalPagamentos: number;
  /** Flag indicando se está em modo de carregamento */
  isLoading?: boolean;
}

/**
 * Mapeamento de ícones para cada tipo de pagamento
 */
const ICONES_PAGAMENTO: Record<string, string> = {
  'PIX': '📱',
  'Dinheiro': '💵',
  'Cartão Crédito': '💳',
  'Cartão Débito': '💳',
  'Nota/Vale': '📝'
};

/**
 * Componente de seção de formas de pagamento
 *
 * @example
 * ```tsx
 * <SecaoPagamentos
 *   pagamentos={pagamentos}
 *   onPagamentoChange={handleChange}
 *   onPagamentoBlur={handleBlur}
 *   totalPagamentos={1500.50}
 * />
 * ```
 */
export const SecaoPagamentos: React.FC<SecaoPagamentosProps> = ({
  pagamentos,
  onPagamentoChange,
  onPagamentoBlur,
  totalPagamentos,
  isLoading = false
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        💰 Formas de Pagamento
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {pagamentos.map((pagamento, index) => (
          <div key={index} className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
            <label className="block mb-2">
              <span className="text-lg font-semibold text-gray-700">
                {ICONES_PAGAMENTO[pagamento.tipo] || '💵'} {pagamento.tipo}
              </span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={pagamento.valor}
              onChange={(e) => onPagamentoChange(index, e.target.value)}
              onBlur={() => onPagamentoBlur(index)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg disabled:bg-gray-100"
              placeholder="R$ 0,00"
            />
          </div>
        ))}
      </div>

      {/* Total de Pagamentos */}
      <div className="border-t-2 border-gray-300 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold text-gray-800">
            Total em Pagamentos:
          </span>
          <span className="text-2xl font-bold text-green-600">
            {toCurrency(totalPagamentos)}
          </span>
        </div>
      </div>

      {pagamentos.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Nenhuma forma de pagamento cadastrada
        </div>
      )}
    </div>
  );
};
