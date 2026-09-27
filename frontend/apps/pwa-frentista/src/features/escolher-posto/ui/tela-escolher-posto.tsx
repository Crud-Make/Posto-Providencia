import { Fuel } from 'lucide-react';
import type { Posto } from '@frentista/entities/posto';

interface TelaEscolherPostoProps {
  readonly postos: readonly Posto[];
  readonly aoEscolher: (posto: Posto) => void;
}

/**
 * "Em qual posto?" — a primeira tela do PWA, toda vez que ele abre com dois ou mais postos ativos
 * (#101, decisão do dono de 27/09/2026: escolhe na hora, não guarda). Um botão por posto, por id.
 */
export const TelaEscolherPosto = ({ postos, aoEscolher }: TelaEscolherPostoProps) => (
  <div className="flex flex-col min-h-screen bg-[#0A0D14] text-slate-100 font-sans p-5 justify-center">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center">
        <Fuel size={24} />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">Em qual posto?</h1>
        <p className="text-sm text-slate-400">Toque no posto em que você está agora.</p>
      </div>
    </div>
    <div className="space-y-3">
      {postos.map((posto) => (
        <button
          key={posto.id}
          type="button"
          onClick={() => aoEscolher(posto)}
          className="w-full text-left px-5 py-4 rounded-2xl font-bold tracking-wide border bg-[#131722] text-slate-200 border-slate-800/80 hover:bg-slate-800/60 active:bg-slate-800 active:scale-[0.98] transition-all"
        >
          {posto.nome}
        </button>
      ))}
      {postos.length === 0 && (
        <p className="text-slate-400 text-sm italic py-4">Nenhum posto ativo. Fale com o gerente.</p>
      )}
    </div>
  </div>
);
