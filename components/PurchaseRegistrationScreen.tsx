import React, { useState, useMemo } from 'react';
import {
   FileText, Calculator, TrendingUp, Package, DollarSign, BarChart2, MoreVertical, Settings, Calendar
} from 'lucide-react';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   BarChart, Bar
} from 'recharts';

type CombustivelHibrido = {
   id: number;
   nome: string;
   codigo: string;
   // Campos de VENDA
   inicial: string;            // Leitura inicial
   fechamento: string;         // Leitura final
   valor_lt_venda: string;     // Preço de venda/litro
   // Campos de COMPRA
   compra_lt: string;          // Litros comprados
   compra_rs: string;          // Valor total da compra
   despesas_pct: string;       // % despesas do mês
   estoque_anterior: string;   // Estoque ano passado
};

const TABLE_INPUT_CLASS = "w-full px-2 py-1 text-right text-sm border border-gray-200 rounded focus:ring-2 focus:border-emerald-500 outline-none transition-all";
const TABLE_INPUT_ORANGE_CLASS = "w-full px-2 py-1 text-right text-sm border border-gray-200 rounded focus:ring-2 focus:border-orange-500 outline-none transition-all";

// Mock Data for Charts
const salesTrendData = [
   { name: 'Seg', vendas: 12000, proj: null },
   { name: 'Ter', vendas: 13500, proj: null },
   { name: 'Qua', vendas: 11800, proj: null },
   { name: 'Qui', vendas: 14200, proj: null },
   { name: 'Sex', vendas: 15600, proj: null },
   { name: 'Sab', vendas: 17800, proj: 17800 },
   { name: 'Dom', vendas: null, proj: 18200 },
];

const costRevenueData = [
   { name: 'Sem 1', receita: 45000, custo: 38000 },
   { name: 'Sem 2', receita: 48000, custo: 40000 },
   { name: 'Sem 3', receita: 46000, custo: 39000 },
   { name: 'Proj.', receita: 52000, custo: 43000 },
];

