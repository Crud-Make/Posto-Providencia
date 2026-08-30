import React from 'react';
import { Droplets, Receipt, Divide, TrendingUp, AlertTriangle } from 'lucide-react';
import { corDoProduto, formatCurrency } from '@posto/utils';
import type { LinhaProduto, TotaisMes } from '@posto/utils';

interface CentroDoMesProps {
  readonly totais: TotaisMes;
  /** Litros por produto, para o mini gráfico do elo de litros. */
  readonly produtos: readonly LinhaProduto[];
  /** Código do combustível (GC/GA/ET/S10) de um produto, para a cor da planilha. */
  readonly codigoDoProduto: (produto: string) => string | null;
  readonly despesaDoMes: number;
  readonly temDespesa: boolean;
  /** `false` quando algum produto ficou sem custo — o lucro exibido é parcial. */
  readonly apurado: boolean;
}

// Litro inteiro: os três decimais do encerrante (36.277,288) só alongam o número
// no card; o custo do litro ao lado é onde a precisão importa, e ele segue com 4 casas.
const litros = (v: number) =>
  `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L`;

const porLitro = (v: number | null) =>
  v === null
    ? '—'
    : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;

interface EloProps {
  readonly icone: React.ReactNode;
  readonly rotulo: string;
  readonly valor: string;
  readonly nota: string;
  readonly destaque?: boolean;
  readonly negativo?: boolean;
  /** Conteúdo extra abaixo da nota (ex.: o mini gráfico de litros). */
  readonly extra?: React.ReactNode;
}

/**
 * Um elo da corrente. O `destaque` é o lucro — o número que o dono procura
 * primeiro, e o único que muda de cor conforme o sinal.
 */
const Elo: React.FC<EloProps> = ({ icone, rotulo, valor, nota, destaque, negativo, extra }) => (
  <div
    className={`flex-1 min-w-[180px] rounded-2xl border p-5 ${
      destaque
        ? 'border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}
  >
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {icone}
      {rotulo}
    </div>
    <p
      className={`mt-2 text-2xl font-bold font-finance tabular-nums ${
        destaque
          ? negativo
            ? 'text-red-600 dark:text-red-400'
            : 'text-green-600 dark:text-green-400'
          : 'text-gray-900 dark:text-white'
      }`}
    >
      {valor}
    </p>
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{nota}</p>
    {extra}
  </div>
);

/**
 * Mini gráfico dos litros do mês por produto — a coluna `Produto,%` da planilha,
 * nas cores dela: uma barra empilhada e a legenda com litros e participação.
 */
const BarraLitros: React.FC<{
  readonly produtos: readonly LinhaProduto[];
  readonly codigoDoProduto: (produto: string) => string | null;
}> = ({ produtos, codigoDoProduto }) => {
  const comVenda = produtos.filter((p) => p.litros > 0);
  if (comVenda.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        {comVenda.map((p) => (
          <div
            key={p.produto}
            title={`${p.produto}: ${litros(p.litros)}`}
            style={{ width: `${p.participacaoLitros}%`, backgroundColor: corDoProduto(codigoDoProduto(p.produto)).fundo }}
          />
        ))}
      </div>
      <ul className="mt-2 space-y-0.5">
        {comVenda.map((p) => (
          <li key={p.produto} className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: corDoProduto(codigoDoProduto(p.produto)).fundo }} />
            <span className="truncate">{p.produto}</span>
            <span className="ml-auto font-finance tabular-nums">{litros(p.litros)}</span>
            <span className="w-10 text-right tabular-nums text-gray-400">{p.participacaoLitros.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Seta que liga um elo ao próximo — some no celular, onde os cards empilham. */
const Seta: React.FC = () => (
  <div className="hidden lg:flex items-center justify-center px-1 text-gray-300 dark:text-gray-600 select-none">
    <span className="text-2xl leading-none">→</span>
  </div>
);

/**
 * O centro do mês: despesa → custo do litro → lucro.
 *
 * @remarks É a corrente que a planilha calcula mas mostra partida em dois blocos
 *          distantes — a despesa e o custo do litro no bloco de compra, o lucro
 *          lá no de venda. Na planilha a origem é a célula `I16` (que puxa a
 *          matriz de despesas) e daí sai `I19 = I16 ÷ litros vendidos`, que
 *          alimenta o piso de venda de cada produto e, por consequência, todo o
 *          lucro. Mudar a despesa move o lucro do posto inteiro — e é isso que
 *          esta seção torna visível de uma vez só.
 *
 *          Não calcula nada: recebe os números já apurados por `@posto/utils`.
 */
export const CentroDoMes: React.FC<CentroDoMesProps> = ({
  totais,
  produtos,
  codigoDoProduto,
  despesaDoMes,
  temDespesa,
  apurado,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">
        O centro do mês
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        A despesa do mês dividida pelos litros vendidos vira o custo do litro, e é ele que define
        o lucro de cada produto. Mexeu na despesa, mexeu no lucro do posto inteiro.
      </p>
    </div>

    <div className="flex flex-wrap items-stretch gap-3">
      <Elo
        icone={<Receipt className="w-3.5 h-3.5" />}
        rotulo="Despesa do mês"
        valor={formatCurrency(despesaDoMes)}
        nota={temDespesa ? 'Tudo que o posto gastou no mês' : 'Nada lançado neste mês'}
      />
      <Seta />
      <Elo
        icone={<Droplets className="w-3.5 h-3.5" />}
        rotulo="Litros vendidos"
        valor={litros(totais.litros)}
        nota="Denominador do rateio"
        extra={<BarraLitros produtos={produtos} codigoDoProduto={codigoDoProduto} />}
      />
      <Seta />
      <Elo
        icone={<Divide className="w-3.5 h-3.5" />}
        rotulo="Custo do litro"
        valor={porLitro(totais.despesaPorLitro)}
        nota="Despesa ÷ litros vendidos"
      />
      <Seta />
      <Elo
        icone={<TrendingUp className="w-3.5 h-3.5" />}
        rotulo="Lucro do mês"
        valor={`${formatCurrency(totais.lucro)}${apurado ? '' : ' *'}`}
        nota={`Margem de ${totais.margem.toLocaleString('pt-BR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}% sobre ${formatCurrency(totais.venda)}`}
        destaque
        negativo={totais.lucro < 0}
      />
    </div>

    {!temDespesa && (
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Sem despesa lançada, o custo do litro é zero e o lucro acima é <strong>bruto</strong> —
          está maior do que a realidade. Lance as despesas do mês para o número ficar de pé.
        </span>
      </div>
    )}

    {!apurado && (
      <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
        * Lucro parcial: há produto vendido sem compra lançada no mês, e sem custo não há lucro a
        apurar.
      </p>
    )}
  </div>
);
