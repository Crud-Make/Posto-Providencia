/**
 * A tendência dos cards do Dashboard ("+12% vs. ontem") — calculada, não escrita à mão.
 *
 * @remarks Até 24/09/2026 os três cards mostravam "+12%", "+5%" e "0%" fixos no código: a tela
 *          afirmava uma alta que ninguém mediu. Agora o período escolhido é comparado com o período
 *          anterior de MESMO tamanho, que termina na véspera do início (um dia → o dia anterior;
 *          uma semana → a semana anterior). Sem base de comparação, a tendência é "—", nunca um
 *          número inventado: é melhor a tela não dizer nada do que dizer errado.
 *
 *          A variação é sobre valores que já saíram prontos da agregação — nenhuma conta de
 *          dinheiro nasce aqui, só a razão entre dois totais.
 */

export interface Tendencia {
  /** Ex.: "+12,5%", "-3%", "0%" ou "—" (sem base). */
  readonly texto: string;
  /** `true` quando caiu — o card pinta de vermelho. */
  readonly negativa: boolean;
}

export interface PeriodoIso {
  readonly inicio: string;
  readonly fim: string;
}

const SEM_BASE: Tendencia = { texto: '—', negativa: false };
const UM_DIA_MS = 86_400_000;

function paraDia(iso: string): number {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 1);
}

/** Dia em UTC → `YYYY-MM-DD`. A conta toda é em UTC (entra por `Date.UTC`), então não há fuso. */
function paraIso(ms: number): string {
  const dia = new Date(ms);
  const dois = (n: number): string => String(n).padStart(2, '0');
  return `${dia.getUTCFullYear()}-${dois(dia.getUTCMonth() + 1)}-${dois(dia.getUTCDate())}`;
}

/** O período anterior de mesmo tamanho, terminando na véspera do início. */
export function periodoAnterior(periodo: PeriodoIso): PeriodoIso {
  const inicio = paraDia(periodo.inicio);
  const dias = Math.round((paraDia(periodo.fim) - inicio) / UM_DIA_MS) + 1;
  return { inicio: paraIso(inicio - dias * UM_DIA_MS), fim: paraIso(inicio - UM_DIA_MS) };
}

/** "vs. ontem" só quando o período é hoje; um dia qualquer é "vs. dia anterior". */
export function rotuloDaComparacao(periodo: PeriodoIso, hoje: string): string {
  if (periodo.inicio !== periodo.fim) return 'vs. período anterior';
  return periodo.inicio === hoje ? 'vs. ontem' : 'vs. dia anterior';
}

/**
 * Variação percentual de `anterior` para `atual`, com uma casa decimal quando não é inteira.
 * Sem um dos dois (`null`, ex.: lucro sem compra no mês) ou com anterior zero e atual não, não há
 * base: devolve "—". Os dois zero: "0%".
 */
export function variacao(atual: number | null | undefined, anterior: number | null | undefined): Tendencia {
  if (atual === null || atual === undefined || anterior === null || anterior === undefined) return SEM_BASE;
  if (anterior === 0) return atual === 0 ? { texto: '0%', negativa: false } : SEM_BASE;

  const percentual = Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10;
  const sinal = percentual > 0 ? '+' : '';
  return {
    texto: `${sinal}${percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
    negativa: percentual < 0,
  };
}
