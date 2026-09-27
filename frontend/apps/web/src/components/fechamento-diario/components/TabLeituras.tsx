import * as React from 'react';
// [20/01 10:00] Adição de prop onUpdatePrice
// Motivo: Propagar função de edição de preço para o componente filho TabelaLeituras
import { TabelaLeituras } from './TabelaLeituras';
import type { BicoComDetalhes } from '../../../types/fechamento';

interface TabLeiturasProps {
   bicos: BicoComDetalhes[];
   leituras: Record<number, { inicial: string; fechamento: string }>;
   loading: boolean;
   handlers: {
      alterarInicial: (id: number, val: string) => void;
      alterarFechamento: (id: number, val: string) => void;
      aoSairInicial: (id: number) => void;
      aoSairFechamento: (id: number) => void;
      calcLitros: (id: number) => { value: number; display: string };
   };
   onUpdatePrice: (bicoId: number, newPrice: number) => void;
}

/**
 * Aba Leituras de Bomba: só os encerrantes dos bicos.
 *
 * @remarks Os envios do app dos frentistas saíram daqui para a aba Detalhamento Frentistas
 *          (decisão do dono, 27/09/2026): com os 24 bicos do Posto BR, a tabela de envios ficava
 *          lá embaixo, depois de muita rolagem. Uma aba, um assunto.
 */
export const TabLeituras: React.FC<TabLeiturasProps> = ({
   bicos,
   leituras,
   loading,
   handlers,
   onUpdatePrice
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
            onUpdatePrice={onUpdatePrice}
         />
      </div>
   );
};
