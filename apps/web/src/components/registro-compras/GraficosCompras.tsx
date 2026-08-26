/**
 * Gráficos da tela de compras — só exibem o que `useCalculosRegistro` já calcula.
 *
 * @remarks
 * Nenhuma fórmula nova mora aqui: litros, custo médio, despesa rateada e lucro
 * por litro vêm prontos de `calculos`. Este arquivo decide **forma e cor**, e
 * segue a skill `dataviz`: um eixo só por gráfico, cores por identidade do
 * produto em ordem fixa (paleta validada em claro e escuro), legenda sempre
 * presente, 2px de respiro entre fatias, e a tabela da própria tela como
 * "relief" para o contraste das cores claras.
 */
import React from 'react';
import { BarChart3 } from 'lucide-react';
import {
   ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from 'recharts';
import { CombustivelHibrido } from './hooks/useCombustiveisHibridos';
import { CalculosRegistro } from './hooks/useCalculosRegistro';
import { formatarParaBR, paraReais, parseBRFloat } from '../../utils/formatters';

interface Props {
   combustiveis: CombustivelHibrido[];
   calculos: CalculosRegistro;
}

/**
 * Paleta categórica (slots 1–4 da referência `dataviz`), validada em 26/08/2026:
 * ΔE CVD adjacente ≥ 8,4 e normal ≥ 19,8 nos dois modos. Ordem FIXA por papel,
 * nunca ciclada — a fatia "custo" é sempre azul, "despesa" sempre laranja,
 * "lucro" sempre verde, independente de quantos produtos há.
 */
const COR = {
   claro: { comprado: '#2a78d6', vendido: '#eb6834', custo: '#2a78d6', despesa: '#eb6834', lucro: '#1baf7a' },
   escuro: { comprado: '#3987e5', vendido: '#d95926', custo: '#3987e5', despesa: '#d95926', lucro: '#199e70' },
} as const;

const usaTemaEscuro = (): boolean =>
   typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

const TOOLTIP_STYLE = {
   backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6',
   borderRadius: '8px', padding: '8px 12px', fontSize: '12px',
} as const;

const EIXO = { stroke: '#9ca3af', fontSize: 11, tickLine: false, axisLine: false } as const;

export const GraficosCompras: React.FC<Props> = ({ combustiveis, calculos }) => {
   const cor = usaTemaEscuro() ? COR.escuro : COR.claro;

   const volume = combustiveis.map((c) => ({
      produto: c.nome,
      comprado: parseBRFloat(c.compra_lt),
      vendido: calculos.calcLitrosVendidos(c),
   }));

   // Composição do preço de bomba, por litro: custo de compra + despesa rateada
   // + o que sobra. Os três somam exatamente o preço de venda — é a decomposição
   // que a planilha faz nas colunas "Média LT", "Valor p/ Venda" e "Lucro LT".
   const despesaLt = calculos.calcDespesaPorLitro();
   const composicao = combustiveis.map((c) => {
      const custo = calculos.calcMediaLtRs(c);
      const lucro = calculos.calcLucroLt(c);
      return { produto: c.nome, custo, despesa: custo > 0 ? despesaLt : 0, lucro: Math.max(lucro, 0), prejuizo: Math.min(lucro, 0) };
   });

   const temVolume = volume.some((v) => v.comprado > 0 || v.vendido > 0);
   const temComposicao = composicao.some((c) => c.custo > 0);

   if (!temVolume && !temComposicao) return null;

   return (
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mt-8">
         <div className="bg-slate-700 px-6 py-4 flex items-center gap-2">
            <BarChart3 className="text-white" size={24} />
            <h2 className="text-white font-semibold text-lg">Visão do Período</h2>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {temVolume && (
               <figure>
                  <figcaption className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Litros comprados × vendidos</figcaption>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Por produto, no que está lançado nesta tela.</p>
                  <div className="h-[260px]">
                     <ResponsiveContainer width="99%" height="100%">
                        <BarChart data={volume} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%" barGap={2}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.15} />
                           <XAxis dataKey="produto" {...EIXO} tickMargin={8} />
                           <YAxis {...EIXO} tickFormatter={(v: number) => `${formatarParaBR(v / 1000, 0)}k`} width={40} />
                           <Tooltip
                              contentStyle={TOOLTIP_STYLE}
                              cursor={{ fill: '#9ca3af', opacity: 0.08 }}
                              formatter={(v: number, nome: string) => [`${formatarParaBR(v, 0)} L`, nome === 'comprado' ? 'Comprado' : 'Vendido']}
                           />
                           <Legend iconType="circle" iconSize={8} formatter={(v: string) => (v === 'comprado' ? 'Comprado' : 'Vendido')} wrapperStyle={{ fontSize: 12 }} />
                           <Bar dataKey="comprado" fill={cor.comprado} radius={[4, 4, 0, 0]} maxBarSize={36}>
                              <LabelList dataKey="comprado" position="top" fontSize={11} fill="currentColor" formatter={(v: number) => (v > 0 ? formatarParaBR(v, 0) : '')} />
                           </Bar>
                           <Bar dataKey="vendido" fill={cor.vendido} radius={[4, 4, 0, 0]} maxBarSize={36}>
                              <LabelList dataKey="vendido" position="top" fontSize={11} fill="currentColor" formatter={(v: number) => (v > 0 ? formatarParaBR(v, 0) : '')} />
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </figure>
            )}

            {temComposicao && (
               <figure>
                  <figcaption className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">De onde vem o preço do litro</figcaption>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Custo de compra + despesa rateada + o que sobra = preço de bomba.</p>
                  <div className="h-[260px]">
                     <ResponsiveContainer width="99%" height="100%">
                        <BarChart data={composicao} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }} barCategoryGap="28%" stackOffset="sign">
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.15} />
                           <XAxis type="number" {...EIXO} tickFormatter={(v: number) => paraReais(v)} />
                           <YAxis type="category" dataKey="produto" {...EIXO} width={110} />
                           <Tooltip
                              contentStyle={TOOLTIP_STYLE}
                              cursor={{ fill: '#9ca3af', opacity: 0.08 }}
                              formatter={(v: number, nome: string) => [`${paraReais(v)}/L`, ROTULO[nome] ?? nome]}
                           />
                           <Legend iconType="circle" iconSize={8} formatter={(v: string) => ROTULO[v] ?? v} wrapperStyle={{ fontSize: 12 }} />
                           <Bar dataKey="custo" stackId="preco" fill={cor.custo} maxBarSize={28} />
                           <Bar dataKey="despesa" stackId="preco" fill={cor.despesa} maxBarSize={28} />
                           <Bar dataKey="lucro" stackId="preco" fill={cor.lucro} radius={[0, 4, 4, 0]} maxBarSize={28}>
                              <LabelList dataKey="lucro" position="right" fontSize={11} fill="currentColor" formatter={(v: number) => (v > 0 ? `+${paraReais(v)}` : '')} />
                           </Bar>
                           <Bar dataKey="prejuizo" stackId="preco" fill="#e34948" radius={[4, 0, 0, 4]} maxBarSize={28}>
                              <LabelList dataKey="prejuizo" position="left" fontSize={11} fill="currentColor" formatter={(v: number) => (v < 0 ? paraReais(v) : '')} />
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </figure>
            )}
         </div>
      </section>
   );
};

const ROTULO: Record<string, string> = {
   custo: 'Custo de compra',
   despesa: 'Despesa rateada',
   lucro: 'Sobra por litro',
   prejuizo: 'Abaixo do custo',
};
