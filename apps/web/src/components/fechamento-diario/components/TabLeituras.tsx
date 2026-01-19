import * as React from 'react';
import { TabelaLeituras } from './TabelaLeituras';
import { EnviosMobile } from './EnviosMobile';
import type { BicoComDetalhes, SessaoFrentista, Frentista } from '../../../types/fechamento';

interface TabLeiturasProps {
   bicos: BicoComDetalhes[];
   leituras: Record<number, { inicial: string; fechamento: string }>;
   frentistaSessions: SessaoFrentista[];
   frentistas: Frentista[];
   loading: boolean;
   onRefreshSessoes?: () => void;
   handlers: {
      alterarInicial: (id: number, val: string) => void;
      alterarFechamento: (id: number, val: string) => void;
      aoSairInicial: (id: number) => void;
      aoSairFechamento: (id: number) => void;
      calcLitros: (id: number) => { value: number; display: string };
   };
}

/**
 * Componente para a aba de Leituras e Frentistas do fechamento.
 */
export const TabLeituras: React.FC<TabLeiturasProps> = ({
   bicos,
   leituras,
   frentistaSessions,
   frentistas,
   loading,
   onRefreshSessoes,
   handlers
}) => {
   return (
      <div className="animate-in fade-in duration-300">
         <TabelaLeituras
            bicos={bicos}
            leituras={leituras}
            onLeituraInicialChange={handlers.alterarInicial}
            onLeituraFechamentoChange={handlers.alterarFechamento}
            onLeituraInicialBlur={handlers.aoSairInicial}
            onLeituraFechamentoBlur={handlers.aoSairFechamento}
            calcLitros={handlers.calcLitros}
            isLoading={loading}
         />

         <div className="mt-8 border-t border-slate-700/50 pt-8">
            <EnviosMobile
               sessoes={frentistaSessions}
               frentistas={frentistas}
               onRefresh={onRefreshSessoes}
               loading={loading}
            />
         </div>
      </div>
   );
};
