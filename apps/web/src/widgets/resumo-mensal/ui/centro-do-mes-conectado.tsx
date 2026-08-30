import React from 'react';
import { Loader2 } from 'lucide-react';
import { useResumoMensal } from '../model/use-resumo-mensal';
import { CentroDoMes } from './centro-do-mes';

interface CentroDoMesConectadoProps {
  postoId: number | null;
  /** Mês a exibir, ISO local `aaaa-mm`. */
  mesIso: string;
}

/**
 * O centro do mês ligado ao banco — despesa → custo do litro → lucro.
 *
 * @remarks Existe separado de {@link ResumoMensal} porque os dois vivem em telas
 *          diferentes: a corrente resumida fica na Visão do Proprietário, e as
 *          três tabelas da planilha ganharam tela própria. Ambos leem o mesmo
 *          hook, então nunca divergem.
 */
export const CentroDoMesConectado: React.FC<CentroDoMesConectadoProps> = ({
  postoId,
  mesIso,
}) => {
  const { dados, carregando } = useResumoMensal(postoId, mesIso);

  if (carregando) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 py-6 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Apurando o centro do mês...
        </div>
      </div>
    );
  }

  if (!dados) return null;

  return (
    <CentroDoMes
      totais={dados.venda.totais}
      produtos={dados.venda.produtos}
      codigoDoProduto={(produto) => dados.referencias.find((r) => r.produto === produto)?.codigo ?? null}
      despesaDoMes={dados.despesaDoMes}
      temDespesa={dados.venda.temDespesa}
      apurado={dados.venda.apurado}
    />
  );
};
