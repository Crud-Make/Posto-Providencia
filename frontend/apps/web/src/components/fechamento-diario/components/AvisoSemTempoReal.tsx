import * as React from 'react';
import { RefreshCcw } from 'lucide-react';

interface AvisoSemTempoRealProps {
   readonly recarregando: boolean;
   readonly onRecarregar: () => void;
}

/**
 * Aviso do modo API (login pela API): a tela NÃO acorda sozinha quando o frentista envia pelo PWA.
 *
 * @remarks
 * Os canais do Supabase ficam desligados nesse modo (`useTempoRealDoFechamento`), e o realtime do
 * Laravel ainda não existe — decisão do dono de 21/09/2026: nem canal do Supabase, nem polling.
 * O botão recarrega do servidor leituras, envios e recebimentos do dia. Recarregar devolve à tela
 * o que foi tirado e ainda não salvo; o que foi DIGITADO e não salvo também é trocado pelo banco.
 */
export const AvisoSemTempoReal: React.FC<AvisoSemTempoRealProps> = ({ recarregando, onRecarregar }) => (
   <div role="status" className="p-3 bg-amber-900/15 text-amber-100 rounded-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm">
         Atualização automática desligada: envios do app do frentista só aparecem ao recarregar. Recarregue antes de salvar.
      </span>
      <button
         type="button"
         onClick={onRecarregar}
         disabled={recarregando}
         className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-sm font-medium transition-colors disabled:opacity-50"
      >
         <RefreshCcw size={14} aria-hidden="true" />
         Recarregar do servidor
      </button>
   </div>
);
