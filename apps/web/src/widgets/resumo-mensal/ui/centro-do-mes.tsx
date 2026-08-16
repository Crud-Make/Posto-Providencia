import React from 'react';
import { Droplets, Receipt, Divide, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@posto/utils';
import type { TotaisMes } from '@posto/utils';

interface CentroDoMesProps {
  readonly totais: TotaisMes;
  readonly despesaDoMes: number;
  readonly temDespesa: boolean;
  /** `false` quando algum produto ficou sem custo — o lucro exibido é parcial. */
  readonly apurado: boolean;
}

const litros = (v: number) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} L`;

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
}

/**
 * Um elo da corrente. O `destaque` é o lucro — o número que o dono procura
 * primeiro, e o único que muda de cor conforme o sinal.
 */
const Elo: React.FC<EloProps> = ({ icone, rotulo, valor, nota, destaque, negativo }) => (
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
            : 'text-emerald-600 dark:text-emerald-400'
          : 'text-gray-900 dark:text-white'
      }`}
    >
      {valor}
    </p>
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{nota}</p>
  </div>
);

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
