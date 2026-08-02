/**
 * Decide se e como convidar o frentista a instalar o PWA na tela inicial.
 *
 * Lógica pura de propósito: o navegador é passado por parâmetro, nunca lido
 * daqui de dentro. É o que permite testar iPhone, iPad e Android sem aparelho
 * na mão — ver `instalacao.test.ts`.
 */

export const PLATAFORMA = ['ios', 'android', 'outra'] as const;
export type Plataforma = (typeof PLATAFORMA)[number];

export const CONVITE = ['oculto', 'botao', 'instrucoes-ios'] as const;
export type Convite = (typeof CONVITE)[number];

/**
 * @param userAgent `navigator.userAgent`
 * @param pontosDeToque `navigator.maxTouchPoints` — desempata iPad de Mac.
 * @remarks iPadOS 13+ declara "Macintosh" no user agent, idêntico a um Mac de
 *          mesa. O toque é o único sinal barato que separa os dois; sem ele o
 *          iPad cai em "outra" e nunca recebe o passo a passo.
 */
export function detectarPlataforma(userAgent: string, pontosDeToque: number): Plataforma {
  const ua = userAgent.toLowerCase();

  if (/iphone|ipod/.test(ua)) return 'ios';
  if (/ipad/.test(ua)) return 'ios';
  if (/macintosh/.test(ua) && pontosDeToque > 1) return 'ios';
  if (/android/.test(ua)) return 'android';

  return 'outra';
}

interface SinaisDeInstalacao {
  /** `matchMedia('(display-mode: standalone)').matches` */
  readonly standalonePorMedia: boolean;
  /** `navigator.standalone` — só existe no Safari do iOS. */
  readonly standalonePorNavigator?: boolean;
}

/**
 * @remarks Os dois sinais existem porque nenhum cobre tudo: o `display-mode`
 *          não é confiável no Safari do iOS, e `navigator.standalone` não
 *          existe em mais lugar nenhum.
 */
export function jaInstalado({
  standalonePorMedia,
  standalonePorNavigator = false,
}: SinaisDeInstalacao): boolean {
  return standalonePorMedia || standalonePorNavigator;
}

interface EstadoDoConvite {
  readonly plataforma: Plataforma;
  readonly instalado: boolean;
  /** O navegador disparou `beforeinstallprompt` e guardamos o evento. */
  readonly temPromptNativo: boolean;
  readonly dispensado: boolean;
}

/**
 * @returns `'botao'` chama o prompt nativo; `'instrucoes-ios'` ensina o caminho
 *          manual; `'oculto'` não mostra nada.
 * @remarks O iOS **nunca** dispara `beforeinstallprompt`. Um convite que espera
 *          por esse evento simplesmente nunca aparece em iPhone — por isso o
 *          caso do iOS é decidido antes, e não como fallback do prompt.
 */
export function decidirConvite({
  plataforma,
  instalado,
  temPromptNativo,
  dispensado,
}: EstadoDoConvite): Convite {
  if (instalado || dispensado) return 'oculto';
  if (temPromptNativo) return 'botao';
  if (plataforma === 'ios') return 'instrucoes-ios';

  return 'oculto';
}
