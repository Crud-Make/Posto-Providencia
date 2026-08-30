/**
 * Seção "Impacto das trocas de preço" da Visão do Proprietário (Issue #61).
 *
 * Uma linha por troca: quando, de quanto para quanto, o que havia no tanque e
 * quanto esses litros renderam a mais (ou a menos) ao preço novo. Não calcula
 * nada — os números chegam prontos do hook, que os pega de `@posto/utils`.
 * Mês sem troca: a seção simplesmente não aparece.
 */
import React from 'react';
import { ArrowRight, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
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

const LinhaTroca: React.FC<{ impacto: ImpactoExibivel }> = ({ impacto }) => {
  const ganho = impacto.ganhoPerdaCentavos;
  const positivo = ganho != null && ganho >= 0;

  return (
    <li className="py-3 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
        <span className="font-semibold">{diaCurto(impacto.data)}</span>
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
          <span className={`flex items-center gap-1 font-bold ${positivo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {positivo ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {positivo ? '+' : ''}{reais(ganho)}
          </span>
        )}
      </div>
    </li>
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

  const totalPositivo = dados.totalCentavos >= 0;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <header className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Impacto das trocas de preço</h2>
        <span className={`font-bold ${totalPositivo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {totalPositivo ? '+' : ''}{reais(dados.totalCentavos)} no mês
        </span>
      </header>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Quanto os litros que já estavam no tanque renderam a mais (ou a menos) por cada mudança de
        preço, em relação ao preço antigo.
      </p>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {dados.impactos.map((impacto) => (
          <LinhaTroca key={`${impacto.combustivel}-${impacto.data}`} impacto={impacto} />
        ))}
      </ul>
    </section>
  );
};
