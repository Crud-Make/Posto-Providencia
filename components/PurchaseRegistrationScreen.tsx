import React, { useState, useMemo, useEffect } from 'react';
import {
   FileText, Calculator, TrendingUp, Package, DollarSign, MoreVertical, Settings, Calendar, Save, RefreshCw
} from 'lucide-react';
import { combustivelService, compraService, estoqueService } from '../services/api';
import type { Combustivel } from '../services/database.types';

type CombustivelHibrido = {
   id: number;
   nome: string;
   codigo: string;
   // Campos de VENDA
   inicial: string;            // Leitura inicial
   fechamento: string;         // Leitura final
   preco_venda_atual: string;  // Preço de venda PRATICADO (G5 na planilha)
   // Campos de COMPRA
   compra_lt: string;          // Litros comprados
   compra_rs: string;          // Valor total da compra
   estoque_anterior: string;   // Estoque ano passado
};

const TABLE_INPUT_CLASS = "w-full px-3 py-3 text-right text-base font-medium border border-gray-300 rounded-lg focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm bg-white hover:border-emerald-300";
const TABLE_INPUT_ORANGE_CLASS = "w-full px-3 py-3 text-right text-base font-medium border border-gray-300 rounded-lg focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm bg-white hover:border-orange-300";



const PurchaseRegistrationScreen: React.FC = () => {
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);

   // State com dados unificados
   const [combustiveis, setCombustiveis] = useState<CombustivelHibrido[]>([]);

   // Estado para Despesas do Mês (valor total global - planilha H19:=D390)
   const [despesasMes, setDespesasMes] = useState<string>('');

   // Carregar dados iniciais
   useEffect(() => {
      loadData();
   }, []);

   const loadData = async () => {
      try {
         setLoading(true);
         const data = await combustivelService.getAll();
         const estoques = await estoqueService.getAll();

         // Mapear combustíveis do banco para o estado local
         const mapped: CombustivelHibrido[] = data.map(c => {
            const est = estoques.find(e => e.combustivel_id === c.id);
            return {
               id: c.id,
               nome: c.nome,
               codigo: c.codigo,
               inicial: '', // Idealmente buscaria última leitura
               fechamento: '',
               preco_venda_atual: c.preco_venda ? c.preco_venda.toString().replace('.', ',') : '0',
               compra_lt: '',
               compra_rs: '',
               estoque_anterior: est ? est.quantidade_atual.toString() : '0',
            };
         });
         setCombustiveis(mapped);
      } catch (error) {
         console.error('Erro ao carregar dados:', error);
         alert('Erro ao carregar dados dos combustíveis');
      } finally {
         setLoading(false);
      }
   };

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
      const decimal = parts[1];

      if (decimals === 0) return integer;
      return `${integer},${decimal || '0'.repeat(decimals)}`;
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
         // Limitar decimais a 3 casas (leituras de bomba usam 3)
         const formattedDec = decPart ? decPart.slice(0, 3) : '';
         return formattedInt + ',' + formattedDec;
      } else {
         // Apenas números inteiros - adicionar pontos como separadores de milhar
         const intOnly = cleaned.replace(',', '');
         return intOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
   };

   // Handle input changes
   const handleChange = (id: number, field: keyof CombustivelHibrido, value: string) => {
      // Campos que permitem decimais (leituras e valores monetários)
      const decimalFields = ['compra_rs', 'inicial', 'fechamento', 'compra_lt'];
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

   // Calcula a despesa por litro conforme planilha: H22:=H19/F11
   // H19 = Despesas do Mês (valor fixo global)
   // F11 = Total de Litros Vendidos (ou Comprados como fallback)
   const calcDespesaPorLitro = (): number => {
      const despesasTotal = parseValue(despesasMes);
      if (despesasTotal === 0) return 0;

      // Primeiro tenta usar litros vendidos (como na planilha)
      const totalLitrosVendidos = combustiveis.reduce((acc, c) => acc + calcLitrosVendidos(c), 0);

      // Se não há vendas, usa litros comprados como base para o rateio
      const totalLitrosComprados = combustiveis.reduce((acc, c) => acc + parseValue(c.compra_lt), 0);

      // Usa vendidos se disponível, senão comprados
      const litrosBase = totalLitrosVendidos > 0 ? totalLitrosVendidos : totalLitrosComprados;

      if (litrosBase === 0) return 0;
      return despesasTotal / litrosBase;
   };

   // Calcula o Valor para Venda conforme planilha: G19:=F19+H22
   // F19 = Custo Médio (Compra R$ / Compra Lt)
   // H22 = Despesa por Litro
   const calcValorParaVenda = (c: CombustivelHibrido): number => {
      const custoMedio = calcMediaLtRs(c);
      const despesaLt = calcDespesaPorLitro();
      if (custoMedio === 0) return 0;
      return custoMedio + despesaLt;
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

   // Valor por Bico conforme planilha: H5 = F5 * G5
   // F5 = Litros vendidos
   // G5 = Preço de venda PRATICADO
   const calcValorPorBico = (c: CombustivelHibrido): number => {
      const litros = calcLitrosVendidos(c);
      const precoAtual = parseValue(c.preco_venda_atual); // G5
      return litros * precoAtual;
   };

   // Lucro por Litro conforme planilha: I5 = G5 - G19
   // G5 = Preço de venda PRATICADO (atual no sistema)
   // G19 = Valor SUGERIDO para venda (custo + despesas)
   const calcLucroLt = (c: CombustivelHibrido): number => {
      const precoAtual = parseValue(c.preco_venda_atual); // G5 - Preço praticado
      const valorSugerido = calcValorParaVenda(c);        // G19 - Valor sugerido
      if (precoAtual === 0) return 0;
      return precoAtual - valorSugerido;
   };

   const calcLucroBico = (c: CombustivelHibrido): number => {
      const litros = calcLitrosVendidos(c);
      const lucroLt = calcLucroLt(c);
      return litros * lucroLt;
   };

   // Margem % conforme planilha: K5 = I5/G5
   // I5 = Lucro por Litro
   // G5 = Preço de venda PRATICADO
   const calcMargemPct = (c: CombustivelHibrido): number => {
      const precoAtual = parseValue(c.preco_venda_atual); // G5
      const lucroLt = calcLucroLt(c);                      // I5
      if (precoAtual === 0) return 0;
      return (lucroLt / precoAtual) * 100;
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

      combustiveis.forEach(c => {
         totalLitros += calcLitrosVendidos(c);
         totalValorBico += calcValorPorBico(c);
         totalLucroBico += calcLucroBico(c);
         totalCompraLt += parseValue(c.compra_lt);
         totalCompraRs += parseValue(c.compra_rs);
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
         despesasMesTotal: parseValue(despesasMes),
         mediaTotal,
         margemMedia
      };
   }, [combustiveis, despesasMes]);

   // Calculate product percentage
   const calcProdutoPct = (c: CombustivelHibrido): number => {
      const litros = calcLitrosVendidos(c);
      if (totais.totalLitros === 0) return 0;
      return (litros / totais.totalLitros) * 100;
   };

   // === SALVAR E ATUALIZAR SISTEMA ===
   const handleSave = async () => {
      const comprasParaSalvar = combustiveis.filter(c => parseValue(c.compra_lt) > 0);

      if (comprasParaSalvar.length === 0) {
         alert('Nenhuma compra registrada para salvar.');
         return;
      }

      if (!confirm(`Deseja salvar ${comprasParaSalvar.length} compras e ATUALIZAR os preços de venda no sistema?`)) {
         return;
      }

      try {
         setSaving(true);
         const hoje = new Date().toISOString().split('T')[0];

         for (const c of comprasParaSalvar) {
            const valorTotal = parseValue(c.compra_rs);
            const litros = parseValue(c.compra_lt);
            const fornecedorId = 1; // Ajustar conforme fornecedor selecionado. Idealmente deveria haver um select.

            // 1. Criar registro de Compra
            await compraService.create({
               combustivel_id: c.id,
               data: hoje,
               fornecedor_id: fornecedorId,
               quantidade_litros: litros,
               valor_total: valorTotal,
               custo_por_litro: valorTotal / litros,
               observacoes: `Atualização de estoque/preço via Painel de Compras`
            });

            // 2. Atualizar Preço de Venda no Sistema (Tabela Combustivel)
            const novoPrecoVenda = calcValorParaVenda(c);
            if (novoPrecoVenda > 0) {
               await combustivelService.update(c.id, {
                  preco_venda: novoPrecoVenda
               });
            }
         }

         alert('Compras salvas e preços atualizados com sucesso!');

         // Limpar campos de compra após salvar
         setCombustiveis(prev => prev.map(c => ({
            ...c,
            compra_lt: '',
            compra_rs: ''
         })));

         // Recarregar dados para garantir sincronia
         loadData();

      } catch (error) {
         console.error('Erro ao salvar:', error);
         alert('Erro ao salvar as informações. Tente novamente.');
      } finally {
         setSaving(false);
      }
   };

   if (loading) {
      return <div className="p-8 text-center text-slate-500">Carregando dados...</div>;
   }

   return (
      <div className="bg-gray-50 font-sans text-slate-800 transition-colors duration-300 pb-12 min-h-screen">
         <header className="w-[98%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                     Compra e Venda
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                     Sistema integrado de gestão baseado na planilha Posto Jorro 2025.
                  </p>
               </div>
               <div className="flex gap-4 items-center">
                  <button
                     onClick={loadData}
                     className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
                     title="Recarregar dados"
                  >
                     <RefreshCw size={20} />
                  </button>
                  <div className="flex shadow-md rounded-lg overflow-hidden">
                     <div className="bg-red-600 text-white px-4 py-2 font-bold text-sm tracking-wide flex items-center">
                        POSTO
                     </div>
                     <div className="bg-amber-400 text-red-900 px-4 py-2 font-bold text-sm tracking-wide flex items-center">
                        PROVIDÊNCIA
                     </div>
                  </div>
               </div>
            </div>
         </header>

         <main className="w-[98%] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">


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
                           <th className="px-4 py-4 min-w-[120px]">Produtos</th>
                           <th className="px-4 py-4 text-center">Inicial</th>
                           <th className="px-4 py-4 text-center">Fechamento</th>
                           <th className="px-4 py-4 text-right">Litros</th>
                           <th className="px-4 py-4 text-right text-emerald-600">Preço Atual R$</th>
                           <th className="px-4 py-4 text-right text-blue-600">Valor p/ Bico</th>
                           <th className="px-4 py-4 text-right text-amber-600">Lucro LT R$</th>
                           <th className="px-4 py-4 text-right text-amber-600">Lucro Bico R$</th>
                           <th className="px-4 py-4 text-right">Margem %</th>
                           <th className="px-4 py-4 text-right">Prod. Vendido</th>
                           <th className="px-4 py-4 text-right">Produto %</th>
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
                                 <td className="px-4 py-5 font-medium">{c.nome}</td>
                                 <td className="px-3 py-5 min-w-[180px]">
                                    <input
                                       className={TABLE_INPUT_CLASS}
                                       type="text"
                                       value={c.inicial}
                                       placeholder="0,00"
                                       onChange={(e) => handleChange(c.id, 'inicial', e.target.value)}
                                    />
                                 </td>
                                 <td className="px-3 py-5 min-w-[180px]">
                                    <input
                                       className={TABLE_INPUT_CLASS}
                                       type="text"
                                       value={c.fechamento}
                                       placeholder="0,00"
                                       onChange={(e) => handleChange(c.id, 'fechamento', e.target.value)}
                                    />
                                 </td>
                                 <td className="px-4 py-5 text-right font-bold text-slate-700">
                                    {litres > 0 ? formatToBR(litres, 0) : '-'}
                                 </td>
                                 <td className="px-4 py-5 text-right text-emerald-600 font-bold bg-emerald-50/30">
                                    {parseValue(c.preco_venda_atual) > 0 ? formatCurrency(parseValue(c.preco_venda_atual)) : '-'}
                                 </td>
                                 <td className="px-4 py-5 text-right text-blue-500">
                                    {valorBico > 0 ? formatCurrency(valorBico) : '-'}
                                 </td>
                                 <td className="px-4 py-5 text-right text-amber-500">
                                    {lucroLt !== 0 ? formatCurrency(lucroLt) : '-'}
                                 </td>
                                 <td className="px-4 py-5 text-right text-amber-500">
                                    {lucroBico !== 0 ? formatCurrency(lucroBico) : '-'}
                                 </td>
                                 <td className="px-4 py-5 text-right text-red-400">
                                    {margemPct !== 0 ? `${formatToBR(margemPct)}%` : '-'}
                                 </td>
                                 <td className="px-4 py-5 text-right">
                                    {litres > 0 ? formatToBR(litres, 0) : '-'}
                                 </td>
                                 <td className="px-4 py-5 text-right font-bold">
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
               <div className="bg-orange-600 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                     <Package className="text-white" size={24} />
                     <h2 className="text-white font-semibold text-lg">Compra e Custo</h2>
                  </div>
                  {/* Campo Despesas do Mês - planilha H19:=D390 */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                     <div className="flex items-center gap-3 bg-orange-700/50 rounded-lg px-4 py-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] uppercase font-bold text-orange-200 tracking-wider">Despesas do Mês (R$)</span>
                           <span className="text-[9px] text-orange-300">Rateado por litro vendido</span>
                        </div>
                        <div className="relative">
                           <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-300 text-sm font-bold">R$</span>
                           <input
                              type="text"
                              value={despesasMes}
                              onChange={(e) => setDespesasMes(formatInputValue(e.target.value, true))}
                              placeholder="0,00"
                              className="w-32 pl-8 pr-3 py-1.5 bg-white/90 border border-orange-300 rounded text-sm font-mono font-bold text-slate-800 text-right focus:ring-2 focus:ring-orange-400 outline-none"
                           />
                        </div>
                        {totais.totalLitros > 0 && (
                           <div className="bg-white/20 rounded px-2 py-1 text-white text-xs font-bold">
                              = {formatCurrency(calcDespesaPorLitro())}/L
                           </div>
                        )}
                     </div>

                     <button
                        onClick={handleSave}
                        disabled={saving || totais.totalCompraLt === 0}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-lg transition-all ${saving || totais.totalCompraLt === 0
                           ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                           : 'bg-white text-orange-600 hover:bg-orange-50 active:scale-95'
                           }`}
                     >
                        <Save size={18} />
                        {saving ? 'Salvando...' : 'FINALIZAR COMPRA'}
                     </button>
                  </div>
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
                           <th className="px-4 py-4 min-w-[120px]">Produtos</th>
                           <th className="px-4 py-4 text-center border-l border-slate-200">Compra, LT.</th>
                           <th className="px-4 py-4 text-center">Compra, R$.</th>
                           <th className="px-4 py-4 text-right text-blue-600">Média LT R$</th>
                           <th className="px-4 py-4 text-right border-l border-slate-200 text-emerald-600">Valor P/ Venda</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {combustiveis.map((c, index) => {
                           const mediaLt = calcMediaLtRs(c);
                           const valorVenda = calcValorParaVenda(c);
                           const compraEstoque = calcCompraEEstoque(c);
                           const estoqueHoje = calcEstoqueHoje(c);
                           const percaSobra = calcPercaSobra(c);
                           const rowClass = index % 2 === 0 ? "hover:bg-gray-50" : "bg-gray-50/50 hover:bg-gray-100";

                           return (
                              <tr key={c.id} className={`${rowClass} transition-colors`}>
                                 <td className="px-4 py-5 font-medium">{c.nome}</td>
                                 <td className="px-3 py-5 min-w-[180px] border-l border-dashed border-gray-200">
                                    <input
                                       className={TABLE_INPUT_ORANGE_CLASS}
                                       type="text"
                                       value={c.compra_lt}
                                       placeholder="0"
                                       onChange={(e) => handleChange(c.id, 'compra_lt', e.target.value)}
                                    />
                                 </td>
                                 <td className="px-3 py-5 min-w-[180px]">
                                    <input
                                       className={TABLE_INPUT_ORANGE_CLASS}
                                       type="text"
                                       value={c.compra_rs}
                                       placeholder="0,00"
                                       onChange={(e) => handleChange(c.id, 'compra_rs', e.target.value)}
                                    />
                                 </td>
                                 <td className="px-4 py-5 text-right text-blue-500">
                                    {mediaLt > 0 ? formatCurrency(mediaLt) : '-'}
                                 </td>
                                 <td className="px-4 py-5 text-right text-emerald-600 font-bold bg-emerald-50/30 border-l border-dashed border-gray-200">
                                    {valorVenda > 0 ? formatCurrency(valorVenda) : '-'}
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

         </main>
      </div>
   );
};

export default PurchaseRegistrationScreen;