import * as React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AbaForaDaApiProps {
   readonly aba: string;
}

/**
 * O que a aba mostra no modo API (login pela API) enquanto o módulo dela não tem rota no Laravel.
 *
 * @remarks
 * Sem sessão do Supabase toda consulta dele volta vazia ou com erro — e a tela mostraria zeros
 * como se fossem dado. Esta aba não chama o Supabase nesse modo: diz o que falta, em vez de
 * mentir com um painel vazio. Com login no Supabase a aba funciona como sempre.
 */
export const AbaForaDaApi: React.FC<AbaForaDaApiProps> = ({ aba }) => (
   <div role="status" className="m-4 p-6 bg-slate-900/60 text-slate-200 rounded-xl border border-slate-700/50 flex items-start gap-3">
      <AlertTriangle size={20} className="text-amber-400 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
         <p className="font-semibold">{aba} ainda não funciona pela API.</p>
         <p className="text-sm text-slate-400">
            Lançar e consultar despesas, despesas fixas, taxas de cartão e receitas ainda depende do login antigo. As demais abas do Fechamento de Caixa funcionam normalmente.
         </p>
      </div>
   </div>
);
