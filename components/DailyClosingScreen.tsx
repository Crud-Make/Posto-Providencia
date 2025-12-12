import React, { useState, useEffect, useMemo } from 'react';
import {
   Fuel,
   Calendar,
   CheckCircle2,
   AlertTriangle,
   Save as SaveIcon,
   Loader2,
   RefreshCw,
   Printer,
   X,
   Clock,
   User,
   CreditCard,
   Banknote,
   Smartphone,
   FileText,
   HelpCircle,
   Info
} from 'lucide-react';
import { bicoService, leituraService, frentistaService, turnoService, formaPagamentoService } from '../services/api';
import type { Bico, Bomba, Combustivel, Leitura, Frentista, Turno, FormaPagamento } from '../services/database.types';

// Type for bico with related data
type BicoWithDetails = Bico & { bomba: Bomba; combustivel: Combustivel };

// Payment entry type
interface PaymentEntry {
   tipo: string;
   valor: string;
}

// Fuel colors (mantendo para visualização)
const FUEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
   'GC': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
   'GA': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
   'ET': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
   'S10': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
   'DIESEL': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
};

// Turn options
const DEFAULT_TURNOS = [
   { id: 1, nome: 'Manhã', horario_inicio: '06:00', horario_fim: '14:00' },
   { id: 2, nome: 'Tarde', horario_inicio: '14:00', horario_fim: '22:00' },
   { id: 3, nome: 'Noite', horario_inicio: '22:00', horario_fim: '06:00' },
];

