/**
 * Seção "Impacto das trocas de preço" da Visão do Proprietário (Issues #61 e #70).
 *
 * Uma linha por troca: quando, de quanto para quanto, a direção (subida ou
 * descida), o que havia no tanque, a margem bruta por litro antes/depois e o
 * valor de venda do estoque a cada preço. O cabeçalho decompõe o mês em
 * subidas × descidas. Não calcula nada — os números chegam prontos do hook,
 * que os pega de `@posto/utils`. Mês sem troca: a seção não aparece.
 */
import React from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { corDeSinal, type DirecaoTroca, type LadoDirecao } from '@posto/utils';
import { useImpactoTrocaPreco, type ImpactoExibivel } from '../model/use-impacto-troca-preco';

interface Props {
  readonly postoId: number | null;
  /** Mês a exibir, ISO local `aaaa-mm`. */
  readonly mesIso: string;
}

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const precoBR = (reaisPorLitro: number) =>
  reaisPorLitro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "2026-01-07" → "07/01", sem passar por `new Date` (fuso escorrega o dia). */
const diaCurto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** `+R$ 300,00` / `-R$ 180,00` — o sinal explícito é o que o dono lê primeiro. */
const reaisComSinal = (centavos: number) => `${centavos >= 0 ? '+' : ''}${reais(centavos)}`;

const SeloDirecao: React.FC<{ readonly direcao: DirecaoTroca }> = ({ direcao }) => (
  <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
    {direcao === 'subida' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
    {direcao === 'subida' ? 'Subida' : 'Descida'}
  </span>
);

const LinhaTroca: React.FC<{ readonly impacto: ImpactoExibivel }> = ({ impacto }) => {
  const ganho = impacto.ganhoPerdaCentavos;
  const temMargem = impacto.margemAntigaLitro != null && impacto.margemNovaLitro != null;
  const temValorEstoque =
    impacto.valorEstoqueAntigoCentavos != null && impacto.valorEstoqueNovoCentavos != null;

  return (
    <li className="py-3 flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
        <span className="font-semibold">{diaCurto(impacto.data)}</span>
        <SeloDirecao direcao={impacto.direcao} />
        <span>{impacto.nomeCombustivel}</span>
        <span className="text-gray-500 dark:text-gray-400">R$ {precoBR(impacto.precoAntigo)}</span>
        <ArrowRight size={14} className="text-gray-400" />
        <span className="font-semibold">R$ {precoBR(impacto.precoNovo)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          {impacto.litrosNoTanque == null
            ? 'Sem régua de tanque no período — impacto não apurável'
            : `Tanque com ${Math.round(impacto.litrosNoTanque).toLocaleString('pt-BR')} L` +
              (impacto.custoMedioLitro != null ? ` comprados a R$ ${precoBR(impacto.custoMedioLitro)}/L` : '')}
        </span>
        {ganho != null && (
          <span className={`flex items-center gap-1 font-bold ${corDeSinal(ganho).texto}`}>
            {ganho >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {reaisComSinal(ganho)}
          </span>
        )}
      </div>
      {(temMargem || temValorEstoque) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
          {temMargem && (
            <span>
              Margem/L: R$ {precoBR(impacto.margemAntigaLitro ?? 0)} →{' '}
              <span
                className={`font-semibold ${corDeSinal((impacto.margemNovaLitro ?? 0) - (impacto.margemAntigaLitro ?? 0)).texto}`}
              >
                R$ {precoBR(impacto.margemNovaLitro ?? 0)}
              </span>
            </span>
          )}
          {temValorEstoque && (
            <span>
              Estoque: {reais(impacto.valorEstoqueAntigoCentavos ?? 0)} →{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {reais(impacto.valorEstoqueNovoCentavos ?? 0)}
              </span>
            </span>
          )}
        </div>
      )}
    </li>
  );
};

const ResumoLado: React.FC<{ readonly rotulo: [string, string]; readonly lado: LadoDirecao }> = ({
  rotulo: [singular, plural],
  lado,
}) => {
  if (lado.quantidade === 0) return null;
  return (
    <span>
      {lado.quantidade} {lado.quantidade === 1 ? singular : plural}:{' '}
      <span className={`font-semibold ${corDeSinal(lado.totalCentavos).texto}`}>
        {reaisComSinal(lado.totalCentavos)}
      </span>
    </span>
  );
};

export const ImpactoTrocaPreco: React.FC<Props> = ({ postoId, mesIso }) => {
  const { dados, carregando, erro } = useImpactoTrocaPreco(postoId, mesIso);

  if (carregando) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 py-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Procurando trocas de preço no mês...
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-red-200 dark:border-red-900 p-6 shadow-sm text-sm text-red-600 dark:text-red-400">
        Trocas de preço: {erro}
      </div>
    );
  }

  if (!dados || dados.impactos.length === 0) return null;

  const { resumo } = dados;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <header className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Impacto das trocas de preço</h2>
        <span className={`font-bold ${corDeSinal(resumo.liquidoCentavos).texto}`}>
          {reaisComSinal(resumo.liquidoCentavos)} no mês
        </span>
      </header>
      <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
        <ResumoLado rotulo={['subida', 'subidas']} lado={resumo.subidas} />
        <ResumoLado rotulo={['descida', 'descidas']} lado={resumo.descidas} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Quanto os litros que já estavam no tanque renderam a mais (ou a menos) por cada mudança de
        preço, e o que a mudança fez com a margem bruta por litro (preço − custo médio de compra do
        mês; despesas não entram).
      </p>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {dados.impactos.map((impacto) => (
          <LinhaTroca key={`${impacto.combustivel}-${impacto.data}`} impacto={impacto} />
        ))}
      </ul>
    </section>
  );
};
