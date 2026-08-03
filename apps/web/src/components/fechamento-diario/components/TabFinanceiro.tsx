import * as React from 'react';
import { useState, useMemo } from 'react';
import { SecaoPagamentos } from './PainelFinanceiro';
import { SecaoResumo } from './ResumoCombustivel';
import { useCaixaGeralMes } from '../hooks/useCaixaGeralMes';
import { distribuirNasFormas } from '../../../utils/fechamentoMeios';
import { formatarMesBR, mesesRecentes, hojeIso } from '../../../utils/periodo';
import { paraReais } from '../../../utils/formatters';
import type {
   EntradaPagamento,
   BicoComDetalhes,
   SessaoFrentista,
   Frentista
} from '../../../types/fechamento';

/** Recorte que o Caixa Geral está exibindo. */
type Escopo = 'dia' | 'mes';

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
   /** Data selecionada na tela, ISO local `aaaa-mm-dd`. Define o mês da visão mensal. */
   dataSelecionada: string;
   postoId: number | null;
   onRefreshSessoes?: () => void;
   handlers: {
      alterarPagamento: (idx: number, val: string) => void;
      aoSairPagamento: (idx: number) => void;
      sincronizarComSessoes: (sessoes: SessaoFrentista[]) => void;
   };
}

/**
 * Aba Financeira do fechamento.
 *
 * @remarks
 * O Caixa Geral tem dois recortes. **Dia** é o de sempre: editável, é onde o dono
 * lança e salva. **Mês** consolida o mês inteiro da data selecionada e é **somente
 * leitura** — um total de mês não tem onde ser gravado, porque `Recebimento` pendura
 * num `Fechamento`, que é de um dia; salvar o mês num dia inventaria movimento na
 * data errada.
 *
 * No mês, a reconciliação por bomba fica escondida de propósito: ela compara
 * encerrante com caixa **do dia**, e mostrá-la ao lado de um total mensal seria somar
 * escalas diferentes na mesma tela.
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
   dataSelecionada,
   postoId,
   onRefreshSessoes,
   handlers
}) => {
   const [escopo, setEscopo] = useState<Escopo>('dia');
   // `null` = segue o mês da data selecionada. Assim que o dono escolhe um mês na
   // lista, a escolha dele manda — trocar a data não puxa a visão mensal de volta
   // no meio de uma comparação entre meses.
   const [mesEscolhido, setMesEscolhido] = useState<string | null>(null);

   const mesIso = mesEscolhido ?? (dataSelecionada || '').slice(0, 7);
   const ehMes = escopo === 'mes';

   // O mês da data selecionada entra na lista mesmo se for mais antigo que a janela,
   // senão o dono abre um dia de janeiro e não acha janeiro no seletor.
   const mesesDisponiveis = useMemo(() => {
      const recentes = mesesRecentes(hojeIso(), 12);
      const doDia = (dataSelecionada || '').slice(0, 7);
      return doDia && !recentes.includes(doDia)
         ? [...recentes, doDia].sort().reverse()
         : recentes;
   }, [dataSelecionada]);

   const {
      totais, totalConferido, diasComMovimento, carregando, erro,
      sessoes: sessoesDoMes, dadosCombustivel, totalLitros: litrosDoMes,
   } = useCaixaGeralMes(postoId, mesIso, ehMes);

   // No mês, as formas cadastradas continuam sendo as do dia — muda só o valor.
   const pagamentosDoMes = useMemo(
      () => distribuirNasFormas(payments, totais),
      [payments, totais]
   );

   const seletor = (
      <div className="flex flex-wrap items-center gap-3">
         <div className="inline-flex rounded-lg border border-slate-600 bg-slate-900/60 p-1" role="group" aria-label="Período do Caixa Geral">
            {(['dia', 'mes'] as const).map((op) => (
               <button
                  key={op}
                  type="button"
                  onClick={() => setEscopo(op)}
                  aria-pressed={escopo === op}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${escopo === op
                     ? 'bg-blue-600 text-white shadow-sm'
                     : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                     }`}
               >
                  {op === 'dia' ? 'Dia' : 'Mês inteiro'}
               </button>
            ))}
         </div>

         {ehMes && (
            <select
               value={mesIso}
               onChange={(e) => setMesEscolhido(e.target.value)}
               aria-label="Mês exibido"
               className="px-3 py-1.5 text-sm rounded-lg border border-slate-600 bg-slate-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
               {mesesDisponiveis.map((m) => (
                  <option key={m} value={m}>{formatarMesBR(m)}</option>
               ))}
            </select>
         )}
      </div>
   );

   const legenda = ehMes ? (
      erro
         ? <span className="text-amber-400">Não foi possível carregar o mês: {erro}</span>
         : carregando
            ? 'Somando o mês…'
            : <>
               {formatarMesBR(mesIso)} · {diasComMovimento} {diasComMovimento === 1 ? 'dia' : 'dias'} com movimento ·
               {' '}somente leitura, o lançamento é feito na visão de dia
            </>
   ) : undefined;

   return (
      <div className="animate-in fade-in duration-300">
         <SecaoPagamentos
            pagamentos={ehMes ? pagamentosDoMes : payments}
            onPagamentoChange={handlers.alterarPagamento}
            onPagamentoBlur={handlers.aoSairPagamento}
            onAutoFill={() => handlers.sincronizarComSessoes(frentistaSessions)}
            totalPagamentos={ehMes ? totalConferido : totalPagamentos}
            isLoading={ehMes ? carregando : loading}
            somenteLeitura={ehMes}
            controleCabecalho={seletor}
            legenda={legenda}
            rotuloTotal={ehMes ? 'Total do mês:' : 'Total em Pagamentos:'}
         />

         <div className="mt-8">
            <SecaoResumo
               totalLitros={ehMes ? litrosDoMes : totalLitros}
               // No mês, "apurado" e "recebido" saem da MESMA fonte (o que o frentista
               // declarou), então a diferença é sempre zero — e é isso mesmo: quem
               // confronta bomba com caixa é a visão de dia, onde o encerrante entra.
               totalSessoes={ehMes ? totalConferido : totalFrentistas}
               totalPagamentos={ehMes ? totalConferido : totalPagamentos}
               leituras={leituras}
               bicos={bicos}
               sessoes={ehMes ? sessoesDoMes : frentistaSessions}
               frentistas={frentistas}
               dadosCombustivelPronto={ehMes ? dadosCombustivel : undefined}
               onRefresh={ehMes ? undefined : onRefreshSessoes}
               isLoading={ehMes ? carregando : loading}
            />
         </div>

         {ehMes && !carregando && !erro && (
            <p className="mt-4 text-sm text-slate-400">
               Conferido no mês: <span className="font-mono text-slate-200">{paraReais(totalConferido)}</span>.
               A conferência bomba a bomba é por dia — volte para <strong>Dia</strong> para vê-la.
            </p>
         )}
      </div>
   );
};
