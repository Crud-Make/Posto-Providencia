import React from 'react';
import { corDoProduto } from '@posto/utils';
import { Droplet, AlertTriangle, TrendingUp } from 'lucide-react';
import type { PumpGroup } from '../types';
import type { useLeituras } from '../../fechamento-diario/hooks/useLeituras';

// Tipo de retorno do hook
type UseLeiturasReturn = ReturnType<typeof useLeituras>;

interface TabelaLeiturasProps {
  groups: PumpGroup[];
  leiturasHook: UseLeiturasReturn;
}

/**
 * Em que estado está a leitura de um bico. Antes eram três booleanos
 * (`isInvalid`/`isVeryHigh`/`isValid`) recombinados numa cascata de ternários
 * repetida em três slots de estilo — sozinha, a repetição levava a função a
 * CCN 25, acima do teto de 20 do gate. São quatro estados mutuamente
 * exclusivos, então viram um valor só e uma tabela.
 */
type EstadoDaLeitura = 'invalido' | 'alto' | 'valido' | 'neutro';

const estadoDaLeitura = (litros: number, fechamento: string, volumeAlto: boolean): EstadoDaLeitura => {
  if (litros < 0) return 'invalido';
  if (volumeAlto) return 'alto';
  if (fechamento !== '' && fechamento !== '0,000') return 'valido';
  return 'neutro';
};

const ESTILO_POR_ESTADO: Record<EstadoDaLeitura, { cartao: string; campo: string; rodape: string }> = {
  invalido: {
    cartao: 'border-red-300 ring-1 ring-red-100',
    campo: 'text-red-600 border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100',
    rodape: 'border-red-100 text-red-600',
  },
  alto: {
    cartao: 'border-yellow-300 ring-1 ring-yellow-100',
    campo: 'text-yellow-700 border-yellow-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100',
    rodape: 'border-yellow-100 text-yellow-700',
  },
  valido: {
    cartao: 'border-green-200 ring-1 ring-green-50',
    campo: 'text-green-700 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-100',
    rodape: 'border-gray-100 text-gray-500',
  },
  neutro: {
    cartao: 'border-gray-200 hover:border-blue-200',
    campo: 'text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
    rodape: 'border-gray-100 text-gray-500',
  },
};

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
              const estado = estadoDaLeitura(litrosVal, fechamento, isVolumeHigh(litrosVal));
              const estilo = ESTILO_POR_ESTADO[estado];
              const isInvalid = estado === 'invalido';
              const isVeryHigh = estado === 'alto';
              const isValid = estado === 'valido';
              
              const corProduto = corDoProduto(bico.combustivel.codigo);

              return (
                <div 
                  key={bico.id} 
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${estilo.cartao}`}
                >
                  <div className="flex flex-col sm:flex-row h-full">
                    {/* Fuel Indicator Strip */}
                    <div className="w-full sm:w-2" style={{ backgroundColor: corProduto.fundo }} />

                    <div className="flex-1 p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wider" style={{ backgroundColor: corProduto.fundo, color: corProduto.texto }}>
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
                            className={`w-full text-lg font-mono font-bold bg-white border rounded-lg px-3 py-2 outline-none transition-all ${estilo.campo}`}
                            placeholder="0,000"
                          />
                        </div>
                      </div>

                      {/* Calculations / Feedback */}
                      {estado !== 'neutro' && (
                        <div className={`mt-4 pt-3 border-t flex items-center justify-between text-sm ${estilo.rodape}`}>
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
