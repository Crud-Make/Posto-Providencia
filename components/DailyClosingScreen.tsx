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
  Edit2,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { fetchClosingData } from '../services/api';
import { ClosingReceipts, ClosingAttendant, FuelSummary, NozzleData } from '../types';

const DailyClosingScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  // --- STATE ---
  const [dailySummary, setDailySummary] = useState<FuelSummary[]>([]);
  const [nozzleData, setNozzleData] = useState<NozzleData[]>([]);
  const [attendants, setAttendants] = useState<ClosingAttendant[]>([]);
  
  // Wizard & Flow
  const [currentStep, setCurrentStep] = useState(1);
  const [isFinalized, setIsFinalized] = useState(false);
  
  // Step 1: Sales Confirmation
  const [salesConfirmed, setSalesConfirmed] = useState(false);

  // Step 2: Receipts
  const [receipts, setReceipts] = useState<ClosingReceipts>({
    credit: { sipag: 0, azulzinha: 0 },
    debit: { sipag: 0, azulzinha: 0 },
    pix: 0,
    cash: 0
  });

  // Step 4: Final Confirmation
  const [finalObs, setFinalObs] = useState('');
  const [finalCheck, setFinalCheck] = useState(false);

  // UI State
  const [expandedAttendant, setExpandedAttendant] = useState<string | null>(null);

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

  // --- CALCULATIONS ---

  // Total Sales (From Step 1 Data)
  const totalSalesExpected = nozzleData.reduce((acc, curr) => acc + curr.total, 0);
  const totalLiters = nozzleData.reduce((acc, curr) => acc + curr.volume, 0);

  // Total Receipts (From Step 2 Inputs)
  const subtotalCredit = receipts.credit.sipag + receipts.credit.azulzinha;
  const subtotalDebit = receipts.debit.sipag + receipts.debit.azulzinha;
  const totalReceived = subtotalCredit + subtotalDebit + receipts.pix + receipts.cash;
  
  // Difference (Sales - Receipts)
  const cashDifference = totalSalesExpected - totalReceived; // Positive = Missing Money, Negative = Surplus? Actually:
  // Usually: Difference = Received - Sales. If Negative -> Missing. If Positive -> Surplus.
  // But PRD says: "Falta" (Missing) is Negative. So: Received - Sales.
  const differenceVal = totalReceived - totalSalesExpected;

  // Attendants Calculations
  const getAttendantTotalInfo = (att: ClosingAttendant) => 
    att.declared.card + att.declared.note + att.declared.pix + att.declared.cash;
  
  const getAttendantDiff = (att: ClosingAttendant) => 
    getAttendantTotalInfo(att) - att.expectedValue;

  const totalAttendantDiff = attendants.reduce((acc, att) => acc + getAttendantDiff(att), 0);

  // --- HANDLERS ---

  const handleReceiptChange = (category: keyof ClosingReceipts, subKey: string | null, value: string) => {
    const numValue = parseFloat(value) || 0;
    setReceipts(prev => {
      if (subKey && typeof prev[category] === 'object') {
        return {
          ...prev,
          [category]: {
            ...(prev[category] as any),
            [subKey]: numValue
          }
        };
      } else {
        return {
          ...prev,
          [category]: numValue
        };
      }
    });
  };

  const handleAttendantChange = (id: string, field: keyof ClosingAttendant['declared'], value: string) => {
    const numValue = parseFloat(value) || 0;
    setAttendants(prev => prev.map(att => 
      att.id === id ? { ...att, declared: { ...att.declared, [field]: numValue } } : att
    ));
  };

  const handleAttendantObs = (id: string, obs: string) => {
    setAttendants(prev => prev.map(att => att.id === id ? { ...att, observation: obs } : att));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full text-blue-600">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Carregando dados do fechamento...</p>
      </div>
    );
  }

  // --- RENDER STEPS ---

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
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-200 ring-offset-2
              ${currentStep === s.step ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600' : 
                currentStep > s.step ? 'bg-green-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-400'}
            `}>
              {currentStep > s.step ? <Check size={18} /> : s.step}
            </div>
            <span className={`text-xs font-semibold mt-2 ${currentStep === s.step ? 'text-blue-700' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {idx < 3 && <div className={`flex-1 h-0.5 -mx-2 mb-6 transition-colors duration-200 ${currentStep > s.step ? 'bg-green-500' : 'bg-gray-200'}`}></div>}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1_Sales = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Resumo por Combustível */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
               <Fuel size={18} className="text-blue-600"/> 
               Vendas por Combustível
            </h3>
        </div>
        <div className="overflow-x-auto">
             <table className="w-full text-sm text-gray-600">
               <thead>
                 <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-semibold text-gray-500">
                   <th className="px-6 py-3 text-left">Produto</th>
                   <th className="px-6 py-3 text-right">Litros</th>
                   <th className="px-6 py-3 text-right">Preço/L</th>
                   <th className="px-6 py-3 text-right">Total</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {dailySummary.map((item) => (
                   <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 flex items-center gap-2 font-medium text-gray-900">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.colorClass.split(' ')[0]}`}></div>
                          {item.name}
                      </td>
                      <td className="px-6 py-3 text-right font-mono">{item.volume.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-3 text-right font-mono">R$ {item.avgPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-3 text-right font-bold text-gray-900">R$ {item.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                   </tr>
                 ))}
                 <tr className="bg-gray-100/50 font-bold border-t border-gray-200">
                   <td className="px-6 py-4 text-gray-900">TOTAL</td>
                   <td className="px-6 py-4 text-right">{totalLiters.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                   <td className="px-6 py-4 text-right">-</td>
                   <td className="px-6 py-4 text-right text-lg text-blue-700">R$ {totalSalesExpected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                 </tr>
               </tbody>
             </table>
        </div>
      </div>

      {/* Detalhes por Bico (Excel-like) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
               <FileText size={18} className="text-gray-500"/> 
               Detalhes por Bico
            </h3>
         </div>
         <div className="overflow-x-auto">
               <table className="w-full text-sm text-left text-gray-600">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                     <tr>
                        <th className="px-4 py-3 text-center">Bico</th>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3 text-right">Inicial</th>
                        <th className="px-4 py-3 text-right">Final</th>
                        <th className="px-4 py-3 text-right">Litros</th>
                        <th className="px-4 py-3 text-right">Total R$</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-xs md:text-sm">
                     {nozzleData.map((row) => (
                        <tr key={row.id} className={row.status === 'NoSales' ? 'bg-yellow-50/30' : 'hover:bg-gray-50'}>
                           <td className="px-4 py-3 font-bold text-gray-900 text-center">{row.bico.toString().padStart(2, '0')}</td>
                           <td className="px-4 py-3 font-sans">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                 row.productCode === 'GC' ? 'bg-green-50 text-green-700 border-green-200' :
                                 row.productCode === 'GA' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                 row.productCode === 'ET' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                 {row.productCode}
                              </span>
                           </td>
                           <td className="px-4 py-3 text-right text-gray-500">{row.initialReading.toLocaleString('pt-BR', {minimumFractionDigits: 3})}</td>
                           <td className="px-4 py-3 text-right text-gray-900 font-bold">{row.finalReading.toLocaleString('pt-BR', {minimumFractionDigits: 3})}</td>
                           <td className="px-4 py-3 text-right text-gray-900">{row.volume.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                           <td className="px-4 py-3 text-right font-bold text-gray-900">{row.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
         </div>
      </div>

      {/* Warning if NoSales */}
      {nozzleData.some(n => n.status === 'NoSales') && (
         <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
               <span className="font-bold">Atenção:</span> Alguns bicos (ex: 04) não registraram vendas hoje. Verifique se isso está correto.
            </div>
         </div>
      )}

      {/* Confirmation Checkbox */}
      <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors bg-white">
          <input 
            type="checkbox" 
            checked={salesConfirmed} 
            onChange={(e) => setSalesConfirmed(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-900 font-medium select-none">
              Confirmo que as leituras e totais estão corretos
          </span>
      </label>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
         <button className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm">
            <Edit2 size={16} /> Editar Leituras
         </button>
         <button 
            onClick={() => setCurrentStep(2)}
            disabled={!salesConfirmed}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white transition-all shadow-md text-sm
               ${salesConfirmed ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg' : 'bg-gray-300 cursor-not-allowed shadow-none'}
            `}
         >
            Confirmar e Avançar <ArrowRight size={16} />
         </button>
      </div>
    </div>
  );

  const renderReceiptInput = (label: string, value: number, onChange: (val: string) => void) => (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
       <span className="text-gray-600 font-medium text-sm">{label}</span>
       <div className="relative w-36">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
          <input 
             type="number" 
             value={value === 0 ? '' : value}
             onChange={(e) => onChange(e.target.value)}
             placeholder="0,00"
             className="w-full py-1.5 pl-8 pr-3 text-right border border-gray-300 bg-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono font-bold text-gray-900 text-sm outline-none transition-all"
          />
       </div>
    </div>
  );

  const renderStep2_Receipts = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
       
       <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Banknote size={24} />
             </div>
             <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total de Vendas (Bombas)</p>
                <p className="text-2xl font-black text-blue-900">R$ {totalSalesExpected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Credit Card */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold border-b border-gray-100 pb-2">
                <CreditCard size={18} className="text-blue-500" />
                CARTÃO DE CRÉDITO
             </div>
             <div className="space-y-1">
                {renderReceiptInput('Sipag', receipts.credit.sipag, (v) => handleReceiptChange('credit', 'sipag', v))}
                {renderReceiptInput('Azulzinha', receipts.credit.azulzinha, (v) => handleReceiptChange('credit', 'azulzinha', v))}
             </div>
             <div className="flex justify-between items-center pt-3 mt-2 bg-gray-50 -mx-5 -mb-5 px-5 py-3 border-t border-gray-100 rounded-b-xl">
                <span className="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
                <span className="font-bold text-gray-900">R$ {subtotalCredit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
             </div>
          </div>

          {/* Debit Card */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold border-b border-gray-100 pb-2">
                <CreditCard size={18} className="text-green-500" />
                CARTÃO DE DÉBITO
             </div>
             <div className="space-y-1">
                {renderReceiptInput('Sipag', receipts.debit.sipag, (v) => handleReceiptChange('debit', 'sipag', v))}
                {renderReceiptInput('Azulzinha', receipts.debit.azulzinha, (v) => handleReceiptChange('debit', 'azulzinha', v))}
             </div>
             <div className="flex justify-between items-center pt-3 mt-2 bg-gray-50 -mx-5 -mb-5 px-5 py-3 border-t border-gray-100 rounded-b-xl">
                <span className="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
                <span className="font-bold text-gray-900">R$ {subtotalDebit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
             </div>
          </div>

          {/* Pix */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold border-b border-gray-100 pb-2">
                <Smartphone size={18} className="text-purple-500" />
                PIX
             </div>
             <div className="space-y-1">
                {renderReceiptInput('Valor Total', receipts.pix, (v) => handleReceiptChange('pix', null, v))}
             </div>
             <div className="flex justify-between items-center pt-3 mt-2 bg-gray-50 -mx-5 -mb-5 px-5 py-3 border-t border-gray-100 rounded-b-xl">
                <span className="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
                <span className="font-bold text-gray-900">R$ {receipts.pix.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
             </div>
          </div>

          {/* Cash */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold border-b border-gray-100 pb-2">
                <Banknote size={18} className="text-yellow-600" />
                DINHEIRO
             </div>
             <div className="space-y-1">
                {renderReceiptInput('Valor Total', receipts.cash, (v) => handleReceiptChange('cash', null, v))}
             </div>
             <div className="flex justify-between items-center pt-3 mt-2 bg-gray-50 -mx-5 -mb-5 px-5 py-3 border-t border-gray-100 rounded-b-xl">
                <span className="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
                <span className="font-bold text-gray-900">R$ {receipts.cash.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
             </div>
          </div>
       </div>

       {/* Live Summary Footer */}
       <div className={`p-6 rounded-xl border-l-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition-all duration-300
         ${Math.abs(differenceVal) < 0.01 ? 'bg-green-50 border-green-500' : differenceVal < 0 ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}
       `}>
          <div>
             <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                📊 RESUMO PARCIAL
             </h3>
             <div className="mt-2 text-sm text-gray-700 font-medium space-y-1">
                <p>Total Recebido: <strong>R$ {totalReceived.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold text-gray-500 uppercase mb-1">DIFERENÇA (RECEBIDO - VENDAS)</p>
             <div className="flex items-center justify-end gap-2">
                {Math.abs(differenceVal) < 0.01 && <CheckCircle2 size={24} className="text-green-600"/>}
                {differenceVal < 0 && <AlertTriangle size={24} className="text-red-600"/>}
                {differenceVal > 0 && <AlertCircle size={24} className="text-blue-600"/>}
                
                <p className={`text-3xl font-black ${Math.abs(differenceVal) < 0.01 ? 'text-green-600' : differenceVal < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                   {differenceVal > 0 ? '+' : ''} R$ {differenceVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
             </div>
             <p className="text-xs font-bold opacity-70 mt-1">
                {Math.abs(differenceVal) < 0.01 ? 'CAIXA FECHOU CERTINHO!' : differenceVal < 0 ? 'FALTA NO CAIXA' : 'SOBRA NO CAIXA'}
             </p>
          </div>
       </div>

       <div className="flex justify-between pt-4">
          <button onClick={() => setCurrentStep(1)} className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm">
            <ArrowLeft size={16} /> Voltar
          </button>
          <button onClick={() => setCurrentStep(3)} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md text-sm">
            Próxima Etapa <ArrowRight size={16} />
          </button>
       </div>
    </div>
  );

  const renderStep3_Attendants = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
       
       <div className={`p-4 rounded-xl flex items-center gap-3 border ${differenceVal < 0 ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
          <AlertOctagon size={24} className="shrink-0" />
          <div className="text-sm">
             <p className="font-bold text-base">Diferença Total do Caixa: {differenceVal > 0 ? '+' : ''} R$ {differenceVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
             <p className="opacity-80">Vamos identificar de quem é a diferença conferindo os valores individuais.</p>
          </div>
       </div>

       <div className="space-y-4">
          {attendants.map((att) => {
             const total = getAttendantTotalInfo(att);
             const diff = getAttendantDiff(att);
             const isExpanded = expandedAttendant === att.id;
             const hasDiff = Math.abs(diff) > 0.01;
             
             return (
               <div key={att.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300
                  ${isExpanded ? 'ring-2 ring-blue-100' : ''}
                  ${!hasDiff ? 'border-green-200' : diff < 0 ? 'border-red-200' : 'border-blue-200'}
               `}>
                  {/* Header Row */}
                  <div 
                    className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors
                       ${!hasDiff ? 'bg-green-50/30' : diff < 0 ? 'bg-red-50/30' : 'bg-blue-50/30'}
                    `} 
                    onClick={() => setExpandedAttendant(isExpanded ? null : att.id)}
                  >
                     <div className="flex items-center gap-4">
                        <img src={att.avatar} alt={att.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                        <div>
                           <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900 text-lg">{att.name}</h4>
                              {att.hasHistory && (
                                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-200">
                                   ⚠️ Histórico
                                </span>
                              )}
                           </div>
                           <p className="text-xs text-gray-500">Esperado (Sistema): <strong>R$ {att.expectedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></p>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                           <p className="text-xs text-gray-400 uppercase font-bold">Total Informado</p>
                           <p className="font-bold text-gray-900 text-lg">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        </div>
                        
                        <div className={`text-right px-3 py-1.5 rounded-lg border ${!hasDiff ? 'bg-green-100 border-green-200' : diff < 0 ? 'bg-red-100 border-red-200' : 'bg-blue-100 border-blue-200'}`}>
                           <p className="text-[10px] uppercase font-bold opacity-60">Diferença</p>
                           <p className={`font-black ${!hasDiff ? 'text-green-700' : diff < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                              {hasDiff ? (diff < 0 ? `R$ ${diff.toLocaleString('pt-BR')}` : `+ R$ ${diff.toLocaleString('pt-BR')}`) : 'OK'}
                           </p>
                        </div>
                        
                        {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                     </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                     <div className="p-6 bg-white border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Inputs */}
                            <div>
                               <h5 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                                  <Edit2 size={14} className="text-gray-400"/> Conferência de Valores
                               </h5>
                               <div className="space-y-3">
                                  {/* Helper to render inputs */}
                                  {(['card', 'note', 'pix', 'cash'] as const).map(type => (
                                     <div key={type} className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-600 capitalize w-24">
                                           {type === 'card' ? 'Cartão' : type === 'note' ? 'Nota' : type === 'cash' ? 'Dinheiro' : 'Pix'}
                                        </span>
                                        <div className="relative flex-1 max-w-[140px]">
                                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                                           <input 
                                              type="number"
                                              value={att.declared[type] || ''}
                                              onChange={(e) => handleAttendantChange(att.id, type, e.target.value)}
                                              placeholder="0,00"
                                              className="w-full py-1.5 pl-7 pr-3 text-right text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900"
                                           />
                                        </div>
                                     </div>
                                  ))}
                                  <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-gray-900 mt-2">
                                     <span>Total</span>
                                     <span>R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                  </div>
                               </div>
                            </div>

                            {/* Analysis */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                               <div>
                                  <h5 className="font-bold text-gray-900 text-sm mb-2">Resultado da Conferência</h5>
                                  <div className="flex justify-between items-center mb-4 text-sm">
                                      <span className="text-gray-500">Sistema (Esperado)</span>
                                      <span className="font-mono text-gray-900">R$ {att.expectedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                  </div>
                                  <div className={`flex justify-between items-center p-3 rounded-lg border ${!hasDiff ? 'bg-green-100 border-green-200 text-green-800' : diff < 0 ? 'bg-red-100 border-red-200 text-red-800' : 'bg-blue-100 border-blue-200 text-blue-800'}`}>
                                      <span className="font-bold uppercase text-xs">Diferença Final</span>
                                      <span className="font-black text-lg">
                                        {diff === 0 ? 'R$ 0,00' : (diff > 0 ? '+' : '') + diff.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                      </span>
                                  </div>
                               </div>

                               {hasDiff && (
                                  <div className="mt-4 animate-in fade-in">
                                     <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                        Justificativa da Diferença <span className="text-red-500">*</span>
                                     </label>
                                     <textarea 
                                       value={att.observation || ''}
                                       onChange={(e) => handleAttendantObs(att.id, e.target.value)}
                                       placeholder="Ex: Esqueceu de lançar nota a prazo..."
                                       className="w-full text-sm border-gray-300 focus:ring-2 focus:ring-blue-500 rounded-lg p-2 min-h-[60px]"
                                     />
                                  </div>
                               )}
                            </div>
                        </div>
                     </div>
                  )}
               </div>
             );
          })}
       </div>

       {/* Footer Summary Step 3 */}
       <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
           <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total de Diferenças (Frentistas)</p>
              <p className={`text-2xl font-black ${totalAttendantDiff < 0 ? 'text-red-600' : totalAttendantDiff > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                  {totalAttendantDiff > 0 ? '+' : ''} R$ {totalAttendantDiff.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </p>
           </div>
           
           {/* Logic: Sum of differences should match the total cash difference. Allow small floating point error */}
           {Math.abs(totalAttendantDiff - differenceVal) < 1 ? (
               <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                   <CheckCircle2 size={20} />
                   <span className="font-bold text-sm">Diferenças identificadas e batem com o caixa!</span>
               </div>
           ) : (
               <div className="flex items-center gap-2 text-red-700 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                   <AlertTriangle size={20} />
                   <span className="font-bold text-sm">Diferenças não explicam o total do caixa. Revise.</span>
               </div>
           )}
       </div>

       <div className="flex justify-between pt-4">
          <button onClick={() => setCurrentStep(2)} className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm">
            <ArrowLeft size={16} /> Voltar
          </button>
          <button onClick={() => setCurrentStep(4)} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md text-sm">
            Resumo e Finalização <ArrowRight size={16} />
          </button>
       </div>
    </div>
  );

  const renderStep4_Summary = () => (
     <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="text-center pb-6 border-b border-gray-200">
           <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600 mb-2">
              <Calendar size={14} /> {new Date().toLocaleDateString('pt-BR')}
           </div>
           <h2 className="text-2xl font-black text-gray-900">Resumo Final do Fechamento</h2>
           <p className="text-gray-500 text-sm">Revise todos os dados antes de finalizar.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sales Summary */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                   <Fuel size={18} className="text-blue-500" /> VENDAS
                </h3>
                <div className="space-y-2 text-sm">
                   {dailySummary.map(d => (
                      <div key={d.id} className="flex justify-between items-center">
                         <span className="text-gray-600">{d.name}</span>
                         <div className="flex gap-4 font-medium">
                            <span className="text-gray-400">{d.volume.toLocaleString('pt-BR')} L</span>
                            <span className="text-gray-900 min-w-[80px] text-right">R$ {d.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                         </div>
                      </div>
                   ))}
                   <div className="pt-3 border-t border-gray-100 flex justify-between font-bold text-base text-gray-900">
                      <span>TOTAL</span>
                      <span>R$ {totalSalesExpected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                </div>
            </div>

            {/* Receipts Summary */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                   <Banknote size={18} className="text-green-500" /> RECEBIMENTOS
                </h3>
                <div className="space-y-2 text-sm">
                   <div className="flex justify-between">
                      <span className="text-gray-600">Cartão Crédito</span>
                      <span className="font-bold text-gray-900">R$ {subtotalCredit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">Cartão Débito</span>
                      <span className="font-bold text-gray-900">R$ {subtotalDebit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">Pix</span>
                      <span className="font-bold text-gray-900">R$ {receipts.pix.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">Dinheiro</span>
                      <span className="font-bold text-gray-900">R$ {receipts.cash.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                   <div className="pt-3 border-t border-gray-100 flex justify-between font-bold text-base text-gray-900">
                      <span>TOTAL RECEBIDO</span>
                      <span>R$ {totalReceived.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                   </div>
                </div>
            </div>
        </div>

        {/* Attendants Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
               <div className="flex items-center gap-2">👷 FRENTISTAS</div>
            </h3>
            <div className="space-y-3">
               {attendants.map(att => {
                  const diff = getAttendantDiff(att);
                  return (
                     <div key={att.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                        <span className="font-medium text-gray-700">{att.name}</span>
                        <div className="flex items-center gap-4">
                           <span className="text-gray-500">R$ {getAttendantTotalInfo(att).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                           <span className={`font-bold min-w-[80px] text-right ${diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {diff === 0 ? '✅ OK' : (diff > 0 ? '+' : '') + diff.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                           </span>
                        </div>
                     </div>
                  )
               })}
            </div>
        </div>

        {/* Final Result Card */}
        <div className={`p-6 rounded-xl border-l-8 shadow-md flex flex-col md:flex-row gap-8 items-center
             ${differenceVal < 0 ? 'bg-red-50 border-red-500' : differenceVal > 0 ? 'bg-blue-50 border-blue-500' : 'bg-green-50 border-green-500'}
        `}>
           <div className="flex-1 space-y-2">
              <h3 className="font-black text-gray-900 text-xl">📊 RESULTADO FINAL</h3>
              <div className="grid grid-cols-2 gap-4 text-sm max-w-sm">
                 <span className="text-gray-600">Total Vendas:</span>
                 <span className="font-bold text-right">R$ {totalSalesExpected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                 <span className="text-gray-600">Total Recebido:</span>
                 <span className="font-bold text-right">R$ {totalReceived.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
           </div>
           
           <div className="text-right">
               <p className="text-xs font-bold text-gray-500 uppercase mb-1">DIFERENÇA FINAL</p>
               <div className="text-4xl font-black mb-1 flex items-center justify-end gap-2">
                  <span className={`${differenceVal < 0 ? 'text-red-600' : differenceVal > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                     {differenceVal > 0 ? '+' : ''} R$ {differenceVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </span>
               </div>
               {differenceVal !== 0 && (
                   <div className="text-xs font-bold opacity-70">
                       {(Math.abs(differenceVal) / totalSalesExpected * 100).toFixed(2)}% do total
                   </div>
               )}
           </div>
        </div>

        {/* Final Actions */}
        <div className="space-y-4">
           <div>
               <label className="block text-sm font-bold text-gray-700 mb-2">Observações Gerais (Opcional)</label>
               <textarea 
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  rows={3} 
                  placeholder="Movimento tranquilo. Falta do caixa será descontada em folha..."
                  value={finalObs}
                  onChange={(e) => setFinalObs(e.target.value)}
               ></textarea>
           </div>

           <label className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-white transition-colors">
               <input 
                  type="checkbox" 
                  checked={finalCheck} 
                  onChange={(e) => setFinalCheck(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
               />
               <span className="text-gray-900 font-bold select-none">
                  Confirmo que verifiquei todas as informações e desejo encerrar o caixa.
               </span>
           </label>
        </div>

        <div className="flex justify-between pt-4 border-t border-gray-100">
          <button onClick={() => setCurrentStep(3)} className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="flex gap-3">
             <button className="flex items-center gap-2 px-6 py-3 border border-gray-300 bg-white rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors text-sm shadow-sm">
                <Save size={18} /> Salvar Rascunho
             </button>
             <button 
                onClick={() => setIsFinalized(true)}
                disabled={!finalCheck}
                className={`flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all shadow-lg text-sm
                   ${finalCheck ? 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/30' : 'bg-gray-300 cursor-not-allowed shadow-none'}
                `}
             >
                <CheckCircle2 size={18} /> FINALIZAR FECHAMENTO
             </button>
          </div>
       </div>
     </div>
  );

  const renderSuccessModal = () => (
     <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300 scale-100">
           <div className="bg-green-600 p-8 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 opacity-50 transform rotate-12 scale-150"></div>
              <div className="relative z-10">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-inner">
                     <Check size={48} strokeWidth={4} />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight">SUCESSO!</h2>
                  <p className="opacity-90 mt-2 font-medium">Caixa do dia {new Date().toLocaleDateString('pt-BR')} fechado.</p>
              </div>
           </div>
           <div className="p-8 text-center space-y-6">
              <div className="space-y-3 text-gray-600 text-sm">
                 <p className="flex items-center justify-center gap-2"><FileText size={18} className="text-blue-500"/> PDF gerado automaticamente</p>
                 <p className="flex items-center justify-center gap-2"><ArrowRight size={18} className="text-green-500"/> Email enviado para a gerência</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                 <button className="px-4 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors text-sm">Visualizar</button>
                 <button className="px-4 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors text-sm shadow-lg">Baixar PDF</button>
              </div>
              <button onClick={() => window.location.reload()} className="text-gray-400 text-xs font-bold hover:text-gray-600 uppercase tracking-wide">Fechar janela</button>
           </div>
        </div>
     </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500 pb-24">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
         <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1 bg-blue-50 px-2 py-1 rounded w-fit">
               <Calendar size={12} /> Gestão de Caixa
            </div>
            <h1 className="text-3xl font-black text-gray-900">Fechamento Diário</h1>
         </div>
         {!isFinalized && (
            <div className="hidden sm:flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-full text-xs font-bold border border-yellow-200 shadow-sm">
               <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
               Em andamento...
            </div>
         )}
      </div>

      {/* Wizard Progress */}
      {renderStepIndicator()}

      {/* Step Content */}
      <div className="min-h-[400px]">
         {currentStep === 1 && renderStep1_Sales()}
         {currentStep === 2 && renderStep2_Receipts()}
         {currentStep === 3 && renderStep3_Attendants()}
         {currentStep === 4 && renderStep4_Summary()}
      </div>

      {isFinalized && renderSuccessModal()}
    </div>
  );
};

export default DailyClosingScreen;