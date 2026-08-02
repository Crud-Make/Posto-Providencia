import React from 'react';
import { Radio } from 'lucide-react';
import { descreverPresenca, statusPresenca, type PresencaFrentista, type StatusPresenca } from '@posto/utils';

interface PresencaFrentistasProps {
  readonly presencas: readonly PresencaFrentista[];
  /** Instante da avaliação, vindo do hook — para View e regra concordarem. */
  readonly agora: Date;
  readonly carregando: boolean;
}

/** Cor e rótulo por status. Só aparência; a classificação é de `@posto/utils`. */
const APARENCIA: Record<StatusPresenca, { ponto: string; texto: string; rotulo: string }> = {
  online: { ponto: 'bg-emerald-500', texto: 'text-emerald-600 dark:text-emerald-400', rotulo: 'No app agora' },
  ausente: { ponto: 'bg-amber-500', texto: 'text-amber-600 dark:text-amber-400', rotulo: 'Parado' },
  offline: { ponto: 'bg-gray-400 dark:bg-gray-600', texto: 'text-gray-500 dark:text-gray-400', rotulo: 'Saiu' },
};

/**
 * "Trabalhando agora": quem abriu o PWA e escolheu o próprio nome.
 *
 * @remarks
 * O rodapé sobre não ser controle de ponto **faz parte da feature**, não é
 * enfeite: o PWA não autentica ninguém (decisão do dono, 29/07), então quem abre
 * o link escolhe o nome que quiser. Sem essa linha, o bloco parece provar
 * presença física — e alguém acabaria usando para cobrar hora de funcionário.
 */
const PresencaFrentistas: React.FC<PresencaFrentistasProps> = ({ presencas, agora, carregando }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm h-full flex flex-col">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display uppercase tracking-wider">
          Trabalhando agora
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Quem está com o app aberto</p>
      </div>
    </div>

    <div className="flex-1 space-y-3">
      {carregando ? (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm italic py-8">Carregando…</p>
      ) : presencas.length === 0 ? (
        <div className="text-center py-8">
          <Radio size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-gray-400 dark:text-gray-500 text-sm italic">Ninguém abriu o app hoje.</p>
        </div>
      ) : (
        presencas.map(p => {
          const status = statusPresenca(p.vistoEm, agora);
          const { ponto, texto, rotulo } = APARENCIA[status];

          return (
            <div
              key={p.frentistaId}
              className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ponto}`} aria-hidden="true" />
                <span className="font-semibold text-gray-900 dark:text-white truncate">{p.nome}</span>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${texto}`}>{rotulo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{descreverPresenca(p.vistoEm, agora)}</p>
              </div>
            </div>
          );
        })
      )}
    </div>

    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60">
      Mostra quem abriu o app e escolheu o próprio nome — o app não pede senha, então isto não é
      controle de ponto.
    </p>
  </div>
);

export default PresencaFrentistas;