const PurchaseRegistrationScreen: React.FC = () => {
   // State com dados unificados
   const [combustiveis, setCombustiveis] = useState<CombustivelHibrido[]>([
      { id: 1, nome: 'G. Comum.', codigo: 'GC', inicial: '', fechamento: '', valor_lt_venda: '', compra_lt: '', compra_rs: '', despesas_pct: '', estoque_anterior: '' },
      { id: 2, nome: 'G. Aditivada.', codigo: 'GA', inicial: '', fechamento: '', valor_lt_venda: '', compra_lt: '', compra_rs: '', despesas_pct: '', estoque_anterior: '' },
      { id: 3, nome: 'Etanol.', codigo: 'ET', inicial: '', fechamento: '', valor_lt_venda: '', compra_lt: '', compra_rs: '', despesas_pct: '', estoque_anterior: '' },
      { id: 4, nome: 'Ds. S10.', codigo: 'DS10', inicial: '', fechamento: '', valor_lt_venda: '', compra_lt: '', compra_rs: '', despesas_pct: '', estoque_anterior: '' },
   ]);

   // Parse value from string (BR format: 1.234,567)
   const parseValue = (value: string): number => {
      if (!value || value.trim() === '') return 0;
      const cleaned = value.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
   };

   // Format value to BR format
   const formatToBR = (num: number, decimals: number = 2): string => {
      if (num === 0 || isNaN(num)) return '-';
      const parts = num.toFixed(decimals).split('.');
      const integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const decimal = parts[1] || '0'.repeat(decimals);
      return `${integer},${decimal}`;
   };

   const formatCurrency = (num: number, decimals: number = 2): string => {
      if (num === 0 || isNaN(num)) return '-';
      return `R$ ${formatToBR(num, decimals)}`;
   };

   // Format input value with thousand separators (Brazilian format)
   const formatInputValue = (value: string, allowDecimals: boolean = true): string => {
      if (!value) return '';

      // Remove tudo exceto dígitos e vírgula
      let cleaned = value.replace(/[^\d,]/g, '');

      // Garante apenas uma vírgula
      const parts = cleaned.split(',');
      if (parts.length > 2) {
         cleaned = parts[0] + ',' + parts.slice(1).join('');
      }

      if (allowDecimals && cleaned.includes(',')) {
         // Separar parte inteira e decimal
         const [intPart, decPart] = cleaned.split(',');
         // Adicionar pontos como separadores de milhar na parte inteira
         const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
         // Limitar decimais a 2 casas
         const formattedDec = decPart ? decPart.slice(0, 2) : '';
         return formattedInt + ',' + formattedDec;
      } else {
         // Apenas números inteiros - adicionar pontos como separadores de milhar
         const intOnly = cleaned.replace(',', '');
         return intOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
   };

   // Handle input changes
   const handleChange = (id: number, field: keyof CombustivelHibrido, value: string) => {
      // Campos que permitem decimais
      const decimalFields = ['valor_lt_venda', 'compra_rs', 'despesas_pct'];
      const allowDecimals = decimalFields.includes(field);

      const formatted = formatInputValue(value, allowDecimals);

      setCombustiveis(prev => prev.map(c => {
         if (c.id === id) {
            return { ...c, [field]: formatted };
         }
         return c;
      }));
   };

   // === CÁLCULOS DE COMPRA ===
   const calcMediaLtRs = (c: CombustivelHibrido): number => {
      const compra_lt = parseValue(c.compra_lt);
      const compra_rs = parseValue(c.compra_rs);
      if (compra_lt === 0) return 0;
      return compra_rs / compra_lt;
   };

   const calcDespesasMes = (c: CombustivelHibrido): number => {
      const compra_rs = parseValue(c.compra_rs);
      const pct = parseValue(c.despesas_pct) / 100;
      // Planilha: H19:=D390 (valor fixo de despesa do mês)
      // Como não temos esse valor, usamos o percentual sobre compra
      return compra_rs * pct;
   };

   const calcCompraEEstoque = (c: CombustivelHibrido): number => {
      return parseValue(c.estoque_anterior) + parseValue(c.compra_lt);
   };

   // === CÁLCULOS DE VENDA ===
   const calcLitrosVendidos = (c: CombustivelHibrido): number => {
      const inicial = parseValue(c.inicial);
      const fechamento = parseValue(c.fechamento);
      if (fechamento <= inicial) return 0;
      return fechamento - inicial;
   };

   const calcValorPorBico = (c: CombustivelHibrido): number => {
      const litros = calcLitrosVendidos(c);
      const valorLt = parseValue(c.valor_lt_venda);
      return litros * valorLt;
   };

   const calcLucroLt = (c: CombustivelHibrido): number => {
      const valorVenda = parseValue(c.valor_lt_venda);
      const custoMedio = calcMediaLtRs(c);
      if (custoMedio === 0) return 0;
      return valorVenda - custoMedio;
   };

   const calcLucroBico = (c: CombustivelHibrido): number => {
      const litros = calcLitrosVendidos(c);
      const lucroLt = calcLucroLt(c);
      return litros * lucroLt;
   };

   const calcMargemPct = (c: CombustivelHibrido): number => {
      const valorVenda = parseValue(c.valor_lt_venda);
      const lucroLt = calcLucroLt(c);
      if (valorVenda === 0) return 0;
      // Planilha: K5:=I5/G5 (Lucro LT / Preço Venda)
      return (lucroLt / valorVenda) * 100;
   };

   const calcEstoqueHoje = (c: CombustivelHibrido): number => {
      const compraEstoque = calcCompraEEstoque(c);
      const litrosVendidos = calcLitrosVendidos(c);
      return compraEstoque - litrosVendidos;
   };

   const calcPercaSobra = (c: CombustivelHibrido): number => {
      // Planilha: M19:=N19-L19 (Estoque Tanque - Estoque Hoje)
      // Requer campo estoque_tanque para funcionar corretamente
      // Por ora, retorna 0 pois não temos o dado do tanque físico
      return 0;
   };

   // === TOTAIS ===
   const totais = useMemo(() => {
      let totalLitros = 0;
      let totalValorBico = 0;
      let totalLucroBico = 0;
      let totalCompraLt = 0;
      let totalCompraRs = 0;
      let totalDespesas = 0;

      combustiveis.forEach(c => {
         totalLitros += calcLitrosVendidos(c);
         totalValorBico += calcValorPorBico(c);
         totalLucroBico += calcLucroBico(c);
         totalCompraLt += parseValue(c.compra_lt);
         totalCompraRs += parseValue(c.compra_rs);
         totalDespesas += calcDespesasMes(c);
      });

      const mediaTotal = totalCompraLt > 0 ? totalCompraRs / totalCompraLt : 0;
      // Margem média = lucro total / valor total de venda
      const margemMedia = totalValorBico > 0 ? (totalLucroBico / totalValorBico) * 100 : 0;

      return {
         totalLitros,
         totalValorBico,
         totalLucroBico,
         totalCompraLt,
         totalCompraRs,
         totalDespesas,
         mediaTotal,
         margemMedia
      };
   }, [combustiveis]);

   // Calculate product percentage
   const calcProdutoPct = (c: CombustivelHibrido): number => {
      const litros = calcLitrosVendidos(c);
      if (totais.totalLitros === 0) return 0;
      return (litros / totais.totalLitros) * 100;
   };

   return (
      <div className="bg-gray-50 font-sans text-slate-800 transition-colors duration-300 pb-12 min-h-screen">
         <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                     Compra, Custo, Estoque e Venda
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                     Sistema integrado de gestão baseado na planilha Posto Jorro 2025.
                  </p>
               </div>
               <div className="flex shadow-md rounded-lg overflow-hidden">
                  <div className="bg-red-600 text-white px-4 py-2 font-bold text-sm tracking-wide flex items-center">
                     POSTO
                  </div>
                  <div className="bg-amber-400 text-red-900 px-4 py-2 font-bold text-sm tracking-wide flex items-center">
                     PROVIDÊNCIA
                  </div>
               </div>
            </div>
         </header>

         <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {/* === PROJEÇÕES E ANÁLISE === */}
            <section className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8">
               <div className="bg-indigo-600 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                     <BarChart2 className="text-white" size={24} />
                     <h2 className="text-white font-semibold text-lg">Projeções e Análise Preditiva</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                     <label className="bg-indigo-700/50 text-indigo-100 px-3 py-1 rounded flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Período</span>
                        <select className="bg-transparent border-none p-0 pr-6 text-xs focus:ring-0 cursor-pointer font-medium text-white outline-none">
                           <option className="text-slate-800">7 Dias</option>
                           <option className="text-slate-800">30 Dias</option>
                        </select>
                     </label>
                     <button className="bg-white/20 hover:bg-white/30 text-white p-1 rounded transition-colors" title="Configurações Avançadas">
                        <Settings size={18} />
                     </button>
                  </div>
               </div>

               <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* CHART 1: SALES TREND */}
                  <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm relative group">
                     <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center justify-between">
                        <span>Tendência de Vendas (Litros)</span>
                        <span className="text-xs text-emerald-500 font-bold bg-emerald-50 px-2 py-1 rounded">+12% Proj.</span>
                     </h3>
                     <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={salesTrendData}>
                              <defs>
                                 <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Area type="monotone" dataKey="vendas" stroke="#10b981" fillOpacity={1} fill="url(#colorVendas)" />
                              <Area type="monotone" dataKey="proj" stroke="#10b981" strokeDasharray="5 5" fill="none" />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                     <p className="text-xs text-slate-400 mt-3 text-center">Projeção baseada na média móvel dos últimos 30 dias</p>
                  </div>

                  {/* CHART 2: COST VS REVENUE */}
                  <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm relative group">
                     <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center justify-between">
                        <span>Custo vs Receita Projetada</span>
                        <span className="text-xs text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded">Margem Estável</span>
                     </h3>
                     <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={costRevenueData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                              <Tooltip cursor={{ fill: 'transparent' }} />
                              <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="custo" fill="#ef4444" radius={[4, 4, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                     <p className="text-xs text-slate-400 mt-3 text-center">Estimativa de fluxo de caixa para a próxima semana</p>
                  </div>

               </div>
            </section>

            {/* === SEÇÃO VENDA === */}
            <section className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
               <div className="bg-emerald-600 px-6 py-4 flex items-center gap-2">
                  <TrendingUp className="text-white" size={24} />
                  <h2 className="text-white font-semibold text-lg">Venda</h2>
               </div>
               <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-slate-100 text-xs uppercase font-semibold text-slate-600 whitespace-nowrap">
                        <tr>
                           <th className="px-4 py-3 min-w-[120px]">Produtos</th>
                           <th className="px-4 py-3 text-center">Inicial</th>
                           <th className="px-4 py-3 text-center">Fechamento</th>
                           <th className="px-4 py-3 text-right">Litros</th>
                           <th className="px-4 py-3 text-right">Valor LT R$</th>
                           <th className="px-4 py-3 text-right text-blue-600">Valor p/ Bico</th>
                           <th className="px-4 py-3 text-right text-emerald-600">Lucro LT R$</th>
                           <th className="px-4 py-3 text-right text-emerald-600">Lucro Bico R$</th>
                           <th className="px-4 py-3 text-right">Margem %</th>
                           <th className="px-4 py-3 text-right">Prod. Vendido</th>
                           <th className="px-4 py-3 text-right">Produto %</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {combustiveis.map((c, index) => {
                           const litres = calcLitrosVendidos(c);
                           const valorBico = calcValorPorBico(c);
                           const lucroLt = calcLucroLt(c);
                           const lucroBico = calcLucroBico(c);
                           const margemPct = calcMargemPct(c);
                           const produtoPct = calcProdutoPct(c);
                           const rowClass = index % 2 === 0 ? "hover:bg-gray-50" : "bg-gray-50/50 hover:bg-gray-100";

                           return (
                              <tr key={c.id} className={`${rowClass} transition-colors`}>
                                 <td className="px-4 py-3 font-medium">{c.nome}</td>
                                 <td className="px-2 py-2">
                                    <input
                                       className={TABLE_INPUT_CLASS}
                                       type="text"
                                       value={c.inicial}
                                       onChange={(e) => handleChange(c.id, 'inicial', e.target.value)}
                                    />
                                 </td>
                                 <td className="px-2 py-2">
                                    <input
                                       className={TABLE_INPUT_CLASS}
                                       type="text"
                                       value={c.fechamento}
                                       onChange={(e) => handleChange(c.id, 'fechamento', e.target.value)}
                                    />
                                 </td>
                                 <td className="px-4 py-3 text-right font-bold text-slate-700">
                                    {litres > 0 ? formatToBR(litres, 0) : '-'}
                                 </td>
                                 <td className="px-2 py-2">
                                    <input
                                       className={`${TABLE_INPUT_CLASS} bg-emerald-50/50 border-emerald-100`}
                                       type="text"
                                       value={c.valor_lt_venda}
                                       onChange={(e) => handleChange(c.id, 'valor_lt_venda', e.target.value)}
                                    />
                                 </td>
                                 <td className="px-4 py-3 text-right text-blue-500">
                                    {valorBico > 0 ? formatCurrency(valorBico) : '-'}
                                 </td>
                                 <td className="px-4 py-3 text-right text-emerald-500">
                                    {lucroLt !== 0 ? formatCurrency(lucroLt) : '-'}
                                 </td>
                                 <td className="px-4 py-3 text-right text-emerald-500">
                                    {lucroBico !== 0 ? formatCurrency(lucroBico) : '-'}
                                 </td>
                                 <td className="px-4 py-3 text-right text-red-400">
                                    {margemPct !== 0 ? `${formatToBR(margemPct)}%` : '-'}
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    {litres > 0 ? formatToBR(litres, 0) : '-'}
                                 </td>
                                 <td className="px-4 py-3 text-right font-bold">
                                    {produtoPct > 0 ? `${formatToBR(produtoPct)}%` : '-'}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                     <tfoot className="bg-slate-800 text-white font-bold text-xs uppercase">
                        <tr>
                           <td className="px-4 py-3 flex items-center gap-1">Total e Média</td>
                           <td className="px-4 py-3 text-center text-slate-400">-</td>
                           <td className="px-4 py-3 text-center text-slate-400">-</td>
                           <td className="px-4 py-3 text-right">{formatToBR(totais.totalLitros, 0)}</td>
                           <td className="px-4 py-3 text-right text-slate-400">-</td>
                           <td className="px-4 py-3 text-right bg-blue-900">{formatCurrency(totais.totalValorBico)}</td>
                           <td className="px-4 py-3 text-right text-slate-400">-</td>
                           <td className="px-4 py-3 text-right bg-amber-700">{formatCurrency(totais.totalLucroBico)}</td>
                           <td className="px-4 py-3 text-right bg-slate-700">{formatToBR(totais.margemMedia)}%</td>
                           <td className="px-4 py-3 text-right">{formatToBR(totais.totalLitros, 0)}</td>
                           <td className="px-4 py-3 text-right">100,00%</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </section>

            {/* === SEÇÃO COMPRA === */}
            <section className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
               <div className="bg-orange-600 px-6 py-4 flex items-center gap-2">
                  <Package className="text-white" size={24} />
                  <h2 className="text-white font-semibold text-lg">Compra e Custo</h2>
               </div>
               <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-slate-100 text-xs uppercase font-semibold text-slate-600 whitespace-nowrap">
                        <tr className="bg-slate-200 border-b border-slate-300">
                           <th className="px-4 py-2 bg-slate-100"></th>
                           <th className="px-4 py-2 text-center border-l border-slate-300 text-orange-700" colSpan={2}>Compra</th>
                           <th className="px-4 py-2 text-center border-l border-slate-300 text-blue-700" colSpan={1}>Custo</th>
                           <th className="px-4 py-2 text-center border-l border-slate-300 text-emerald-700" colSpan={1}>Venda</th>
                        </tr>
                        <tr>
                           <th className="px-4 py-3 min-w-[120px]">Produtos</th>
                           <th className="px-4 py-3 text-center border-l border-slate-200">Compra, LT.</th>
                           <th className="px-4 py-3 text-center">Compra, R$.</th>
                           <th className="px-4 py-3 text-right text-blue-600">Média LT R$</th>
                           <th className="px-4 py-3 text-right border-l border-slate-200 text-emerald-600">Valor P/ Venda</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {combustiveis.map((c, index) => {
                           const mediaLt = calcMediaLtRs(c);
                           const despMes = calcDespesasMes(c);
                           const compraEstoque = calcCompraEEstoque(c);
                           const estoqueHoje = calcEstoqueHoje(c);
                           const percaSobra = calcPercaSobra(c);
                           const rowClass = index % 2 === 0 ? "hover:bg-gray-50" : "bg-gray-50/50 hover:bg-gray-100";

                           return (
                              <tr key={c.id} className={`${rowClass} transition-colors`}>
                                 <td className="px-4 py-3 font-medium">{c.nome}</td>
                                 <td className="px-2 py-2 border-l border-dashed border-gray-200">
                                    <input
                                       className={TABLE_INPUT_ORANGE_CLASS}
                                       type="text"
                                       value={c.compra_lt}
                                       onChange={(e) => handleChange(c.id, 'compra_lt', e.target.value)}
                                    />
                                 </td>
                                 <td className="px-2 py-2">
                                    <input
                                       className={TABLE_INPUT_ORANGE_CLASS}
                                       type="text"
                                       value={c.compra_rs}
                                       onChange={(e) => handleChange(c.id, 'compra_rs', e.target.value)}
                                    />
                                 </td>
                                 <td className="px-4 py-3 text-right text-blue-500">
                                    {mediaLt > 0 ? formatCurrency(mediaLt) : '-'}
                                 </td>
                                 <td className="px-2 py-2 border-l border-dashed border-gray-200">
                                    <input
                                       className={`${TABLE_INPUT_ORANGE_CLASS} bg-emerald-50/50 border-emerald-100`}
                                       type="text"
                                       value={c.valor_lt_venda}
                                       onChange={(e) => handleChange(c.id, 'valor_lt_venda', e.target.value)}
                                    />
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                     <tfoot className="bg-slate-800 text-white font-bold text-xs uppercase">
                        <tr>
                           <td className="px-4 py-3 flex items-center gap-1">Total</td>
                           <td className="px-4 py-3 text-center">{formatToBR(totais.totalCompraLt, 0)}</td>
                           <td className="px-4 py-3 text-center">{formatCurrency(totais.totalCompraRs)}</td>
                           <td className="px-4 py-3 text-right bg-blue-900">{formatCurrency(totais.mediaTotal)}</td>
                           <td className="px-4 py-3 text-right text-slate-400">-</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                     <TrendingUp className="text-emerald-600" size={20} />
                     <h3 className="font-bold text-emerald-800">Seção Venda</h3>
                  </div>
                  <p className="text-sm text-emerald-900 leading-relaxed">
                     Registre as leituras iniciais e finais dos bicos para calcular vendas e lucros automaticamente. O sistema utiliza a diferença entre o fechamento e a leitura inicial.
                  </p>
               </div>
               <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                     <Package className="text-orange-600" size={20} />
                     <h3 className="font-bold text-orange-800">Seção Compra</h3>
                  </div>
                  <p className="text-sm text-orange-900 leading-relaxed">
                     Registre as compras de combustível para calcular o custo médio e controlar o estoque. Insira a quantidade (LT) e o valor total (R$) da nota fiscal.
                  </p>
               </div>
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                     <DollarSign className="text-blue-600" size={20} />
                     <h3 className="font-bold text-blue-800">Integração</h3>
                  </div>
                  <p className="text-sm text-blue-900 leading-relaxed">
                     O <strong>Lucro por Litro</strong> usa o Custo Médio da compra para calcular rentabilidade real. O <strong>Estoque Hoje</strong> desconta as vendas automaticamente do saldo anterior.
                  </p>
               </div>
            </div>
         </main>
      </div>
   );
};

export default PurchaseRegistrationScreen;