const DailyClosingScreen: React.FC = () => {
   // State
   const [bicos, setBicos] = useState<BicoWithDetails[]>([]);
   const [leituras, setLeituras] = useState<Record<number, { inicial: string; fechamento: string }>>({});
   const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

   // Additional states
   const [frentistas, setFrentistas] = useState<Frentista[]>([]);
   const [turnos, setTurnos] = useState<Turno[]>([]);
   const [selectedTurno, setSelectedTurno] = useState<number | null>(null);
   const [selectedFrentista, setSelectedFrentista] = useState<number | null>(null);
   const [observacoes, setObservacoes] = useState<string>('');
   const [showHelp, setShowHelp] = useState(false);

   // Payment entries
   const [payments, setPayments] = useState<PaymentEntry[]>([
      { tipo: 'dinheiro', valor: '' },
      { tipo: 'cartao_credito', valor: '' },
      { tipo: 'cartao_debito', valor: '' },
      { tipo: 'pix', valor: '' },
   ]);

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

         // Fetch frentistas
         const frentistasData = await frentistaService.getAll();
         setFrentistas(frentistasData);

         // Fetch turnos
         const turnosData = await turnoService.getAll();
         setTurnos(turnosData.length > 0 ? turnosData : DEFAULT_TURNOS as Turno[]);

         // Auto-populate inicial with last reading
         const leiturasMap: Record<number, { inicial: string; fechamento: string }> = {};

         await Promise.all(
            bicosData.map(async (bico) => {
               const lastReading = await leituraService.getLastReadingByBico(bico.id);

               leiturasMap[bico.id] = {
                  inicial: lastReading?.leitura_final?.toFixed(3).replace('.', ',') || '',
                  fechamento: ''
               };
            })
         );

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
      const cleaned = value.replace(/[^\d,]/g, '').replace(/(\..*\.)/g, '$1');
      setLeituras(prev => ({
         ...prev,
         [bicoId]: { ...prev[bicoId], inicial: cleaned }
      }));
   };

   // Handle fechamento input change
   const handleFechamentoChange = (bicoId: number, value: string) => {
      const cleaned = value.replace(/[^\d,]/g, '').replace(/(\..*\.)/g, '$1');
      setLeituras(prev => ({
         ...prev,
         [bicoId]: { ...prev[bicoId], fechamento: cleaned }
      }));
   };

   // Handle payment change
   const handlePaymentChange = (index: number, value: string) => {
      const cleaned = value.replace(/[^\d,]/g, '').replace(/(\..*\.)/g, '$1');
      setPayments(prev => {
         const updated = [...prev];
         updated[index] = { ...updated[index], valor: cleaned };
         return updated;
      });
   };

   // Parse value from string (BR format: 1.234,567)
   const parseValue = (value: string): number => {
      if (!value) return 0;
      const cleaned = value.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
   };

   // Format value to BR format with 3 decimals
   const formatToBR = (num: number, decimals: number = 3): string => {
      if (num === 0) return '0,' + '0'.repeat(decimals);

      const parts = num.toFixed(decimals).split('.');
      const integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const decimal = parts[1] || '0'.repeat(decimals);

      return `${integer},${decimal}`;
   };

   // Calculate litros for a bico (EXATO como planilha)
   const calcLitros = (bicoId: number): { value: number; display: string } => {
      const inicial = parseValue(leituras[bicoId]?.inicial || '');
      const fechamento = parseValue(leituras[bicoId]?.fechamento || '');

      // REGRA DA PLANILHA: Se fechamento ≤ inicial → mostra "-"
      if (fechamento <= inicial || fechamento === 0) {
         return { value: 0, display: '-' };
      }

      const litros = fechamento - inicial;
      return { value: litros, display: formatToBR(litros, 3) };
   };

   // Calculate venda for a bico (EXATO como planilha)
   const calcVenda = (bicoId: number): { value: number; display: string } => {
      const bico = bicos.find(b => b.id === bicoId);
      if (!bico) return { value: 0, display: '-' };

      const litros = calcLitros(bicoId);

      // REGRA DA PLANILHA: Se litros = "-" → venda = "-"
      if (litros.display === '-') {
         return { value: 0, display: '-' };
      }

      const venda = litros.value * bico.combustivel.preco_venda;
      return {
         value: venda,
         display: venda.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
         })
      };
   };

   // Check if reading is valid for calculation
   const isReadingValid = (bicoId: number): boolean => {
      const fechamento = parseValue(leituras[bicoId]?.fechamento || '');
      const inicial = parseValue(leituras[bicoId]?.inicial || '');
      return fechamento > inicial;
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

         const litrosData = calcLitros(bico.id);
         const vendaData = calcVenda(bico.id);

         if (litrosData.display !== '-') {
            summary[codigo].litros += litrosData.value;
            summary[codigo].valor += vendaData.value;
         }
      });

      return Object.values(summary);
   };

   // Calculate totals (usando useMemo para performance)
   const totals = useMemo(() => {
      let totalLitros = 0;
      let totalValor = 0;

      bicos.forEach(bico => {
         const litrosData = calcLitros(bico.id);
         const vendaData = calcVenda(bico.id);

         if (litrosData.display !== '-') {
            totalLitros += litrosData.value;
            totalValor += vendaData.value;
         }
      });

      return {
         litros: totalLitros,
         valor: totalValor,
         litrosDisplay: formatToBR(totalLitros, 3),
         valorDisplay: totalValor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
         })
      };
   }, [bicos, leituras]);

   // Calculate total payments
   const totalPayments = useMemo(() => {
      return payments.reduce((acc, p) => acc + parseValue(p.valor), 0);
   }, [payments]);

   // Calculate difference
   const diferenca = useMemo(() => {
      return totalPayments - totals.valor;
   }, [totalPayments, totals.valor]);

   // Calculate percentage
   const calcPercentage = (litros: number): number => {
      if (totals.litros === 0) return 0;
      return (litros / totals.litros) * 100;
   };

   // Handle cancel
   const handleCancel = () => {
      setLeituras({});
      setPayments([
         { tipo: 'dinheiro', valor: '' },
         { tipo: 'cartao_credito', valor: '' },
         { tipo: 'cartao_debito', valor: '' },
         { tipo: 'pix', valor: '' },
      ]);
      setObservacoes('');
      setSelectedTurno(null);
      setSelectedFrentista(null);
      setSuccess(null);
      setError(null);
      loadData();
   };

   // Handle print
   const handlePrint = () => {
      window.print();
   };

   // Handle save
   const handleSave = async () => {
      try {
         setSaving(true);
         setError(null);
         setSuccess(null);

         // Build leituras array
         const leiturasToCreate = bicos
            .filter(bico => isReadingValid(bico.id))
            .map(bico => ({
               bico_id: bico.id,
               data: selectedDate,
               leitura_inicial: parseValue(leituras[bico.id]?.inicial || ''),
               leitura_final: parseValue(leituras[bico.id]?.fechamento || ''),
               preco_litro: bico.combustivel.preco_venda,
               usuario_id: 1, // TODO: Get from auth context
            }));

         if (leiturasToCreate.length === 0) {
            setError('Nenhuma leitura válida para salvar. O fechamento deve ser maior que o inicial.');
            return;
         }

         await leituraService.bulkCreate(leiturasToCreate);

         setSuccess(`${leiturasToCreate.length} leituras salvas com sucesso!`);

         // Reset only fechamento fields, keep inicial for next turn
         const updatedLeituras = { ...leituras };
         bicos.forEach(bico => {
            if (updatedLeituras[bico.id]) {
               updatedLeituras[bico.id].fechamento = '';
            }
         });
         setLeituras(updatedLeituras);

         // Reload data
         await loadData();

      } catch (err) {
         console.error('Error saving readings:', err);
         setError('Erro ao salvar leituras. Tente novamente.');
      } finally {
         setSaving(false);
      }
   };

   // Get payment icon
   const getPaymentIcon = (tipo: string) => {
      switch (tipo) {
         case 'dinheiro': return <Banknote size={18} className="text-green-600" />;
         case 'cartao_credito': return <CreditCard size={18} className="text-blue-600" />;
         case 'cartao_debito': return <CreditCard size={18} className="text-purple-600" />;
         case 'pix': return <Smartphone size={18} className="text-cyan-600" />;
         default: return <FileText size={18} className="text-gray-600" />;
      }
   };

   // Get payment label
   const getPaymentLabel = (tipo: string) => {
      switch (tipo) {
         case 'dinheiro': return 'Dinheiro';
         case 'cartao_credito': return 'Cartão Crédito';
         case 'cartao_debito': return 'Cartão Débito';
         case 'pix': return 'PIX';
         default: return tipo;
      }
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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-32 print:pb-0 print:max-w-none">

         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
            <div>
               <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2 bg-blue-50 px-3 py-1 rounded-full w-fit">
                  <Fuel size={14} />
                  Venda Concentrador
               </div>
               <h1 className="text-3xl font-black text-gray-900">Fechamento de Caixa</h1>
               <p className="text-gray-500 mt-2">Insira as leituras de fechamento para calcular as vendas do dia.</p>
            </div>

            <div className="flex flex-wrap gap-4">
               {/* Date Picker */}
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                     <Calendar size={12} />
                     Data do Fechamento
                  </span>
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

               {/* Turno Selector */}
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                     <Clock size={12} />
                     Turno
                  </span>
                  <select
                     value={selectedTurno || ''}
                     onChange={(e) => setSelectedTurno(e.target.value ? Number(e.target.value) : null)}
                     className="h-[42px] px-4 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-semibold text-gray-900 outline-none cursor-pointer hover:border-gray-300 transition-colors"
                  >
                     <option value="">Selecionar turno...</option>
                     {turnos.map(turno => (
                        <option key={turno.id} value={turno.id}>
                           {turno.nome} ({turno.horario_inicio} - {turno.horario_fim})
                        </option>
                     ))}
                  </select>
               </div>

               {/* Frentista Selector */}
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                     <User size={12} />
                     Frentista Responsável
                  </span>
                  <select
                     value={selectedFrentista || ''}
                     onChange={(e) => setSelectedFrentista(e.target.value ? Number(e.target.value) : null)}
                     className="h-[42px] px-4 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-semibold text-gray-900 outline-none cursor-pointer hover:border-gray-300 transition-colors"
                  >
                     <option value="">Selecionar frentista...</option>
                     {frentistas.map(frentista => (
                        <option key={frentista.id} value={frentista.id}>
                           {frentista.nome}
                        </option>
                     ))}
                  </select>
               </div>

               {/* Refresh Button */}
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">&nbsp;</span>
                  <button
                     onClick={loadData}
                     className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm hover:bg-gray-50 transition-colors"
                     title="Atualizar dados"
                  >
                     <RefreshCw size={18} className="text-gray-500" />
                  </button>
               </div>

               {/* Help Button */}
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">&nbsp;</span>
                  <button
                     onClick={() => setShowHelp(!showHelp)}
                     className={`flex items-center gap-2 border rounded-lg px-4 py-2.5 shadow-sm transition-colors ${showHelp ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                     title="Ajuda"
                  >
                     <HelpCircle size={18} />
                  </button>
               </div>
            </div>
         </div>

         {/* Help Panel */}
         {showHelp && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 print:hidden">
               <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                     <Info size={24} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                     <h3 className="font-bold text-blue-900 mb-3">Como preencher o fechamento</h3>
                     <ul className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                           <span className="font-bold text-blue-600">1.</span>
                           <span><strong>Data e Turno:</strong> Selecione a data do fechamento e o turno de trabalho.</span>
                        </li>
                        <li className="flex items-start gap-2">
                           <span className="font-bold text-blue-600">2.</span>
                           <span><strong>Leituras:</strong> O valor <em>Inicial</em> é preenchido automaticamente. Digite o valor de <em>Fechamento</em>.</span>
                        </li>
                        <li className="flex items-start gap-2">
                           <span className="font-bold text-blue-600">3.</span>
                           <span><strong>Formato:</strong> Use vírgula como separador decimal (ex: 1.234,567).</span>
                        </li>
                        <li className="flex items-start gap-2">
                           <span className="font-bold text-blue-600">4.</span>
                           <span><strong>Cálculo:</strong> O sistema calcula automaticamente os litros e valores ao digitar.</span>
                        </li>
                     </ul>
                  </div>
                  <button
                     onClick={() => setShowHelp(false)}
                     className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                     <X size={18} className="text-blue-600" />
                  </button>
               </div>
            </div>
         )}

         {/* Error/Success Messages */}
         {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium flex items-center gap-2 print:hidden">
               <AlertTriangle size={18} />
               {error}
            </div>
         )}
         {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium flex items-center gap-2 print:hidden">
               <CheckCircle2 size={18} />
               {success}
            </div>
         )}

         {/* Print Header */}
         <div className="hidden print:block mb-8">
            <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
               <h1 className="text-2xl font-black">FECHAMENTO DE CAIXA</h1>
               <p className="text-lg mt-2">Data: {new Date(selectedDate).toLocaleDateString('pt-BR')}</p>
               {selectedTurno && (
                  <p>Turno: {turnos.find(t => t.id === selectedTurno)?.nome || '-'}</p>
               )}
               {selectedFrentista && (
                  <p>Frentista: {frentistas.find(f => f.id === selectedFrentista)?.nome || '-'}</p>
               )}
            </div>
         </div>

         {/* Main Table - Venda Concentrador (EXATO como planilha) */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-yellow-50 to-green-50 border-gray-200">
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
                        const litrosData = calcLitros(bico.id);
                        const vendaData = calcVenda(bico.id);
                        const isValid = isReadingValid(bico.id);

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
                                    className="w-full text-right font-mono py-2 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                                    placeholder="0,000"
                                 />
                              </td>

                              {/* Fechamento (INPUT) */}
                              <td className="px-4 py-3 bg-yellow-50/50">
                                 <input
                                    type="text"
                                    value={fechamento}
                                    onChange={(e) => handleFechamentoChange(bico.id, e.target.value)}
                                    className={`w-full text-right font-mono py-2 px-3 rounded-lg border outline-none
                                    ${fechamento && !isValid
                                          ? 'border-red-300 bg-red-50 text-red-700'
                                          : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100'}
                                    `}
                                    placeholder="0,000"
                                 />
                              </td>

                              {/* Litros (CALCULADO - exibe "-" quando inválido) */}
                              <td className="px-4 py-3 text-right font-mono font-bold text-gray-700">
                                 {litrosData.display}
                              </td>

                              {/* Valor LT $ (FIXO - igual planilha) */}
                              <td className="px-4 py-3 text-right font-mono text-gray-500 bg-gray-50">
                                 R$ {bico.combustivel.preco_venda.toFixed(2).replace('.', ',')}
                              </td>

                              {/* Venda bico R$ (CALCULADO - exibe "-" quando litros = "-") */}
                              <td className="px-4 py-3 text-right font-mono font-bold text-gray-700">
                                 {vendaData.display}
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>

                  {/* TOTAL Row (EXATO como planilha - "RES X,XX") */}
                  <tfoot>
                     <tr className="bg-gray-200 font-black text-gray-900 border-t-2 border-gray-300">
                        <td className="px-4 py-4">Total.</td>
                        <td className="px-4 py-4 text-right">-</td>
                        <td className="px-4 py-4 text-right">-</td>
                        <td className="px-4 py-4 text-right">-</td>
                        <td className="px-4 py-4 text-right">-</td>
                        <td className="px-4 py-4 text-right font-mono text-green-700 text-lg">
                           RES {totals.valorDisplay}
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
                                 {formatToBR(item.litros, 3)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-green-700">
                                 {item.valor.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                 })}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-700">
                                 {percentage.toFixed(1)}%
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
                  <tfoot>
                     <tr className="bg-gray-200 font-black text-gray-900 border-t-2 border-gray-300">
                        <td className="px-4 py-4">TOTAL</td>
                        <td className="px-4 py-4 text-right font-mono text-blue-700 text-lg">
                           {totals.litrosDisplay}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-green-700 text-lg">
                           {totals.valorDisplay}
                        </td>
                        <td className="px-4 py-4 text-right">100%</td>
                     </tr>
                  </tfoot>
               </table>
            </div>
         </div>

         {/* Payments Section */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:break-inside-avoid">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
               <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard size={20} className="text-blue-600" />
                  Recebimentos por Forma de Pagamento
               </h2>
            </div>

            <div className="p-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {payments.map((payment, index) => (
                     <div key={payment.tipo} className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                           {getPaymentIcon(payment.tipo)}
                           {getPaymentLabel(payment.tipo)}
                        </label>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                           <input
                              type="text"
                              value={payment.valor}
                              onChange={(e) => handlePaymentChange(index, e.target.value)}
                              className="w-full pl-10 pr-4 py-3 text-right font-mono font-bold rounded-lg border-2 border-gray-200 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              placeholder="0,00"
                           />
                        </div>
                     </div>
                  ))}
               </div>

               {/* Payment Totals */}
               <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-blue-50 rounded-lg p-4">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Recebido</span>
                        <p className="text-2xl font-black text-blue-700 mt-1">
                           {totalPayments.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                           })}
                        </p>
                     </div>
                     <div className="bg-green-50 rounded-lg p-4">
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Vendas</span>
                        <p className="text-2xl font-black text-green-700 mt-1">{totals.valorDisplay}</p>
                     </div>
                     <div className={`rounded-lg p-4 ${diferenca >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <span className={`text-xs font-bold uppercase tracking-wider ${diferenca >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                           Diferença
                        </span>
                        <p className={`text-2xl font-black mt-1 ${diferenca >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                           {diferenca >= 0 ? '+' : ''}{diferenca.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                           })}
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Observations Section */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:break-inside-avoid">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
               <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={20} className="text-gray-600" />
                  Observações e Notas
               </h2>
            </div>
            <div className="p-6">
               <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Digite observações sobre o fechamento, ocorrências, problemas com equipamentos, etc..."
                  className="w-full h-32 px-4 py-3 rounded-lg border-2 border-gray-200 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
               />
            </div>
         </div>

         {/* Fixed Footer */}
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 print:hidden">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">

               <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Litros</span>
                     <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-blue-600">{totals.litrosDisplay}</span>
                        <span className="text-sm font-bold text-gray-400">L</span>
                     </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Faturamento Total</span>
                     <div className="text-2xl font-black text-green-600">
                        {totals.valorDisplay}
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Cancel Button */}
                  <button
                     onClick={handleCancel}
                     className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                     <X size={18} />
                     Cancelar
                  </button>

                  {/* Print Button */}
                  <button
                     onClick={handlePrint}
                     disabled={totals.litros === 0}
                     className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <Printer size={18} />
                     Imprimir
                  </button>

                  {/* Save Button */}
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
                           <SaveIcon size={18} />
                           Salvar
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