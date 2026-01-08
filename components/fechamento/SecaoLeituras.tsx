/**
 * SecaoLeituras - Componente para exibição e edição de leituras de encerrantes
 *
 * @remarks
 * - Exibe as leituras iniciais e finais de cada bomba
 * - Calcula automaticamente as diferenças
 * - Aplica validações de entrada (apenas números)
 * - Utiliza o hook useLeituras para gerenciamento de estado
 *
 * @component
 */

import React from 'react';
import { Leitura } from '../../types/fechamento';

interface SecaoLeiturasProps {
  /** Array de leituras com inicial, final e diferença calculada */
  leituras: Leitura[];
  /** Callback para atualização de leitura inicial */
  onLeituraInicialChange: (index: number, valor: string) => void;
  /** Callback para atualização de leitura final */
  onLeituraFinalChange: (index: number, valor: string) => void;
  /** Flag indicando se está em modo de carregamento */
  isLoading?: boolean;
}

/**
 * Componente de seção de leituras de encerrantes
 *
 * @example
 * ```tsx
 * <SecaoLeituras
 *   leituras={leituras}
 *   onLeituraInicialChange={handleInicialChange}
 *   onLeituraFinalChange={handleFinalChange}
 * />
 * ```
 */
export const SecaoLeituras: React.FC<SecaoLeiturasProps> = ({
  leituras,
  onLeituraInicialChange,
  onLeituraFinalChange,
  isLoading = false
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        📊 Leituras dos Encerrantes
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Bomba</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Leitura Inicial</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Leitura Final</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Diferença (L)</th>
            </tr>
          </thead>
          <tbody>
            {leituras.map((leitura, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-semibold">
                  {leitura.bomba}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={leitura.inicial}
                    onChange={(e) => onLeituraInicialChange(index, e.target.value)}
                    disabled={isLoading}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="0"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={leitura.final}
                    onChange={(e) => onLeituraFinalChange(index, e.target.value)}
                    disabled={isLoading}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="0"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right font-mono">
                  {leitura.diferenca.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leituras.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Nenhuma leitura cadastrada
        </div>
      )}
    </div>
  );
};
