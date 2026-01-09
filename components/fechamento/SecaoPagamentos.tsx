import React from 'react';
import { EntradaPagamento } from '../../types/fechamento';
import { paraReais, obterIconePagamento } from '../../utils/formatters';

interface SecaoPagamentosProps {
  pagamentos: EntradaPagamento[];
  onPagamentoChange: (index: number, valor: string) => void;
  onPagamentoBlur: (index: number) => void;
  totalPagamentos: number;
  isLoading?: boolean;
}

export const SecaoPagamentos: React.FC<SecaoPagamentosProps> = ({
  pagamentos,
  onPagamentoChange,
  onPagamentoBlur,
  totalPagamentos,
  isLoading = false
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>💰</span> Formas de Pagamento
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {pagamentos.map((pagamento, index) => (
          <div key={pagamento.id} className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
            <label className="block mb-2 flex items-center gap-2">
              {obterIconePagamento(pagamento.tipo)}
              <span className="text-lg font-semibold text-gray-700">
                {pagamento.nome}
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

      <div className="border-t-2 border-gray-300 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold text-gray-800">
            Total em Pagamentos:
          </span>
          <span className="text-2xl font-bold text-green-600">
            {paraReais(totalPagamentos)}
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
