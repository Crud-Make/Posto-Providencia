
import React, { useState, useEffect } from 'react';
import { 
  Fuel, 
  Calendar, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  Edit2,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  FileText,
  Loader2
} from 'lucide-react';
import { fetchClosingData } from '../services/api';
import { ClosingPaymentInput, ClosingAttendantInput, FuelSummary, NozzleData } from '../types';

const DailyClosingScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  // Data fetched from API
  const [dailySummary, setDailySummary] = useState<FuelSummary[]>([]);
  const [nozzleData, setNozzleData] = useState<NozzleData[]>([]);
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [isFinalized, setIsFinalized] = useState(false);
  const [confirmReadings, setConfirmReadings] = useState(false);
  const [finalConfirmation, setFinalConfirmation] = useState(false);

  // -- STATE: Step 2 (Payments) --
  const [paymentInputs, setPaymentInputs] = useState<ClosingPaymentInput[]>([
    { id: '1', method: 'credit', label: 'Sipag', value: 0, machine: 'Sipag' },
    { id: '2', method: 'credit', label: 'Azulzinha', value: 0, machine: 'Azul' },
    { id: '3', method: 'debit', label: 'Sipag', value: 0, machine: 'Sipag' },
    { id: '4', method: 'debit', label: 'Azulzinha', value: 0, machine: 'Azul' },
    { id: '5', method: 'pix', label: 'Valor', value: 0 },
    { id: '6', method: 'cash', label: 'Valor', value: 0 },
  ]);

  // -- STATE: Step 3 (Attendants) --
  const [attendants, setAttendants] = useState<ClosingAttendantInput[]>([]);
  const [expandedAttendant, setExpandedAttendant] = useState<string | null>(null);

  // Fetch Data on Mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchClosingData();
        setDailySummary(data.summaryData);
        setNozzleData(data.nozzleData);
        setAttendants(data.attendantsData);
      } catch (error) {
        console.error("Error loading closing data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // -- CALCULATIONS --
  const totalSalesExpected = dailySummary.reduce((acc, curr) => acc + curr.totalValue, 0);
  const dateStr = new Date().toLocaleDateString('pt-BR');

  // Step 2 Calculations
  const calcPaymentTotal = () => paymentInputs.reduce((acc, curr) => acc + curr.value, 0);
  const totalReceived = calcPaymentTotal();
  const paymentDifference = totalSalesExpected - totalReceived;
  
  const getSubtotalByMethod = (method: string) => 
    paymentInputs.filter(p => p.method === method).reduce((acc, curr) => acc + curr.value, 0);

  // Step 3 Calculations
  const getAttendantTotal = (att: ClosingAttendantInput) => 
    att.declared.card + att.declared.note + att.declared.pix + att.declared.cash;
  
  const getAttendantDiff = (att: ClosingAttendantInput) => 
    getAttendantTotal(att) - att.expectedValue;

  const totalAttendantDiff = attendants.reduce((acc, att) => acc + getAttendantDiff(att), 0);

  // -- HANDLERS --
  const handlePaymentChange = (id: string, newValue: number) => {
    setPaymentInputs(prev => prev.map(p => p.id === id ? { ...p, value: newValue } : p));
  };

  const handleAttendantChange = (id: string, field: keyof ClosingAttendantInput['declared'], value: number) => {
    setAttendants(prev => prev.map(att => 
      att.id === id ? { ...att, declared: { ...att.declared, [field]: value } } : att
    ));
  };

  const handleAttendantObs = (id: string, obs: string) => {
    setAttendants(prev => prev.map(att => att.id === id ? { ...att, observation: obs } : att));
  };

  const handleFinalize = () => {
    setIsFinalized(true);
    // In a real app, this would make an API POST call
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full text-blue-600">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Carregando dados do fechamento...</p>
      </div>
    );
  }

  const renderStepIndicator = () => (
    <div className="flex items-center w-full max-w-3xl mx-auto mb-8">
      {[
        { step: 1, label: 'Vendas' },
        { step: 2, label: 'Recebimentos' },
        { step: 3, label: 'Frentistas' },
        { step: 4, label: 'Resumo' }
      ].map((s, idx) => (
        <React.Fragment key={s.step}>
          <div className="flex flex-col items-center relative z-10 cursor-pointer" onClick={() => !isFinalized && setCurrentStep(s.step)}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-200
              ${currentStep === s.step ? 'bg-[#22c55e] text-white shadow-md ring-4 ring-green-50' : 
                currentStep > s.step ? 'bg-[#22c55e] text-white' : 'bg-white border-2 border-gray-200 text-gray-400'}
            `}>
              {currentStep > s.step ? <Check size={18} /> : s.step}
            </div>
            <span className={`text-xs font-semibold mt-2 ${currentStep === s.step ? 'text-gray-900' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {idx < 3 && <div className={`flex-1 h-0.5 -mx-2 mb-6 transition-colors duration-200 ${currentStep > s.step ? 'bg-[#22c55e]' : 'bg-gray-200'}`}></div>}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1_Sales = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">📊 Vendas por Combustível</h3>
        </div>
        <div className="p-6">
           {dailySummary.length === 0 ? <p className="text-gray-500 text-center py-4">Sem dados de venda.</p> : (
             <table className="w-full text-sm text-gray-600">
               <thead>
                 <tr className="text-gray-500 border-b border-gray-100">
                   <th className="pb-3 text-left font-medium">Produto</th>
                   <th className="pb-3 text-right font-medium">Litros</th>
                   <th className="pb-3 text-right font-medium">Preço/L</th>
                   <th className="pb-3 text-right font-medium">Total</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {dailySummary.map((item) => (
                   <tr key={item.id} className="group hover:bg-gray-50">
                      <td className="py-3 flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${item.color === 'text-green-500' ? 'bg-green-500' : item.color === 'text-blue-500' ? 'bg-blue-500' : item.color === 'text-yellow-500' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                          <span className="font-medium text-gray-900">{item.name}</span>
                      </td>
                      <td className="py-3 text-right font-mono">{item.volume.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="py-3 text-right font-mono">R$ {item.avgPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="py-3 text-right font-bold text-gray-900">R$ {item.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                   </tr>
                 ))}
                 <tr className="bg-gray-50 font-bold">
                   <td className="py-3 pl-4 text-gray-900">TOTAL</td>
                   <td className="py-3 text-right">-</td>
                   <td className="py-3 text-right">-</td>
                   <td className="py-3 text-right pr-4">R$ {totalSalesExpected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                 </tr>
               </tbody>
             </table>
           )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900">📋 Detalhes por Bico</h3>
         </div>
         <div className="overflow-x-auto">
             {nozzleData.length === 0 ? <p className="text-gray-500 text-center py-8">Sem dados de bicos.</p> : (
               <table className="w-full text-sm text-left text-gray-600">
                  <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                     <tr>
                        <th className="px-6 py-3">Bico</th>
                        <th className="px-6 py-3">Produto</th>
                        <th className="px-6 py-3 text-right">Inicial</th>
                        <th className="px-6 py-3 text-right">Final</th>
                        <th className="px-6 py-3 text-right">Litros</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {nozzleData.map((row) => (
                        <tr key={row.id} className={row.status === 'NoSales' ? 'bg-yellow-50/50' : 'hover:bg-gray-50'}>
                           <td className="px-6 py-3 font-bold text-gray-900">{row.bico}</td>
                           <td className="px-6 py-3">{row.product}</td>
                           <td className="px-6 py-3 text-right font-mono text-gray-500">{row.startReading.toLocaleString('pt-BR', {minimumFractionDigits: 3})}</td>
                           <td className="px-6 py-3 text-right font-mono text-gray-500">{row.endReading.toLocaleString('pt-BR', {minimumFractionDigits: 3})}</td>
                           <td className="px-6 py-3 text-right font-bold text-gray-900">{row.volume.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
             )}
         </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <input 
            type="checkbox" 
            id="confirm1" 
            checked={confirmReadings} 
            onChange={(e) => setConfirmReadings(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer bg-white"
          />
          <label htmlFor="confirm1" className="text-gray-900 font-medium cursor-pointer select-none">
              Confirmo que as leituras estão corretas
          </label>
      </div>

      <div className="flex justify-between pt-4">
         <button className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <Edit2 size={18} />
            Editar Leituras
         </button>
         <button 
            onClick={() => setCurrentStep(2)}
            disabled={!confirmReadings}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-colors shadow-lg
               ${confirmReadings ? 'bg-[#22c55e] hover:bg-green-600 shadow-green-200' : 'bg-gray-300 cursor-not-allowed'}
            `}
         >
            Confirmar e Avançar
            <ArrowRight size={18} />
         </button>
      </div>
    </div>
  );

  const renderPaymentInput = (input: ClosingPaymentInput) => (
    <div key={input.id} className="flex justify-between items-center py-2">
       <span className="text-gray-600 font-medium text-sm">{input.label}</span>
       <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
          <input 
             type="number" 
             value={input.value}
             onChange={(e) => handlePaymentChange(input.id, parseFloat(e.target.value) || 0)}
             className="w-32 py-1.5 pl-8 pr-3 text-right border border-gray-300 bg-white rounded-md focus:ring-green-500 focus:border-green-500 font-mono font-bold text-gray-900"
          />
       </div>
    </div>
  );

  const renderStep2_Payments = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
       <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center">
          <span className="text-blue-800 font-bold">💰 Total de Vendas (Bombas)</span>
          <span className="text-blue-900 font-black text-xl">R$ {totalSalesExpected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Credit */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold border-b border-gray-100 pb-2">
                <CreditCard size={18} className="text-gray-500" />
                CARTÃO DE CRÉDITO
             </div>
             {paymentInputs.filter(p => p.method === 'credit').map(renderPaymentInput)}
             <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
                <span className="font-bold text-gray-900">R$ {getSubtotalByMethod('credit').toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
             </div>
          </div>

          {/* Debit */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold border-b border-gray-100 pb-2">
                <CreditCard size={18} className="text-gray-500" />
                CARTÃO DE DÉBITO
             </div>
             {paymentInputs.filter(p => p.method === 'debit').map(renderPaymentInput)}
             <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
                <span className="font-bold text-gray-900">R$ {getSubtotalByMethod('debit').toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
             </div>
          </div>

          {/* Pix */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold border-b border-gray-100 pb-2">
                <Smartphone size={18} className="text-gray-500" />
                PIX
             </div>
             {paymentInputs.filter(p => p.method === 'pix').map(renderPaymentInput)}
             <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
                <span className="font-bold text-gray-900">R$ {getSubtotalByMethod('pix').toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
             </div>
          </div>

          {/* Money */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold border-b border-gray-100 pb-2">
                <Banknote size={18} className="text-gray-500" />
                DINHEIRO
             </div>
             {paymentInputs.filter(p => p.method === 'cash').map(renderPaymentInput)}
             <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
                <span className="font-bold text-gray-900">R$ {getSubtotalByMethod('cash').toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
             </div>
          </div>
       </div>

       {/* Summary Footer for Step 2 */}
       <div className={`p-6 rounded-xl border-2 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-300
         ${Math.abs(paymentDifference) < 0.01 ? 'bg-green-50 border-[#22c55e]' : paymentDifference > 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}
       `}>
          <div>
             <h3 className="font-bold text-gray-900 text-lg">📊 RESUMO</h3>
             <div className="space-y-1 mt-2 text-sm text-gray-600">
                <p className="flex justify-between w-64"><span>Total Vendas (Bombas):</span> <span>R$ {totalSalesExpected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                <p className="flex justify-between w-64"><span>Total Recebido:</span> <span>R$ {totalReceived.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold text-gray-500 uppercase mb-1">DIFERENÇA (FALTA/SOBRA)</p>
             <p className={`text-3xl font-black ${Math.abs(paymentDifference) < 0.01 ? 'text-[#22c55e]' : paymentDifference > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {paymentDifference > 0 ? '-' : '+'} R$ {Math.abs(paymentDifference).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
             </p>
             {Math.abs(paymentDifference) < 0.01 && <span className="text-[#22c55e] font-bold text-sm flex items-center justify-end gap-1"><CheckCircle2 size={14}/> Caixa fechou certinho!</span>}
             {paymentDifference > 0 && <span className="text-red-600 font-bold text-sm flex items-center justify-end gap-1"><AlertTriangle size={14}/> Falta no caixa</span>}
          </div>
       </div>

       <div className="flex justify-between pt-4">
          <button onClick={() => setCurrentStep(1)} className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={18} /> Voltar
          </button>
          <button onClick={() => setCurrentStep(3)} className="flex items-center gap-2 px-6 py-3 bg-[#0d1b13] text-white rounded-lg font-bold hover:bg-black transition-colors shadow-lg">
            Próxima Etapa <ArrowRight size={18} />
          </button>
       </div>
    </div>
  );

  const renderStep3_Attendants = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
       <div className={`p-4 rounded-lg flex items-center gap-3 ${paymentDifference > 0 ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
          <AlertOctagon size={20} />
          <span className="font-medium">
             Diferença Total do Caixa: <strong>{paymentDifference > 0 ? '-' : '+'} R$ {Math.abs(paymentDifference).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>. 
             Vamos identificar de quem é a diferença...
          </span>
       </div>

       <div className="space-y-4">
          {attendants.length === 0 ? <p className="text-center text-gray-500 py-4">Nenhum frentista registrado.</p> : attendants.map((att) => {
             const total = getAttendantTotal(att);
             const diff = getAttendantDiff(att);
             const isExpanded = expandedAttendant === att.id;
             const hasDiff = Math.abs(diff) > 0.01;
             
             return (
               <div key={att.id} className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden transition-all duration-300
                  ${!hasDiff ? 'border-l-[#22c55e] border-gray-200' : diff < 0 ? 'border-l-red-500 border-red-100 ring-1 ring-red-50' : 'border-l-blue-500 border-gray-200'}
               `}>
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpandedAttendant(isExpanded ? null : att.id)}>
                     <div className="flex items-center gap-4">
                        <img src={att.avatar} alt={att.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                        <div>
                           <h4 className="font-bold text-gray-900 text-lg">{att.name}</h4>
                           <p className="text-xs text-gray-500">Esperado: R$ {att.expectedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-6">
                        <div className="text-right">
                           <p className="text-xs text-gray-400 uppercase font-bold">Informado</p>
                           <p className="font-bold text-gray-900">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        </div>
                        <div className="text-right w-32">
                           <p className="text-xs text-gray-400 uppercase font-bold">Diferença</p>
                           <p className={`font-bold ${!hasDiff ? 'text-[#22c55e]' : diff < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {hasDiff ? (diff < 0 ? `R$ ${diff.toLocaleString('pt-BR')}` : `+ R$ ${diff.toLocaleString('pt-BR')}`) : 'OK'}
                           </p>
                        </div>
                        {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                     </div>
                  </div>

                  {isExpanded && (
                     <div className="p-6 bg-gray-50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-3">
                           <h5 className="font-bold text-gray-700 text-sm border-b border-gray-200 pb-2">Declarar Valores</h5>
                           {(['card', 'note', 'pix', 'cash'] as const).map(type => (
                              <div key={type} className="flex justify-between items-center">
                                 <span className="text-sm font-medium text-gray-600 capitalize">
                                    {type === 'card' ? 'Cartão' : type === 'note' ? 'Nota a Prazo' : type === 'cash' ? 'Dinheiro' : 'Pix'}
                                 </span>
                                 <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                                    <input 
                                       type="number"
                                       value={att.declared[type]}
                                       onChange={(e) => handleAttendantChange(att.id, type, parseFloat(e.target.value) || 0)}
                                       className="w-28 py-1 pl-7 pr-2 text-right text-sm border border-gray-300 bg-white text-gray-900 rounded focus:ring-green-500 focus:border-green-500"
                                    />
                                 </div>
                              </div>
                           ))}
                           <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                              <span>Total Informado</span>
                              <span>R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                           </div>
                        </div>

                        <div className="space-y-4">
                            <h5 className="font-bold text-gray-700 text-sm border-b border-gray-200 pb-2">Conferência</h5>
                            <div className="bg-white p-4 rounded border border-gray-200">
                               <div className="flex justify-between text-sm mb-2">
                                  <span className="text-gray-500">Valor Conferido (Sistema)</span>
                                  <span className="font-bold text-gray-900">R$ {att.expectedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                               </div>
                               <div className="flex justify-between text-lg font-bold">
                                  <span className={`${hasDiff ? 'text-red-600' : 'text-gray-700'}`}>{diff < 0 ? 'FALTA' : diff > 0 ? 'SOBRA' : 'Diferença'}</span>
                                  <span className={`${!hasDiff ? 'text-[#22c55e]' : diff < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                      {Math.abs(diff).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                  </span>
                               </div>
                            </div>
                            
                            {hasDiff && (
                               <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1">Observação (Obrigatório)</label>
                                  <textarea 
                                    value={att.observation || ''}
                                    onChange={(e) => handleAttendantObs(att.id, e.target.value)}
                                    placeholder="Justifique a diferença..."
                                    className="w-full text-sm border-red-300 focus:border-red-500 focus:ring-red-500 rounded-md bg-red-50 text-gray-900"
                                    rows={2}
                                  />
                                </div>
                            )}
                        </div>
                     </div>
                  )}
               </div>
             );
          })}
       </div>

       {/* General Summary of Step 3 */}
       <div className="bg-gray-900 text-white p-5 rounded-xl flex justify-between items-center shadow-lg">
           <div>
              <p className="text-gray-400 text-xs font-bold uppercase">Total de Diferenças</p>
              <p className="text-2xl font-bold">{totalAttendantDiff < 0 ? '-' : '+'} R$ {Math.abs(totalAttendantDiff).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
           </div>
           {Math.abs(totalAttendantDiff - (totalReceived - totalSalesExpected)) < 1 ? (
               <div className="flex items-center gap-2 text-[#22c55e] font-bold bg-white/10 px-4 py-2 rounded-lg">
                   <CheckCircle2 size={20} />
                   Diferença identificada!
               </div>
           ) : (
               <div className="flex items-center gap-2 text-red-400 font-bold bg-white/10 px-4 py-2 rounded-lg">
                   <AlertTriangle size={20} />
                   Diferenças não batem
               </div>
           )}
       </div>

       <div className="flex justify-between pt-4">
          <button onClick={() => setCurrentStep(2)} className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={18} /> Voltar
          </button>
          <button onClick={() => setCurrentStep(4)} className="flex items-center gap-2 px-6 py-3 bg-[#0d1b13] text-white rounded-lg font-bold hover:bg-black transition-colors shadow-lg">
            Finalizar <ArrowRight size={18} />
          </button>
       </div>
    </div>
  );

  const renderStep4_Summary = () => (
     <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="text-center pb-4 border-b border-gray-200">
           <h2 className="text-2xl font-black text-gray-900">Resumo Final</h2>
           <p className="text-gray-500">Fechamento do dia {dateStr}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sales Summary */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                   <Fuel size={20} className="text-gray-400" /> VENDAS
                </h3>
                <div className="space-y-3 text-sm">
                   {dailySummary.map(d => (
                      <div key={d.id} className="flex justify-between">
                         <span className="text-gray-600">{d.name}</span>
                         <div className="flex gap-4">
                            <span className="text-gray-400">{d.volume.toLocaleString('pt-BR')} L</span>
                            <span className="font-bold text-gray-900 w-24 text-right">R$ {d.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                         </div>
                      </div>
                   ))}
                   <div className="pt-3 border-t border-gray-100 flex justify-between font-bold text-lg text-gray-900">
                      <span>TOTAL</span>
                      <span>R$ {totalSalesExpected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                </div>
            </div>

            {/* Receipts Summary */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                   <Banknote size={20} className="text-gray-400" /> RECEBIMENTOS
                </h3>
                <div className="space-y-3 text-sm">
                   <div className="flex justify-between">
                      <span className="text-gray-600">Cartão Crédito</span>
                      <span className="font-bold text-gray-900">R$ {getSubtotalByMethod('credit').toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">Cartão Débito</span>
                      <span className="font-bold text-gray-900">R$ {getSubtotalByMethod('debit').toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">Pix</span>
                      <span className="font-bold text-gray-900">R$ {getSubtotalByMethod('pix').toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">Dinheiro</span>
                      <span className="font-bold text-gray-900">R$ {getSubtotalByMethod('cash').toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="pt-3 border-t border-gray-100 flex justify-between font-bold text-lg text-gray-900">
                      <span>TOTAL RECEBIDO</span>
                      <span>R$ {totalReceived.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                </div>
            </div>
        </div>

        {/* Final Result Card */}
        <div className={`p-6 rounded-xl border-l-8 shadow-sm flex flex-col md:flex-row gap-6 ${paymentDifference > 0 ? 'bg-red-50 border-l-red-500' : 'bg-green-50 border-l-[#22c55e]'}`}>
           <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-4">📊 RESULTADO FINAL</h3>
              <div className="space-y-2 text-sm text-gray-700">
                 <div className="flex justify-between max-w-sm">
                    <span>Total Vendas</span>
                    <span className="font-bold">R$ {totalSalesExpected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                 </div>
                 <div className="flex justify-between max-w-sm">
                    <span>Total Recebido</span>
                    <span className="font-bold">R$ {totalReceived.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                 </div>
              </div>
           </div>
           <div className="flex flex-col justify-center items-end min-w-[200px]">
               <span className="text-xs font-bold text-gray-500 uppercase mb-1">DIFERENÇA FINAL</span>
               <span className={`text-4xl font-black ${paymentDifference > 0 ? 'text-red-600' : 'text-[#22c55e]'}`}>
                  {paymentDifference > 0 ? '-' : '+'} R$ {Math.abs(paymentDifference).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
               </span>
           </div>
        </div>

        <div>
           <label className="block text-sm font-bold text-gray-700 mb-2">Observações Gerais (Opcional)</label>
           <textarea className="w-full border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500" rows={3} placeholder="Movimento tranquilo. Falta será descontada..."></textarea>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <input 
               type="checkbox" 
               id="confirmFinal" 
               checked={finalConfirmation} 
               onChange={(e) => setFinalConfirmation(e.target.checked)}
               className="w-5 h-5 rounded border-gray-300 bg-white text-green-600 focus:ring-green-500 cursor-pointer"
            />
            <label htmlFor="confirmFinal" className="text-gray-900 font-medium cursor-pointer select-none">
               Confirmo que todas as informações estão corretas e desejo encerrar o caixa.
            </label>
        </div>

        <div className="flex justify-between pt-4">
          <button onClick={() => setCurrentStep(3)} className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="flex gap-3">
             <button className="flex items-center gap-2 px-6 py-3 border border-gray-300 bg-white rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                <Save size={18} /> Salvar Rascunho
             </button>
             <button 
                onClick={handleFinalize}
                disabled={!finalConfirmation}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-colors shadow-lg
                   ${finalConfirmation ? 'bg-[#22c55e] hover:bg-green-600 shadow-green-200' : 'bg-gray-300 cursor-not-allowed'}
                `}
             >
                <CheckCircle2 size={18} /> FINALIZAR FECHAMENTO
             </button>
          </div>
       </div>
     </div>
  );

  const renderSuccessModal = () => (
     <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
           <div className="bg-[#22c55e] p-6 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Check size={40} strokeWidth={4} />
              </div>
              <h2 className="text-2xl font-black">FECHAMENTO CONCLUÍDO!</h2>
              <p className="opacity-90 mt-1">Caixa do dia {dateStr}</p>
           </div>
           <div className="p-8 text-center space-y-6">
              <div className="space-y-2 text-gray-600">
                 <p className="flex items-center justify-center gap-2"><FileText size={18}/> PDF gerado automaticamente</p>
                 <p className="flex items-center justify-center gap-2"><ArrowRight size={18}/> Email enviado para gerencia@posto.com</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <button className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50">Visualizar</button>
                 <button className="px-4 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-black">Baixar PDF</button>
              </div>
              <button onClick={() => window.location.reload()} className="text-gray-400 text-sm hover:text-gray-600">Fechar janela</button>
           </div>
        </div>
     </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
         <div>
            <div className="flex items-center gap-2 text-[#22c55e] font-bold text-xs uppercase tracking-wider mb-1">
               <Calendar size={14} /> Fechamento Diário
            </div>
            <h1 className="text-3xl font-black text-gray-900">{dateStr}</h1>
         </div>
         {!isFinalized && (
            <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-lg text-sm font-bold border border-orange-100 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
               Em andamento
            </div>
         )}
      </div>

      {/* Wizard Progress */}
      {renderStepIndicator()}

      {/* Step Content */}
      <div className="min-h-[400px]">
         {currentStep === 1 && renderStep1_Sales()}
         {currentStep === 2 && renderStep2_Payments()}
         {currentStep === 3 && renderStep3_Attendants()}
         {currentStep === 4 && renderStep4_Summary()}
      </div>

      {isFinalized && renderSuccessModal()}
    </div>
  );
};

export default DailyClosingScreen;
