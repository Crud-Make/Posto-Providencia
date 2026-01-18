import React from 'react';
import { Droplet, AlertTriangle, TrendingUp } from 'lucide-react';
import type { PumpGroup } from '../types';
import { FUEL_COLORS } from '../types';
import type { useLeituras } from '../../fechamento-diario/hooks/useLeituras';

// Tipo de retorno do hook
type UseLeiturasReturn = ReturnType<typeof useLeituras>;

interface TabelaLeiturasProps {
  groups: PumpGroup[];
  leiturasHook: UseLeiturasReturn;
}

export const TabelaLeituras: React.FC<TabelaLeiturasProps> = ({ groups, leiturasHook }) => {
  const { 
    leituras, 
    alterarFechamento, 
    aoSairFechamento, 
    calcLitros, 
    calcVenda 
  } = leiturasHook;

  // Verificação de volume alto (limite: 3000L)
  const isVolumeHigh = (volume: number): boolean => volume > 3000;

  if (groups.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400 italic bg-gray-50 rounded-xl border border-gray-200">
        Nenhuma bomba configurada. Configure bombas e bicos nas Configurações.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {groups.map((group) => (
        <div key={group.bomba.id}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <h2 className="text-xl font-bold text-gray-900">{group.bomba.nome}</h2>
            {group.bomba.localizacao && (
              <span className="text-sm text-gray-500">({group.bomba.localizacao})</span>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {group.bicos.map((bico) => {
              const leitura = leituras[bico.id];
              const inicial = leitura?.inicial || '0,000';
              const fechamento = leitura?.fechamento || '';
              
              const resLitros = calcLitros(bico.id);
              const resVenda = calcVenda(bico.id);
              
              // Validações visuais
              const litrosVal = resLitros.value;
              const isInvalid = litrosVal < 0; // Leitura menor que inicial
              const isVeryHigh = !isInvalid && isVolumeHigh(litrosVal);
              const isValid = !isInvalid && !isVeryHigh && fechamento !== '' && fechamento !== '0,000';
              
              const colorClass = FUEL_COLORS[bico.combustivel.codigo] || 'bg-gray-100 text-gray-700';

              return (
                <div 
                  key={bico.id} 
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${
                    isInvalid ? 'border-red-300 ring-1 ring-red-100' :
                    isVeryHigh ? 'border-yellow-300 ring-1 ring-yellow-100' :
                    isValid ? 'border-green-200 ring-1 ring-green-50' :
                    'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row h-full">
                    {/* Fuel Indicator Strip */}
                    <div className={`w-full sm:w-2 ${colorClass.split(' ')[0]}`} />

                    <div className="flex-1 p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wider ${colorClass}`}>
                            {bico.combustivel.codigo}
                          </span>
                          <span className="font-medium text-gray-900 text-lg">Bico #{bico.numero}</span>
                        </div>
                        <div className="flex items-center text-gray-400 bg-gray-50 px-2 py-1 rounded text-xs">
                          <Droplet size={12} className="mr-1.5" />
                          Tanque {bico.tanque_id || '?'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Initial Reading */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Leitura Inicial</span>
                          <div className="text-lg font-mono text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                            {inicial}
                          </div>
                        </div>

                        {/* Final Reading Input */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Leitura Atual</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={fechamento}
                            onChange={(e) => alterarFechamento(bico.id, e.target.value)}
                            onBlur={() => aoSairFechamento(bico.id)}
                            className={`w-full text-lg font-mono font-bold bg-white border rounded-lg px-3 py-2 outline-none transition-all ${
                              isInvalid ? 'text-red-600 border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' :
                              isVeryHigh ? 'text-yellow-700 border-yellow-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100' :
                              isValid ? 'text-green-700 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-100' :
                              'text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                            }`}
                            placeholder="0,000"
                          />
                        </div>
                      </div>

                      {/* Calculations / Feedback */}
                      {(isValid || isInvalid || isVeryHigh) && (
                        <div className={`mt-4 pt-3 border-t flex items-center justify-between text-sm ${
                          isInvalid ? 'border-red-100 text-red-600' :
                          isVeryHigh ? 'border-yellow-100 text-yellow-700' :
                          'border-gray-100 text-gray-500'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <Droplet size={14} className={isValid ? 'text-blue-500' : 'currentColor'} />
                              <span className="font-semibold">{resLitros.display} L</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp size={14} className={isValid ? 'text-green-500' : 'currentColor'} />
                              <span className="font-semibold">R$ {resVenda.display}</span>
                            </div>
                          </div>

                          {isInvalid && (
                            <div className="flex items-center gap-1.5 text-xs font-bold bg-red-50 px-2 py-1 rounded text-red-700">
                              <AlertTriangle size={12} />
                              INVÁLIDO
                            </div>
                          )}
                          
                          {isVeryHigh && (
                            <div className="flex items-center gap-1.5 text-xs font-bold bg-yellow-50 px-2 py-1 rounded text-yellow-700">
                              <AlertTriangle size={12} />
                              VOLUME ALTO
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
