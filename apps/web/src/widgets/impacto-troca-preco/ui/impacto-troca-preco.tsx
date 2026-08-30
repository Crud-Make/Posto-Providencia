/**
 * Seção "Impacto das trocas de preço" da Visão do Proprietário (Issues #61 e #70).
 *
 * Um CARD por troca, desenhado para o dono bater o olho: a narrativa da placa
 * do poste ("por X dias o litro saiu a Y; em DD/MM subiu para Z") à esquerda e
 * o VEREDITO — LUCRO ou PREJUÍZO no estoque, em número grande — à direita.
 * Abaixo, três fatos: tanque na véspera, margem por litro e estoque valorizado.
 * Não calcula nada — os números chegam prontos do hook, que os pega de
 * `@posto/utils`. Mês sem troca: a seção não aparece.
 */
import React from 'react';
import { ArrowRight, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { corDeSinal, corDoProduto } from '@posto/utils';
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

const numeros: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

/** Sigla na cor que o dono reconhece da planilha (GC vermelho, ET verde…). */
const ChipCombustivel: React.FC<{ readonly codigo: string | null; readonly nome: string }> = ({
  codigo,
  nome,
}) => {
  const cor = corDoProduto(codigo);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="rounded-md px-2 py-0.5 text-xs font-extrabold tracking-wide"
        style={{ backgroundColor: cor.fundo, color: cor.texto }}
      >
        {codigo ?? '—'}
      </span>
      <span className="font-bold text-gray-900 dark:text-white">{nome}</span>
    </span>
  );
};

/** A frase da placa do poste: quanto tempo valeu o preço antigo e o que houve. */
const narrativa = (i: ImpactoExibivel): string => {
  const verbo = i.direcao === 'subida' ? 'subiu' : 'caiu';
  const delta = precoBR(Math.abs(i.precoNovo - i.precoAntigo));
  const vigencia =
    i.diasComPrecoAntigo == null
      ? `O litro saía a R$ ${precoBR(i.precoAntigo)}`
      : i.diasComPrecoAntigo === 1
        ? `Por 1 dia o litro saiu a R$ ${precoBR(i.precoAntigo)}`
        : `Por ${i.diasComPrecoAntigo} dias o litro saiu a R$ ${precoBR(i.precoAntigo)}`;
  return `${vigencia}. Em ${diaCurto(i.data)} o preço ${verbo} R$ ${delta} e foi para R$ ${precoBR(i.precoNovo)}.`;
};

/** O bloco que responde a única pergunta do dono: lucrou ou perdeu? */
const Veredito: React.FC<{ readonly ganhoCentavos: number | null }> = ({ ganhoCentavos }) => {
  if (ganhoCentavos == null) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-5 py-4 min-w-[180px] bg-gray-50 dark:bg-gray-700/40 text-center">
        <span className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400">
          SEM MEDIÇÃO DE TANQUE
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          não dá para apurar lucro ou prejuízo
        </span>
      </div>
    );
  }
  const positivo = ganhoCentavos >= 0;
  const cor = corDeSinal(ganhoCentavos);
  return (
    <div className={`flex flex-col items-center justify-center gap-1 px-5 py-4 min-w-[180px] text-center ${cor.fundo}`}>
      <span className={`flex items-center gap-1 text-[11px] font-bold tracking-widest ${cor.texto}`}>
        {positivo ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {positivo ? 'LUCRO NO ESTOQUE' : 'PREJUÍZO NO ESTOQUE'}
      </span>
      <span className={`text-2xl font-extrabold ${cor.texto}`} style={numeros}>
        {reaisComSinal(ganhoCentavos)}
      </span>
    </div>
  );
};

const Fato: React.FC<{ readonly rotulo: string; readonly children: React.ReactNode }> = ({
  rotulo,
  children,
}) => (
  <div className="px-4 py-2.5">
    <div className="text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500 uppercase">
      {rotulo}
    </div>
    <div className="text-sm text-gray-700 dark:text-gray-200" style={numeros}>
      {children}
    </div>
  </div>
);

