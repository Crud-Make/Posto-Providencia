import React from 'react';
import { BicoComDetalhes } from '../../types/fechamento';
import { CORES_COMBUSTIVEL } from '../../types/fechamento';

interface SecaoLeiturasProps {
  bicos: BicoComDetalhes[];
  leituras: Record<number, { inicial: string; fechamento: string }>;
  onLeituraInicialChange: (bicoId: number, valor: string) => void;
  onLeituraFechamentoChange: (bicoId: number, valor: string) => void;
  onLeituraInicialBlur: (bicoId: number) => void;
  onLeituraFechamentoBlur: (bicoId: number) => void;
  calcLitros: (bicoId: number) => { value: number; display: string };
  isLoading?: boolean;
}

export const SecaoLeituras: React.FC<SecaoLeiturasProps> = ({
  bicos,
  leituras,
  onLeituraInicialChange,
  onLeituraFechamentoChange,
  onLeituraInicialBlur,
  onLeituraFechamentoBlur,
  calcLitros,
  isLoading
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>📊</span> Leituras dos Encerrantes
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bico / Combustível
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leitura Inicial
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leitura Final
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Litros Vendidos
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bicos.map((bico) => {
              const leitura = leituras[bico.id] || { inicial: '', fechamento: '' };
              const litros = calcLitros(bico.id);
              const cor = CORES_COMBUSTIVEL[bico.combustivel.codigo] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };

              return (
                <tr key={bico.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full ${cor.bg} ${cor.text} border ${cor.border} font-bold`}>
                        {bico.numero}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{bico.combustivel.nome}</div>
                        <div className="text-sm text-gray-500">{bico.bomba.nome}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={leitura.inicial}
                      onChange={(e) => onLeituraInicialChange(bico.id, e.target.value)}
                      onBlur={() => onLeituraInicialBlur(bico.id)}
                      disabled={isLoading}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="0,000"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={leitura.fechamento}
                      onChange={(e) => onLeituraFechamentoChange(bico.id, e.target.value)}
                      onBlur={() => onLeituraFechamentoBlur(bico.id)}
                      disabled={isLoading}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="0,000"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-bold ${litros.value > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {litros.display} L
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
