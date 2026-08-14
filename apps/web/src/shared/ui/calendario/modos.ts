/**
 * Modos do calendário — o ponto de extensão do componente.
 *
 * @remarks
 * O núcleo (`calendario.tsx`) desenha grade, navegação e popover, e **não sabe** o que é
 * "dia", "intervalo" ou "mês". Quem sabe é o modo, passado como parâmetro. Modo novo
 * ("semana", "últimos 7 dias", "trimestre") é um objeto novo **neste arquivo** — o núcleo
 * não se altera. É o Open/Closed aplicado ao lugar que de fato varia: a regra de seleção.
 *
 * Toda célula é um ISO **local** — `aaaa-mm-dd` na grade de dias, `aaaa-mm` na de meses.
 * Os dois ordenam corretamente por comparação de string, e é disso que a pintura vive.
 * Nunca `toISOString()`: o posto está em GMT-3 e isso jogaria cada data um dia para trás.
 */
import {
  paraMesLocal,
  hojeIso,
  formatarDataBR,
  formatarMesBR,
  formatarPeriodo,
  type Periodo,
} from '@/utils/periodo';

/** Resultado de um clique numa célula da grade. */
export type Selecao<V> =
  /** Seleção fechada: o calendário aplica o valor e fecha. */
  | { readonly tipo: 'concluida'; readonly valor: V }
  /** Seleção em andamento: falta a outra ponta, o calendário fica aberto. */
  | { readonly tipo: 'parcial'; readonly ancora: string };

/**
 * Contrato de um modo de seleção.
 *
 * @typeParam V - O valor que o modo produz: `string` (dia ou mês) ou {@link Periodo}.
 */
export interface ModoCalendario<V> {
  /**
   * Geometria da grade. É o único eixo que o núcleo precisa conhecer, porque muda o
   * desenho (7 colunas de dias × 3 de meses) e o passo das setas (mês × ano).
   */
  readonly grade: 'dias' | 'meses';

  /** Rótulo do valor atual, no botão que abre o calendário. */
  rotulo(valor: V): string;

  /** Célula por onde o calendário deve abrir — define o mês/ano visível. */
  ancora(valor: V): string;

  /**
   * Traduz um clique em seleção.
   *
   * @param celula - Célula clicada, no ISO da grade.
   * @param parcial - Âncora de uma seleção em andamento, ou `null`.
   */
  selecionar(celula: string, parcial: string | null): Selecao<V>;

  /**
   * Extremos do que deve aparecer pintado agora — o valor aplicado, ou a prévia da
   * seleção em andamento. O núcleo pinta `extremo` nas pontas e `dentro` no miolo,
   * sem saber de qual modo veio.
   *
   * @param sobre - Célula sob o cursor, para a prévia do intervalo.
   */
  intervaloPintado(valor: V, parcial: string | null, sobre: string | null): Periodo;

  /** Dica no rodapé. String vazia esconde a linha. */
  dica(parcial: string | null): string;

  /** Valor aplicado pelo atalho "Hoje". */
  hoje(): V;
}

/** Um dia só. Clique único aplica e fecha. */
export const modoDia: ModoCalendario<string> = {
  grade: 'dias',
  rotulo: (valor) => (valor ? formatarDataBR(valor) : 'Escolher data'),
  ancora: (valor) => valor || hojeIso(),
  selecionar: (celula) => ({ tipo: 'concluida', valor: celula }),
  intervaloPintado: (valor) => ({ inicio: valor, fim: valor }),
  dica: () => '',
  hoje: () => hojeIso(),
};

/** Um mês só, na grade dos 12 meses do ano. */
export const modoMes: ModoCalendario<string> = {
  grade: 'meses',
  rotulo: (valor) => (valor ? formatarMesBR(valor) : 'Escolher mês'),
  ancora: (valor) => valor || paraMesLocal(new Date()),
  selecionar: (celula) => ({ tipo: 'concluida', valor: celula }),
  intervaloPintado: (valor) => ({ inicio: valor, fim: valor }),
  dica: () => '',
  hoje: () => paraMesLocal(new Date()),
};

/**
 * Intervalo de dias, em dois cliques.
 *
 * @remarks Clicar duas vezes no mesmo dia vale como dia único; a ordem dos cliques não
 *          importa, as pontas são ordenadas na hora de aplicar.
 */
export const modoIntervalo: ModoCalendario<Periodo> = {
  grade: 'dias',
  rotulo: (valor) => formatarPeriodo(valor),
  ancora: (valor) => valor.fim,

  selecionar: (celula, parcial) => {
    if (parcial === null) return { tipo: 'parcial', ancora: celula };
    const [inicio, fim] = parcial <= celula ? [parcial, celula] : [celula, parcial];
    return { tipo: 'concluida', valor: { inicio, fim } };
  },

  intervaloPintado: (valor, parcial, sobre) => {
    if (parcial === null) return valor;
    const outra = sobre ?? parcial;
    return parcial <= outra ? { inicio: parcial, fim: outra } : { inicio: outra, fim: parcial };
  },

  dica: (parcial) => (parcial === null ? 'Clique no dia inicial' : 'Agora clique no dia final'),

  hoje: () => {
    const hoje = hojeIso();
    return { inicio: hoje, fim: hoje };
  },
};
