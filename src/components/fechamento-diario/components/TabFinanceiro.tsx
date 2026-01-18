import * as React from 'react';
import { SecaoPagamentos } from './PainelFinanceiro';
import { SecaoResumo } from './ResumoCombustivel';
import type {
   EntradaPagamento,
   BicoComDetalhes,
   SessaoFrentista,
   Frentista
} from '../../../types/fechamento';

interface TabFinanceiroProps {
   payments: EntradaPagamento[];
   totalPagamentos: number;
   totalLitros: number;
   totalFrentistas: number;
   leituras: Record<number, { inicial: string; fechamento: string }>;
   bicos: BicoComDetalhes[];
   frentistaSessions: SessaoFrentista[];
   frentistas: Frentista[];
   loading: boolean;
   handlers: {
      alterarPagamento: (idx: number, val: string) => void;
      aoSairPagamento: (idx: number) => void;
   };
}

/**
 * Componente para a aba Financeira do fechamento.
 */
export const TabFinanceiro: React.FC<TabFinanceiroProps> = ({
   payments,
   totalPagamentos,
   totalLitros,
   totalFrentistas,
   leituras,
   bicos,
   frentistaSessions,
   frentistas,
   loading,
   handlers
}) => {
   return (
      <div className="animate-in fade-in duration-300">
         <SecaoPagamentos
            pagamentos={payments}
            onPagamentoChange={handlers.alterarPagamento}
            onPagamentoBlur={handlers.aoSairPagamento}
            totalPagamentos={totalPagamentos}
            isLoading={loading}
         />

         <div className="mt-8">
            <SecaoResumo
               totalLitros={totalLitros}
               totalSessoes={totalFrentistas}
               totalPagamentos={totalPagamentos}
               leituras={leituras}
               bicos={bicos}
               sessoes={frentistaSessions}
               frentistas={frentistas}
               isLoading={loading}
            />
         </div>
      </div>
   );
};