const CardTroca: React.FC<{ readonly impacto: ImpactoExibivel }> = ({ impacto }) => (
  <li className="rounded-2xl border border-gray-100 dark:border-gray-700/70 overflow-hidden bg-gray-50/50 dark:bg-gray-900/30">
    <div className="flex flex-wrap items-stretch">
      <div className="flex-1 min-w-[260px] px-4 py-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <ChipCombustivel codigo={impacto.codigoCombustivel} nome={impacto.nomeCombustivel} />
          <span className="text-xs text-gray-400 dark:text-gray-500">{diaCurto(impacto.data)}</span>
        </div>
        <div className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white" style={numeros}>
          <span className="text-gray-400 dark:text-gray-500 line-through decoration-2">
            R$ {precoBR(impacto.precoAntigo)}
          </span>
          <ArrowRight size={18} className="text-gray-400" />
          <span>R$ {precoBR(impacto.precoNovo)}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{narrativa(impacto)}</p>
      </div>
      <Veredito ganhoCentavos={impacto.ganhoPerdaCentavos} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-gray-100 dark:border-gray-700/70 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700/70">
      <Fato rotulo="Tanque na véspera">
        {impacto.litrosNoTanque == null ? (
          <span className="text-gray-400 dark:text-gray-500">sem régua antes da troca</span>
        ) : (
          <>
            <span className="font-semibold">{Math.round(impacto.litrosNoTanque).toLocaleString('pt-BR')} L</span>
            {impacto.custoMedioLitro != null && ` · comprados a R$ ${precoBR(impacto.custoMedioLitro)}/L`}
          </>
        )}
      </Fato>
      <Fato rotulo="Margem por litro">
        {impacto.margemAntigaLitro == null || impacto.margemNovaLitro == null ? (
          <span className="text-gray-400 dark:text-gray-500">sem compra no mês</span>
        ) : (
          <>
            R$ {precoBR(impacto.margemAntigaLitro)} →{' '}
            <span className={`font-semibold ${corDeSinal(impacto.margemNovaLitro - impacto.margemAntigaLitro).texto}`}>
              R$ {precoBR(impacto.margemNovaLitro)}
            </span>
          </>
        )}
      </Fato>
      <Fato rotulo="Valor do estoque">
        {impacto.valorEstoqueAntigoCentavos == null || impacto.valorEstoqueNovoCentavos == null ? (
          <span className="text-gray-400 dark:text-gray-500">sem régua antes da troca</span>
        ) : (
          <>
            {reais(impacto.valorEstoqueAntigoCentavos)} →{' '}
            <span className="font-semibold">{reais(impacto.valorEstoqueNovoCentavos)}</span>
          </>
        )}
      </Fato>
    </div>
  </li>
);

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
  const corMes = corDeSinal(resumo.liquidoCentavos);
  const lados = [
    resumo.subidas.quantidade > 0 &&
      `${resumo.subidas.quantidade} ${resumo.subidas.quantidade === 1 ? 'subida' : 'subidas'}`,
    resumo.descidas.quantidade > 0 &&
      `${resumo.descidas.quantidade} ${resumo.descidas.quantidade === 1 ? 'descida' : 'descidas'}`,
  ].filter(Boolean);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Impacto das trocas de preço</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {lados.join(' · ')} no mês — o que os litros que já estavam no tanque ganharam ou perderam
            quando o preço da bomba mudou.
          </p>
        </div>
        <div className={`rounded-2xl px-4 py-2 text-center ${corMes.fundo}`}>
          <div className={`text-[11px] font-bold tracking-widest ${corMes.texto}`}>
            {resumo.liquidoCentavos >= 0 ? 'RESULTADO: LUCRO' : 'RESULTADO: PREJUÍZO'}
          </div>
          <div className={`text-xl font-extrabold ${corMes.texto}`} style={numeros}>
            {reaisComSinal(resumo.liquidoCentavos)} no mês
          </div>
        </div>
      </header>
      <ul className="flex flex-col gap-3 mt-3">
        {dados.impactos.map((impacto) => (
          <CardTroca key={`${impacto.combustivel}-${impacto.data}`} impacto={impacto} />
        ))}
      </ul>
    </section>
  );
};
