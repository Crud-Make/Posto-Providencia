/**
 * Tons do calendário — todo o estilo do componente mora aqui, e só aqui.
 *
 * @remarks
 * São dois porque o sistema tem dois contextos visuais de verdade, e não por gosto:
 * - `auto` segue o tema do usuário (`ThemeContext`), com as variantes `dark:`.
 * - `escuro` é para as telas pintadas de slate na unha (fechamento diário, fechamento mensal,
 *   financeiro), que ficam escuras mesmo com o tema claro ligado. Nelas o `dark:` não dispara,
 *   e um calendário `auto` apareceria branco dentro de um header escuro.
 *
 * Mudar a cor de seleção do sistema inteiro é editar uma linha deste arquivo.
 */

/** Classes de cada parte do calendário. O azul da seleção é comum aos dois tons. */
export interface TomCalendario {
  readonly gatilho: string;
  readonly prefixo: string;
  readonly valor: string;
  readonly icone: string;
  readonly painel: string;
  readonly titulo: string;
  readonly seta: string;
  readonly diaSemana: string;
  readonly celulaLivre: string;
  readonly celulaBloqueada: string;
  readonly rodape: string;
  readonly dica: string;
}

export const TONS = {
  auto: {
    gatilho:
      'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
    prefixo: 'text-gray-500 dark:text-gray-400',
    valor: 'text-gray-900 dark:text-white',
    icone: 'text-gray-400',
    painel: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    titulo: 'text-gray-900 dark:text-white',
    seta: 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
    diaSemana: 'text-gray-400 dark:text-gray-500',
    celulaLivre: 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700',
    celulaBloqueada: 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
    rodape: 'border-gray-100 dark:border-gray-700',
    dica: 'text-gray-400 dark:text-gray-500',
  },
  escuro: {
    gatilho: 'bg-slate-800 border-slate-600/50 hover:border-slate-500',
    prefixo: 'text-slate-400',
    valor: 'text-slate-100',
    icone: 'text-blue-400',
    painel: 'bg-slate-900 border-slate-700',
    titulo: 'text-slate-100',
    seta: 'text-slate-400 hover:bg-slate-800',
    diaSemana: 'text-slate-500',
    celulaLivre: 'text-slate-300 hover:bg-slate-800',
    celulaBloqueada: 'text-slate-700 cursor-not-allowed',
    rodape: 'border-slate-700',
    dica: 'text-slate-500',
  },
} as const satisfies Record<string, TomCalendario>;

export type NomeTom = keyof typeof TONS;

/** Seleção aplicada — igual nos dois tons, para a cor de "escolhido" ser uma só no sistema. */
export const CELULA_EXTREMO = 'bg-blue-600 text-white font-semibold';

/** Miolo do intervalo. */
export const CELULA_DENTRO = 'bg-blue-500/15 text-blue-500 dark:text-blue-300';

/** Anel discreto no dia/mês de hoje, quando ele não está selecionado. */
export const CELULA_HOJE = 'ring-1 ring-inset ring-blue-400';
