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
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { corDeSinal, corDoProduto } from '@posto/utils';
import type { BalancoTrocas } from '@posto/utils';
import {
  useImpactoTrocaPreco,
  type BarraVariacao,
  type ImpactoExibivel,
} from '../model/use-impacto-troca-preco';

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

/**
 * A barra fala POLARIDADE, a pedido do dono: verde = preço subiu (o estoque e
 * as vendas rendem mais), vermelho = caiu, cinza apagado = não mexeu. A
 * identidade do combustível fica na sigla do eixo — nunca cor sozinha.
 */
const corDaBarra = (variacao: number) =>
  variacao > 0 ? '#16A34A' : variacao < 0 ? '#DC2626' : '#64748B';

/** "Foi só o diesel ou mexeu tudo?" — quanto cada preço variou no mês. */
const GraficoVariacao: React.FC<{ readonly barras: readonly BarraVariacao[] }> = ({ barras }) => {
  if (barras.length === 0) return null;
  const dados = barras.map((b) => ({
    sigla: b.codigoCombustivel ?? b.nomeCombustivel,
    nome: b.nomeCombustivel,
    variacao: b.variacao,
    precoInicio: b.precoInicio,
    precoFim: b.precoFim,
  }));
  const rotulo = (v: number) =>
    v === 0 ? 'não mexeu' : `${v > 0 ? '+' : '−'}R$ ${precoBR(Math.abs(v))}`;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
        Variação do preço no mês, por combustível
      </p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 22, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
            <XAxis
              dataKey="sigla"
              tick={{ fontSize: 12, fill: '#94A3B8', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <ReferenceLine y={0} stroke="#94A3B8" strokeOpacity={0.4} />
            <Tooltip
              cursor={{ fill: '#94A3B8', fillOpacity: 0.08 }}
              formatter={(_valor: number | string, _nome: string, item: { payload?: (typeof dados)[number] }) => {
                const b = item.payload;
                return b
                  ? [`de R$ ${precoBR(b.precoInicio)} para R$ ${precoBR(b.precoFim)}`, b.nome]
                  : ['', ''];
              }}
              labelFormatter={() => ''}
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: 12,
                fontSize: 12,
                color: '#F9FAFB',
              }}
            />
            <Bar dataKey="variacao" radius={[4, 4, 0, 0]} maxBarSize={72} isAnimationActive={false}>
              {dados.map((b) => (
                <Cell key={b.sigla} fill={corDaBarra(b.variacao)} fillOpacity={b.variacao === 0 ? 0.25 : 1} />
              ))}
              <LabelList
                dataKey="variacao"
                position="top"
                formatter={rotulo}
                style={{ fontSize: 12, fontWeight: 700, fill: '#94A3B8' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

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

/** Os DOIS efeitos da troca: o estoque parado (uma vez) e as vendas (todo dia). */
const Veredito: React.FC<{ readonly impacto: ImpactoExibivel }> = ({ impacto }) => {
  const estoque = impacto.ganhoPerdaCentavos;
  const vendas = impacto.ganhoVendasCentavos;
  const corVendas = corDeSinal(vendas);
  return (
    <div className="flex flex-col justify-center gap-2 px-5 py-3 min-w-[230px] bg-gray-50 dark:bg-gray-700/30">
      {estoque == null ? (
        <div>
          <div className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400">
            NO ESTOQUE PARADO
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">sem medição de tanque — não apurável</div>
        </div>
      ) : (
        <div>
          <div className={`flex items-center gap-1 text-[11px] font-bold tracking-widest ${corDeSinal(estoque).texto}`}>
            {estoque >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {estoque >= 0 ? 'LUCRO NO ESTOQUE' : 'PREJUÍZO NO ESTOQUE'}
          </div>
          <div className={`text-2xl font-extrabold ${corDeSinal(estoque).texto}`} style={numeros}>
            {reaisComSinal(estoque)}
          </div>
        </div>
      )}
      <div className="border-t border-gray-200 dark:border-gray-600/60 pt-2">
        <div className={`text-[11px] font-bold tracking-widest ${corVendas.texto}`}>
          {vendas >= 0 ? 'LUCRO NAS VENDAS' : 'PREJUÍZO NAS VENDAS'} · DESDE {diaCurto(impacto.data)}
        </div>
        <div className={`text-lg font-extrabold ${corVendas.texto}`} style={numeros}>
          {reaisComSinal(vendas)}
        </div>
        {impacto.ganhoPorDiaCentavos != null && impacto.ritmoMensalCentavos != null && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400" style={numeros}>
            ritmo: {reaisComSinal(impacto.ganhoPorDiaCentavos)}/dia · {reaisComSinal(impacto.ritmoMensalCentavos)}/mês
          </div>
        )}
      </div>
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
      <Veredito impacto={impacto} />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-gray-100 dark:border-gray-700/70 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700/70">
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
      <Fato rotulo="Lucro bruto por dia">
        {impacto.lucroDiaAntigoCentavos == null || impacto.lucroDiaNovoCentavos == null ? (
          <span className="text-gray-400 dark:text-gray-500">
            {impacto.mediaLitrosDiaDesdeATroca == null ? 'sem venda desde a troca' : 'sem compra no mês'}
          </span>
        ) : (
          <>
            {reais(impacto.lucroDiaAntigoCentavos)} →{' '}
            <span className={`font-semibold ${corDeSinal(impacto.lucroDiaNovoCentavos - impacto.lucroDiaAntigoCentavos).texto}`}>
              {reais(impacto.lucroDiaNovoCentavos)}
            </span>
            {impacto.mediaLitrosDiaDesdeATroca != null &&
              ` · ${Math.round(impacto.mediaLitrosDiaDesdeATroca).toLocaleString('pt-BR')} L/dia`}
          </>
        )}
      </Fato>
    </div>
  </li>
);

/** O card geral do mês: o que as trocas renderam, o que custaram e o saldo. */
const BalancoMensal: React.FC<{
  readonly balanco: BalancoTrocas;
  readonly estoqueCentavos: number;
  readonly vendasCentavos: number;
}> = ({ balanco, estoqueCentavos, vendasCentavos }) => {
  const temLucro = balanco.lucroCentavos > 0;
  const temPrejuizo = balanco.prejuizoCentavos < 0;
  const corSaldo = corDeSinal(balanco.saldoCentavos);
  const neutroTexto = 'text-gray-400 dark:text-gray-500';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
      <div className={`rounded-2xl px-4 py-3 ${temLucro ? corDeSinal(1).fundo : 'bg-gray-50 dark:bg-gray-700/30'}`}>
        <div className={`flex items-center gap-1 text-[11px] font-bold tracking-widest ${temLucro ? corDeSinal(1).texto : neutroTexto}`}>
          <TrendingUp size={13} /> LUCRO NO MÊS
        </div>
        <div className={`text-2xl font-extrabold ${temLucro ? corDeSinal(1).texto : neutroTexto}`} style={numeros}>
          {temLucro ? reaisComSinal(balanco.lucroCentavos) : reais(0)}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">tudo que as trocas renderam</div>
      </div>
      <div className={`rounded-2xl px-4 py-3 ${temPrejuizo ? corDeSinal(-1).fundo : 'bg-gray-50 dark:bg-gray-700/30'}`}>
        <div className={`flex items-center gap-1 text-[11px] font-bold tracking-widest ${temPrejuizo ? corDeSinal(-1).texto : neutroTexto}`}>
          <TrendingDown size={13} /> PREJUÍZO NO MÊS
        </div>
        <div className={`text-2xl font-extrabold ${temPrejuizo ? corDeSinal(-1).texto : neutroTexto}`} style={numeros}>
          {temPrejuizo ? reaisComSinal(balanco.prejuizoCentavos) : reais(0)}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">tudo que as trocas custaram</div>
      </div>
      <div className={`rounded-2xl px-4 py-3 ring-1 ring-inset ring-gray-200 dark:ring-gray-600/60 ${corSaldo.fundo}`}>
        <div className={`text-[11px] font-bold tracking-widest ${corSaldo.texto}`}>
          {balanco.saldoCentavos >= 0 ? 'SALDO: LUCROU' : 'SALDO: PERDEU'}
        </div>
        <div className={`text-2xl font-extrabold ${corSaldo.texto}`} style={numeros}>
          {reaisComSinal(balanco.saldoCentavos)}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400" style={numeros}>
          estoque {reaisComSinal(estoqueCentavos)} · vendas {reaisComSinal(vendasCentavos)}
        </div>
      </div>
    </div>
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

  const { resumo, totalVendasCentavos, balanco } = dados;
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
      </header>
      <BalancoMensal
        balanco={balanco}
        estoqueCentavos={resumo.liquidoCentavos}
        vendasCentavos={totalVendasCentavos}
      />
      <GraficoVariacao barras={dados.barras} />
      <ul className="flex flex-col gap-3 mt-3">
        {dados.impactos.map((impacto) => (
          <CardTroca key={`${impacto.combustivel}-${impacto.data}`} impacto={impacto} />
        ))}
      </ul>
    </section>
  );
};
