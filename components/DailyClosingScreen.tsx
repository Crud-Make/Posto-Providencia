import React, { useState, useEffect } from 'react';
import {
   Fuel,
   Calendar,
   CheckCircle2,
   AlertTriangle,
   Save,
   Check,
   Loader2,
   RefreshCw,
   Calculator
} from 'lucide-react';
import { bicoService, leituraService, combustivelService } from '../services/api';
import type { Bico, Bomba, Combustivel, Leitura } from '../services/database.types';

// Type for bico with related data
type BicoWithDetails = Bico & { bomba: Bomba; combustivel: Combustivel };

// Fuel colors based on spreadsheet
const FUEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
   'GC': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
   'GA': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
   'ET': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
   'S10': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
   'DIESEL': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
};

const DailyClosingScreen: React.FC = () => {
   // State
   const [bicos, setBicos] = useState<BicoWithDetails[]>([]);
   const [lastReadings, setLastReadings] = useState<Record<number, Leitura | null>>({});
   const [leituras, setLeituras] = useState<Record<number, { inicial: string; fechamento: string }>>({});
   const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

   // Load data on mount
   useEffect(() => {
      loadData();
   }, []);

   const loadData = async () => {
      try {
         setLoading(true);
         setError(null);

         // Fetch bicos with details
         const bicosData = await bicoService.getWithDetails();
         setBicos(bicosData);

         // Fetch last reading for each bico
         const lastReadingsMap: Record<number, Leitura | null> = {};
         const leiturasMap: Record<number, { inicial: string; fechamento: string }> = {};

         await Promise.all(
            bicosData.map(async (bico) => {
               const lastReading = await leituraService.getLastReadingByBico(bico.id);
               lastReadingsMap[bico.id] = lastReading;

               // Auto-populate inicial with last fechamento if exists
               leiturasMap[bico.id] = {
                  inicial: lastReading?.leitura_final?.toString() || '',
                  fechamento: ''
               };
            })
         );

         setLastReadings(lastReadingsMap);
         setLeituras(leiturasMap);

      } catch (err) {
         console.error('Error loading data:', err);
         setError('Erro ao carregar dados. Verifique sua conexão.');
      } finally {
         setLoading(false);
      }
   };

   // Handle inicial input change
   const handleInicialChange = (bicoId: number, value: string) => {
      const cleaned = value.replace(/[^\d.,]/g, '');
      setLeituras(prev => ({
         ...prev,
         [bicoId]: { ...prev[bicoId], inicial: cleaned }
      }));
   };

   // Handle fechamento input change
   const handleFechamentoChange = (bicoId: number, value: string) => {
      const cleaned = value.replace(/[^\d.,]/g, '');
      setLeituras(prev => ({
         ...prev,
         [bicoId]: { ...prev[bicoId], fechamento: cleaned }
      }));
   };

   // Parse inicial value
   const parseInicial = (bicoId: number): number => {
      const val = leituras[bicoId]?.inicial;
      if (!val) return 0;
      return parseFloat(val.replace(',', '.')) || 0;
   };

   // Parse fechamento value
   const parseFechamento = (bicoId: number): number => {
      const val = leituras[bicoId]?.fechamento;
      if (!val) return 0;
      return parseFloat(val.replace(',', '.')) || 0;
   };

   // Calculate litros for a bico
   const calcLitros = (bicoId: number): number => {
      const inicial = parseInicial(bicoId);
      const fechamento = parseFechamento(bicoId);
      if (fechamento <= inicial) return 0;
      return fechamento - inicial;
   };

   // Calculate venda for a bico
   const calcVenda = (bicoId: number): number => {
      const bico = bicos.find(b => b.id === bicoId);
      if (!bico) return 0;
      const litros = calcLitros(bicoId);
      return litros * bico.combustivel.preco_venda;
   };

   // Check if input is valid
   const isInputValid = (bicoId: number): boolean => {
      const fechamento = parseFechamento(bicoId);
      const inicial = parseInicial(bicoId);
      return fechamento === 0 || fechamento >= inicial;
   };

   // Group data by combustivel for summary
   const getSummaryByCombustivel = () => {
      const summary: Record<string, { nome: string; codigo: string; litros: number; valor: number; preco: number }> = {};

      bicos.forEach(bico => {
         const codigo = bico.combustivel.codigo;
         if (!summary[codigo]) {
            summary[codigo] = {
               nome: bico.combustivel.nome,
               codigo: codigo,
               litros: 0,
               valor: 0,
               preco: bico.combustivel.preco_venda
            };
         }
         summary[codigo].litros += calcLitros(bico.id);
         summary[codigo].valor += calcVenda(bico.id);
      });

      return Object.values(summary);
   };

   // Calculate totals
   const totals = {
      litros: bicos.reduce((acc, bico) => acc + calcLitros(bico.id), 0),
      valor: bicos.reduce((acc, bico) => acc + calcVenda(bico.id), 0)
   };

   // Calculate percentage
   const calcPercentage = (litros: number): number => {
      if (totals.litros === 0) return 0;
      return (litros / totals.litros) * 100;
   };

   // Handle save
   const handleSave = async () => {
      try {
         setSaving(true);
         setError(null);
         setSuccess(null);

         // Build leituras array
         const leiturasToCreate = bicos
            .filter(bico => {
               const fechamento = parseFechamento(bico.id);
               const inicial = parseInicial(bico.id);
               return fechamento > inicial;
            })
            .map(bico => ({
               bico_id: bico.id,
               data: selectedDate,
               leitura_inicial: parseInicial(bico.id),
               leitura_final: parseFechamento(bico.id),
               preco_litro: bico.combustivel.preco_venda,
               usuario_id: 1, // TODO: Get from auth context
            }));

         if (leiturasToCreate.length === 0) {
            setError('Nenhuma leitura válida para salvar. Preencha os valores de fechamento.');
            return;
         }

         await leituraService.bulkCreate(leiturasToCreate);

         setSuccess(`${leiturasToCreate.length} leituras salvas com sucesso!`);
         setLeituras({});

         // Reload data to get updated last readings
         await loadData();

      } catch (err) {
         console.error('Error saving readings:', err);
         setError('Erro ao salvar leituras. Tente novamente.');
      } finally {
         setSaving(false);
      }
   };

   // Format number for display
   const formatNumber = (num: number, decimals: number = 3): string => {
      return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
   };

   const formatCurrency = (num: number): string => {
      return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

   const summaryData = getSummaryByCombustivel();

   return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-32">

         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
               <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2 bg-blue-50 px-3 py-1 rounded-full w-fit">
                  <Calculator size={14} />
                  Venda Concentrador
               </div>
               <h1 className="text-3xl font-black text-gray-900">Fechamento de Caixa</h1>
               <p className="text-gray-500 mt-2">Insira as leituras de fechamento para calcular as vendas do dia.</p>
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
               <AlertTriangle size={18} />
               {error}
            </div>
         )}
         {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium flex items-center gap-2">
               <CheckCircle2 size={18} />
               {success}
            </div>
         )}

         {/* Main Table - Venda Concentrador */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-green-50">
               <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Fuel size={20} className="text-blue-600" />
                  Venda Concentrador
               </h2>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-gray-100 border-b border-gray-200 text-xs uppercase font-bold text-gray-600">
                        <th className="px-4 py-3 text-left">Produtos</th>
                        <th className="px-4 py-3 text-right">Inicial</th>
                        <th className="px-4 py-3 text-right bg-yellow-50">Fechamento</th>
                        <th className="px-4 py-3 text-right">Litros</th>
                        <th className="px-4 py-3 text-right">Valor LT $</th>
                        <th className="px-4 py-3 text-right">Venda bico R$</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {bicos.map((bico) => {
                        const colors = FUEL_COLORS[bico.combustivel.codigo] || FUEL_COLORS['GC'];
                        const inicial = leituras[bico.id]?.inicial || '';
                        const fechamento = leituras[bico.id]?.fechamento || '';
                        const hasValue = fechamento.length > 0;
                        const isValid = isInputValid(bico.id);
                        const litros = calcLitros(bico.id);
                        const venda = calcVenda(bico.id);

                        return (
                           <tr key={bico.id} className={`hover:bg-gray-50 ${colors.bg}`}>
                              {/* Produtos - Combustivel + Bico */}
                              <td className={`px-4 py-3 font-bold ${colors.text}`}>
                                 {bico.combustivel.codigo}, Bico {bico.numero.toString().padStart(2, '0')}
                              </td>

                              {/* Inicial (INPUT) */}
                              <td className="px-4 py-3">
                                 <input
                                    type="text"
                                    value={inicial}
                                    onChange={(e) => handleInicialChange(bico.id, e.target.value)}
                                    className="w-full text-right font-mono py-2 px-3 rounded-lg border-2 outline-none transition-all border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="0,000"
                                 />
                              </td>

                              {/* Fechamento (INPUT) */}
                              <td className="px-4 py-3 bg-yellow-50/50">
                                 <input
                                    type="text"
                                    value={fechamento}
                                    onChange={(e) => handleFechamentoChange(bico.id, e.target.value)}
                                    className={`w-full text-right font-mono font-bold py-2 px-3 rounded-lg border-2 outline-none transition-all
                          ${!isValid
                                          ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-200'
                                          : hasValue
                                             ? 'border-green-400 bg-green-50 text-green-700 focus:ring-green-200'
                                             : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-100'}
                          focus:ring-2
                        `}
                                    placeholder="0,000"
                                 />
                              </td>

                              {/* Litros */}
                              <td className={`px-4 py-3 text-right font-mono font-bold ${hasValue && litros > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                 {hasValue ? formatNumber(litros, 2) : '-'}
                              </td>

                              {/* Valor LT */}
                              <td className="px-4 py-3 text-right font-mono text-gray-700">
                                 {formatCurrency(bico.combustivel.preco_venda)}
                              </td>

                              {/* Venda bico R$ */}
                              <td className={`px-4 py-3 text-right font-mono font-bold ${hasValue && venda > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                 {hasValue ? formatCurrency(venda) : '-'}
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>

                  {/* TOTAL Row */}
                  <tfoot>
                     <tr className="bg-gray-200 font-black text-gray-900 border-t-2 border-gray-300">
                        <td className="px-4 py-4">Total.</td>
                        <td className="px-4 py-4 text-right">-</td>
                        <td className="px-4 py-4 text-right">-</td>
                        <td className="px-4 py-4 text-right font-mono text-blue-700 text-lg">
                           {formatNumber(totals.litros, 2)}
                        </td>
                        <td className="px-4 py-4 text-right">-</td>
                        <td className="px-4 py-4 text-right font-mono text-green-700 text-lg">
                           {formatCurrency(totals.valor)}
                        </td>
                     </tr>
                  </tfoot>
               </table>
            </div>
         </div>

         {/* Summary by Fuel Type */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
               <h2 className="text-lg font-bold text-gray-900">Resumo por Combustível</h2>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="bg-gray-100 border-b border-gray-200 text-xs uppercase font-bold text-gray-600">
                        <th className="px-4 py-3 text-left">Combustível</th>
                        <th className="px-4 py-3 text-right">Litros</th>
                        <th className="px-4 py-3 text-right">Valor R$</th>
                        <th className="px-4 py-3 text-right">%</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {summaryData.map((item) => {
                        const colors = FUEL_COLORS[item.codigo] || FUEL_COLORS['GC'];
                        const percentage = calcPercentage(item.litros);

                        return (
                           <tr key={item.codigo} className={`${colors.bg}`}>
                              <td className={`px-4 py-3 font-bold ${colors.text}`}>
                                 <span className={`inline-block px-2 py-1 rounded ${colors.bg} ${colors.border} border`}>
                                    {item.nome}
                                 </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                                 {formatNumber(item.litros, 2)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-green-700">
                                 {formatCurrency(item.valor)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-700">
                                 {percentage.toFixed(0)}%
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
                  <tfoot>
                     <tr className="bg-gray-200 font-black text-gray-900 border-t-2 border-gray-300">
                        <td className="px-4 py-4">TOTAL</td>
                        <td className="px-4 py-4 text-right font-mono text-blue-700 text-lg">
                           {formatNumber(totals.litros, 2)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-green-700 text-lg">
                           {formatCurrency(totals.valor)}
                        </td>
                        <td className="px-4 py-4 text-right">100%</td>
                     </tr>
                  </tfoot>
               </table>
            </div>
         </div>

         {/* Fixed Footer */}
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">

               <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Litros</span>
                     <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-blue-600">{formatNumber(totals.litros, 0)}</span>
                        <span className="text-sm font-bold text-gray-400">L</span>
                     </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Faturamento Total</span>
                     <div className="text-2xl font-black text-green-600">
                        {formatCurrency(totals.valor)}
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                     onClick={() => setLeituras({})}
                     className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                     Limpar
                  </button>
                  <button
                     onClick={handleSave}
                     disabled={saving || totals.litros === 0}
                     className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {saving ? (
                        <>
                           <Loader2 size={18} className="animate-spin" />
                           Salvando...
                        </>
                     ) : (
                        <>
                           <Save size={18} />
                           Salvar Fechamento
                        </>
                     )}
                  </button>
               </div>

            </div>
         </div>
      </div>
   );
};

export default DailyClosingScreen;