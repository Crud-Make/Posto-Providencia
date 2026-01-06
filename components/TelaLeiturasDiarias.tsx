import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Droplet,
  CheckCircle2,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Info
} from 'lucide-react';
import { bicoService, leituraService } from '../services/api';
import type { Bico, Bomba, Combustivel, Leitura } from '../services/database.types';
import { ProgressIndicator } from './ValidationAlert';
import { usePosto } from '../contexts/PostoContext';

// Type for bico with related data
type BicoWithDetails = Bico & { bomba: Bomba; combustivel: Combustivel };

// Type for grouped pumps
interface PumpGroup {
  bomba: Bomba;
  bicos: BicoWithDetails[];
}

// Color mapping for fuel types
const FUEL_COLORS: Record<string, string> = {
  'GC': 'bg-red-100 text-red-700',
  'GA': 'bg-blue-100 text-blue-700',
  'ET': 'bg-green-100 text-green-700',
  'S10': 'bg-yellow-100 text-yellow-700',
  'DIESEL': 'bg-amber-100 text-amber-700',
};

const TelaLeiturasDiarias: React.FC = () => {
  // Posto Context
  const { postoAtivoId } = usePosto();

  // State
  const [bicos, setBicos] = useState<BicoWithDetails[]>([]);

  const [lastReadings, setLastReadings] = useState<Record<number, Leitura | null>>({});
  const [readings, setReadings] = useState<Record<number, string>>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load data on mount and when posto changes
  useEffect(() => {
    if (postoAtivoId) {
      loadData();
    }
  }, [postoAtivoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch bicos with details
      const bicosData = await bicoService.getWithDetails(postoAtivoId);
      setBicos(bicosData);

      // Fetch last reading for each bico
      const lastReadingsMap: Record<number, Leitura | null> = {};
      await Promise.all(
        bicosData.map(async (bico) => {
          const lastReading = await leituraService.getLastReadingByBico(bico.id);
          lastReadingsMap[bico.id] = lastReading;
        })
      );
      setLastReadings(lastReadingsMap);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // Group bicos by pump
  const pumpGroups: PumpGroup[] = bicos.reduce((acc, bico) => {
    const existingGroup = acc.find(g => g.bomba.id === bico.bomba.id);
    if (existingGroup) {
      existingGroup.bicos.push(bico);
    } else {
      acc.push({ bomba: bico.bomba, bicos: [bico] });
    }
    return acc;
  }, [] as PumpGroup[]);

  const handleReadingChange = (bicoId: number, value: string) => {
    // Only allow numbers and one dot/comma
    if (!/^\d*[.,]?\d*$/.test(value)) return;
    setReadings(prev => ({ ...prev, [bicoId]: value }));
  };

  const getInitialReading = (bicoId: number): number => {
    const lastReading = lastReadings[bicoId];
    return lastReading?.leitura_final || 0;
  };

  const calculateVolume = (bicoId: number, current: string): number => {
    const initial = getInitialReading(bicoId);
    const val = parseFloat(current.replace(',', '.'));
    if (isNaN(val) || val < initial) return 0;
    return val - initial;
  };

  const calculateTotal = (volume: number, price: number): number => {
    return volume * price;
  };

  // Calculate totals
  const totals = bicos.reduce(
    (acc, bico) => {
      const currentReading = readings[bico.id];
      const vol = currentReading ? calculateVolume(bico.id, currentReading) : 0;
      const val = calculateTotal(vol, bico.combustivel.preco_venda);

      return {
        liters: acc.liters + vol,
        revenue: acc.revenue + val
      };
    },
    { liters: 0, revenue: 0 }
  );

  // Calculate form completion progress
  const formProgress = useMemo(() => {
    const filled = Object.values(readings).filter(r => r && r.length > 0).length;
    const valid = bicos.filter(bico => {
      const current = readings[bico.id];
      if (!current) return false;
      const initial = getInitialReading(bico.id);
      const val = parseFloat(current.replace(',', '.'));
      return !isNaN(val) && val > initial;
    }).length;
    return { filled, valid, total: bicos.length };
  }, [readings, bicos]);

  // Check if volume is unusually high (warning threshold: 3x average ~ 3000L per nozzle)
  const isVolumeHigh = (volume: number): boolean => volume > 3000;

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Build leituras array
      const leiturasToCreate = bicos
        .filter(bico => readings[bico.id] && parseFloat(readings[bico.id].replace(',', '.')) > getInitialReading(bico.id))
        .map(bico => {
          const finalReading = parseFloat(readings[bico.id].replace(',', '.'));
          return {
            bico_id: bico.id,
            data: selectedDate,
            leitura_inicial: getInitialReading(bico.id),
            leitura_final: finalReading,
            combustivel_id: bico.combustivel.id,
            preco_litro: bico.combustivel.preco_venda,
            usuario_id: 1, // TODO: Get from auth context
            posto_id: postoAtivoId,
          };
        });

      if (leiturasToCreate.length === 0) {
        setError('Nenhuma leitura válida para salvar.');
        return;
      }

      await leituraService.bulkCreate(leiturasToCreate);

      setSuccess(`${leiturasToCreate.length} leituras salvas com sucesso!`);
      setReadings({});

      // Reload data to get updated last readings
      await loadData();

    } catch (err) {
      console.error('Error saving readings:', err);
      setError('Erro ao salvar leituras. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-gray-500 font-medium">Carregando dados...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-32">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Registro de Leituras Diárias</h1>
          <p className="text-gray-500 mt-2">Preencha os dados dos encerrantes de cada bico para o fechamento diário.</p>
        </div>

        <div className="flex gap-4">
          {/* Date Picker */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data</span>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <Calendar size={18} className="text-gray-400 ml-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-2.5 text-sm font-semibold text-gray-900 outline-none border-none"
              />
            </div>
          </div>

          {/* Turno Selector - oculto */}

          {/* Refresh Button */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">&nbsp;</span>
            <button
              onClick={loadData}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={18} className="text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium flex items-center gap-2">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Pumps Grid */}
      <div className="space-y-8">
        {pumpGroups.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic bg-gray-50 rounded-xl border border-gray-200">
            Nenhuma bomba configurada. Configure bombas e bicos nas Configurações.
          </div>
        ) : (
          pumpGroups.map((pumpGroup) => (
            <div key={pumpGroup.bomba.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <h2 className="text-xl font-bold text-gray-900">{pumpGroup.bomba.nome}</h2>
                {pumpGroup.bomba.localizacao && (
                  <span className="text-sm text-gray-500">({pumpGroup.bomba.localizacao})</span>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {pumpGroup.bicos.map((bico) => {
                  const currentVal = readings[bico.id] || '';
                  const hasValue = currentVal.length > 0;
                  const initialReading = getInitialReading(bico.id);
                  const volume = hasValue ? calculateVolume(bico.id, currentVal) : 0;
                  const total = calculateTotal(volume, bico.combustivel.preco_venda);
                  const finalVal = parseFloat(currentVal.replace(',', '.'));
                  const isInvalid = hasValue && finalVal < initialReading;
                  const isVeryHigh = hasValue && !isInvalid && isVolumeHigh(volume);
                  const isValid = hasValue && !isInvalid && !isVeryHigh;
                  const colorClass = FUEL_COLORS[bico.combustivel.codigo] || 'bg-gray-100 text-gray-700';

                  return (
                    <div key={bico.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${isInvalid
                      ? 'border-red-300 animate-shake'
                      : isVeryHigh
                        ? 'border-yellow-300'
                        : isValid
                          ? 'border-green-200'
                          : 'border-gray-200'
                      }`}>
                      {/* Nozzle Header */}
                      <div className={`px-6 py-4 border-b flex justify-between items-center transition-colors ${isInvalid
                        ? 'bg-red-50 border-red-200'
                        : isVeryHigh
                          ? 'bg-yellow-50 border-yellow-200'
                          : isValid
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50/50 border-gray-200'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full transition-colors ${isInvalid ? 'bg-red-100 text-red-500' :
                            isVeryHigh ? 'bg-yellow-100 text-yellow-500' :
                              isValid ? 'bg-green-100 text-green-500' :
                                'bg-gray-200 text-gray-500'
                            }`}>
                            <Droplet size={18} fill="currentColor" />
                          </div>
                          <span className="font-bold text-gray-900">Bico {bico.numero}</span>
                          <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${colorClass}`}>
                            {bico.combustivel.nome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isInvalid && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase animate-pulse">
                              Erro
                            </span>
                          )}
                          {isVeryHigh && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-600 uppercase flex items-center gap-1" title="Volume acima da média">
                              <AlertTriangle size={10} /> Alto
                            </span>
                          )}
                          {isValid && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-600 uppercase">
                              OK
                            </span>
                          )}
                          <span className="text-xs font-medium text-gray-500">{bico.combustivel.codigo}</span>
                        </div>
                      </div>

                      {/* Nozzle Body */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                          {/* Initial Reading */}
                          <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Leitura Inicial</label>
                            <div className="h-12 bg-gray-50 rounded-lg flex items-center px-4 font-mono text-blue-600 font-medium">
                              {initialReading.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                            </div>
                          </div>

                          {/* Final Reading Input */}
                          <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Leitura Final</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={currentVal}
                                onChange={(e) => handleReadingChange(bico.id, e.target.value)}
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
                              {isVeryHigh && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500">
                                  <AlertTriangle size={18} />
                                </div>
                              )}
                            </div>
                            {/* Inline validation message */}
                            {isInvalid && (
                              <p className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
                                <AlertCircle size={10} />
                                Leitura final deve ser maior que inicial
                              </p>
                            )}
                            {isVeryHigh && (
                              <p className="text-[10px] text-yellow-600 font-medium mt-1 flex items-center gap-1">
                                <Info size={10} />
                                Volume acima da média. Verifique o valor.
                              </p>
                            )}
                          </div>

                          {/* Price */}
                          <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Preço / L</label>
                            <div className="h-12 rounded-lg border border-gray-200 flex items-center px-4">
                              <span className="text-gray-400 text-xs mr-1">R$</span>
                              <span className="font-mono text-gray-900 font-medium">{bico.combustivel.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
            {/* Progress indicator */}
            <div className="flex flex-col min-w-[120px]">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Progresso</span>
              <ProgressIndicator
                current={formProgress.valid}
                total={formProgress.total}
                label={`${formProgress.valid}/${formProgress.total} válidos`}
              />
            </div>

            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

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
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Data</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700">{formatDateDisplay(selectedDate)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setReadings({})}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(readings).length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check size={18} strokeWidth={3} />
                  Salvar Leituras
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TelaLeiturasDiarias;