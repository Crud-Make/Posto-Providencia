import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Droplet, 
  CheckCircle2, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { READING_PUMPS_DATA } from '../constants';

const DailyReadingsScreen: React.FC = () => {
  const [readings, setReadings] = useState<Record<string, string>>({});

  const handleReadingChange = (nozzleId: string, value: string) => {
    // Only allow numbers and one dot/comma
    if (!/^\d*[.,]?\d*$/.test(value)) return;
    setReadings(prev => ({ ...prev, [nozzleId]: value }));
  };

  const calculateVolume = (initial: number, current: string) => {
    const val = parseFloat(current.replace(',', '.'));
    if (isNaN(val) || val < initial) return 0;
    return val - initial;
  };

  const calculateTotal = (volume: number, price: number) => {
    return volume * price;
  };

  const totals = READING_PUMPS_DATA.flatMap(p => p.nozzles).reduce(
    (acc, nozzle) => {
      const currentReading = readings[nozzle.id];
      const vol = currentReading ? calculateVolume(nozzle.initialReading, currentReading) : 0;
      const val = calculateTotal(vol, nozzle.price);
      
      return {
        liters: acc.liters + vol,
        revenue: acc.revenue + val
      };
    },
    { liters: 0, revenue: 0 }
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-32">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Registro de Leituras Diárias</h1>
          <p className="text-gray-500 mt-2">Preencha os dados dos encerrantes de cada bico para fechar o turno.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data</span>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm">
              <Calendar size={18} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">24/10/2023</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Turno</span>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm min-w-[140px] justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-900">Manhã</span>
              </div>
              <span className="text-gray-400 text-xs">▼</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pumps Grid */}
      <div className="space-y-8">
        {READING_PUMPS_DATA.length === 0 ? (
             <div className="p-12 text-center text-gray-400 italic bg-gray-50 rounded-xl border border-gray-200">
                Nenhuma bomba configurada para leitura.
             </div>
        ) : (
            READING_PUMPS_DATA.map((pump) => (
            <div key={pump.id}>
                <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <h2 className="text-xl font-bold text-gray-900">{pump.name}</h2>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {pump.nozzles.map((nozzle) => {
                    const currentVal = readings[nozzle.id] || '';
                    const hasValue = currentVal.length > 0;
                    const volume = hasValue ? calculateVolume(nozzle.initialReading, currentVal) : 0;
                    const total = calculateTotal(volume, nozzle.price);
                    const isInvalid = hasValue && parseFloat(currentVal) < nozzle.initialReading;

                    return (
                    <div key={nozzle.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Nozzle Header */}
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-200 rounded-full text-gray-500">
                            <Droplet size={18} fill="currentColor" />
                            </div>
                            <span className="font-bold text-gray-900">Bico {nozzle.number}</span>
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${nozzle.productColorClass}`}>
                            {nozzle.product}
                            </span>
                        </div>
                        <span className="text-xs font-medium text-gray-500">{nozzle.tank}</span>
                        </div>

                        {/* Nozzle Body */}
                        <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                            {/* Initial Reading */}
                            <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Leitura Inicial</label>
                            <div className="h-12 bg-gray-50 rounded-lg flex items-center px-4 font-mono text-blue-600 font-medium">
                                {nozzle.initialReading.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                            </div>
                            </div>

                            {/* Final Reading Input */}
                            <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Leitura Final</label>
                            <div className="relative">
                                <input
                                type="text"
                                value={currentVal}
                                onChange={(e) => handleReadingChange(nozzle.id, e.target.value)}
                                className={`w-full h-12 rounded-lg border px-4 font-mono font-bold text-gray-900 outline-none focus:ring-2 transition-all
                                    ${isInvalid 
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' 
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'}
                                `}
                                placeholder="000.000"
                                />
                                {hasValue && !isInvalid && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                    <CheckCircle2 size={18} />
                                </div>
                                )}
                                {isInvalid && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                                    <AlertCircle size={18} />
                                </div>
                                )}
                            </div>
                            </div>

                            {/* Price */}
                            <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Preço / L</label>
                            <div className="h-12 rounded-lg border border-gray-200 flex items-center px-4">
                                <span className="text-gray-400 text-xs mr-1">R$</span>
                                <span className="font-mono text-gray-900 font-medium">{nozzle.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            </div>

                            {/* Totals */}
                            <div className="sm:col-span-1 flex flex-col justify-center items-end sm:items-start pl-0 sm:pl-4">
                            <div className="text-right sm:text-left mb-1">
                                <span className="text-[10px] text-gray-400 uppercase font-bold mr-2">Total Litros:</span>
                                <span className={`font-mono font-bold ${hasValue ? 'text-green-600' : 'text-gray-300'}`}>
                                {hasValue ? volume.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '- -'}
                                {hasValue && <span className="text-xs ml-0.5">L</span>}
                                </span>
                            </div>
                            <div className="text-right sm:text-left">
                                <span className="text-[10px] text-gray-400 uppercase font-bold mr-2">Total R$</span>
                                <div className={`text-xl font-bold ${hasValue ? 'text-gray-900' : 'text-gray-300'}`}>
                                {hasValue ? `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00'}
                                </div>
                            </div>
                            </div>

                        </div>
                        </div>
                    </div>
                    );
                })}
                </div>
            </div>
            ))
        )}
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Litros</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-gray-900">{totals.liters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                <span className="text-sm font-bold text-gray-400">L</span>
              </div>
            </div>
            
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Faturamento Estimado</span>
              <div className="text-2xl font-black text-blue-600">
                R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span className="text-sm font-bold text-yellow-600">Em preenchimento</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
              Cancelar
            </button>
            <button className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors bg-white">
              Salvar Rascunho
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
              <Check size={18} strokeWidth={3} />
              Confirmar Leitura
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default DailyReadingsScreen;