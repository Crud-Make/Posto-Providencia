import React from 'react';
import { Trophy, Wallet, CalendarDays } from 'lucide-react';
import { paraReais, formatarPorcentagem } from '../../../../utils/formatters';
import type { ColunaMensalFrentista, ResumoMensalFrentistas as Resumo } from '../../hooks/useResumoMensalFrentistas';

interface ResumoMensalFrentistasProps {
  resumo: Resumo;
  /** Rótulo do mês exibido no cabeçalho, ex.: "agosto de 2026". */
  rotuloMes: string;
}

type LinhaForma = {
  rotulo: string;
  campo: keyof Pick<ColunaMensalFrentista, 'pix' | 'credito' | 'debito' | 'moedas' | 'nota' | 'baratao' | 'dinheiro'>;
};

/** Mesma ordem das linhas 886–892 do bloco `Caixa Dia 01 a 31` da planilha. */
const FORMAS: readonly LinhaForma[] = [
  { rotulo: 'Pix', campo: 'pix' },
  { rotulo: 'Cartão Crédito', campo: 'credito' },
  { rotulo: 'Cartão Débito', campo: 'debito' },
  { rotulo: 'Moeda', campo: 'moedas' },
  { rotulo: 'Notas', campo: 'nota' },
  { rotulo: 'Baratão', campo: 'baratao' },
  { rotulo: 'Dinheiro', campo: 'dinheiro' },
];

const classeFalta = (v: number) =>
  Math.abs(v) < 0.005 ? 'text-green-400' : v > 0 ? 'text-red-400' : 'text-green-400';

/**
 * Bloco mensal por frentista — o `Caixa Dia 01 a 31` da planilha, lido do banco.
 *
 * @remarks
 * Frentistas em colunas, formas de pagamento em linhas, ` Caixa.` como última coluna.
 * O "frentista do mês" é a maior `Venda Frentistas.` — é o critério da planilha
 * (ver `montarResumoMensal`). Só leitura: o mês não se edita por aqui.
 */
export const ResumoMensalFrentistas: React.FC<ResumoMensalFrentistasProps> = ({ resumo, rotuloMes }) => {
  const { colunas, caixa, frentistaDoMes, carregando, erro } = resumo;

  if (carregando) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-900/20 rounded-3xl border border-slate-800">
        <p className="animate-pulse">Somando os envios de {rotuloMes}...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
        Não foi possível carregar o mês: {erro}
      </div>
    );
  }

  if (colunas.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
        <p className="text-slate-500 italic">Nenhum envio de frentista em {rotuloMes}.</p>
      </div>
    );
  }

  const todas = [...colunas, caixa];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#581c87] to-[#4c1d95] p-6 rounded-2xl flex items-center gap-5 text-white border border-indigo-500/20">
          <div className="bg-white/10 p-4 rounded-xl"><Trophy size={28} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/60 mb-1">Frentista do mês</p>
            <h3 className="text-xl font-black leading-tight">{frentistaDoMes?.nome ?? '---'}</h3>
            <p className="text-[10px] text-white/50">
              {paraReais(frentistaDoMes?.vendaFrentista ?? 0)} · {formatarPorcentagem(frentistaDoMes?.participacao ?? 0)} do caixa
            </p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#4c1d95] to-[#2e1065] p-6 rounded-2xl flex items-center gap-5 text-white border border-purple-500/20">
          <div className="bg-white/10 p-4 rounded-xl"><Wallet size={28} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/60 mb-1">Caixa do mês</p>
            <h3 className="text-2xl font-black">{paraReais(caixa.vendaFrentista)}</h3>
            <p className="text-[10px] text-white/50">{caixa.envios} envios</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#134e4a] to-[#064e3b] p-6 rounded-2xl flex items-center gap-5 text-white border border-teal-500/20">
          <div className="bg-white/10 p-4 rounded-xl"><CalendarDays size={28} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/60 mb-1">Falta do mês</p>
            <h3 className={`text-2xl font-black ${classeFalta(caixa.falta)}`}>{paraReais(caixa.falta)}</h3>
            <p className="text-[10px] text-white/50">concentrador − frentistas · positivo = falta</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 overflow-hidden">
        <div className="px-8 py-4 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-widest">
          Caixa de {rotuloMes} por frentista
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Forma</th>
                {todas.map((c) => (
                  <th
                    key={c.frentistaId ?? c.nome}
                    className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-center min-w-[120px] ${c === caixa ? 'text-purple-400' : 'text-slate-200'}`}
                  >
                    {c === caixa ? c.nome : c.nome.split(' ')[0]}
                    {c !== caixa && <div className="text-[9px] font-normal normal-case tracking-normal text-slate-500">{c.envios} envios</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              <tr className="bg-slate-800/20">
                <td className="px-8 py-3 text-sm text-slate-300">Venda Concentrador</td>
                {todas.map((c) => (
                  <td key={c.frentistaId ?? c.nome} className="px-6 py-3 text-center font-mono text-sm text-slate-300">
                    {paraReais(c.vendaConcentrador)}
                  </td>
                ))}
              </tr>
              {FORMAS.map((f) => (
                <tr key={f.campo} className="hover:bg-slate-800/30">
                  <td className="px-8 py-3 text-sm text-slate-300">{f.rotulo}</td>
                  {todas.map((c) => (
                    <td key={c.frentistaId ?? c.nome} className="px-6 py-3 text-center font-mono text-sm text-slate-200">
                      {c[f.campo] ? paraReais(c[f.campo]) : <span className="text-slate-600">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-800">
              <tr className="bg-slate-900/60 font-black">
                <td className="px-8 py-4 text-[10px] uppercase tracking-widest text-slate-400">Venda Frentistas</td>
                {todas.map((c) => (
                  <td key={c.frentistaId ?? c.nome} className="px-6 py-4 text-center font-mono text-base text-emerald-400">
                    {paraReais(c.vendaFrentista)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-900/60">
                <td className="px-8 py-3 text-[10px] uppercase tracking-widest text-slate-400">Falta</td>
                {todas.map((c) => (
                  <td key={c.frentistaId ?? c.nome} className={`px-6 py-3 text-center font-mono text-sm font-bold ${classeFalta(c.falta)}`}>
                    {paraReais(c.falta)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-900/60">
                <td className="px-8 py-3 text-[10px] uppercase tracking-widest text-slate-400">% do caixa</td>
                {todas.map((c) => (
                  <td key={c.frentistaId ?? c.nome} className="px-6 py-3 text-center font-mono text-sm text-slate-400">
                    {formatarPorcentagem(c.participacao)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
