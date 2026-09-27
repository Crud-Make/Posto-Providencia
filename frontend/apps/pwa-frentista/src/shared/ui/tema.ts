import { useCallback, useState, type CSSProperties } from 'react';

/**
 * Tema claro/escuro da marca nova da rede Providência (27/09/2026), o mesmo do painel: as cores
 * saem da logo (vermelho #A30E19, azul #042992, dourado #E5BE41) e cada tema vira variáveis CSS
 * na raiz da tela. Quem usa escreve `var(--fundo)`, `var(--acento)`…, nunca a cor crua.
 */
const TEMAS = {
  light: {
    '--fundo': '#FBF8F2', '--painel': '#FFFFFF', '--linha': '#EAE4D8', '--texto': '#14204A',
    '--texto-medio': '#4A5578', '--texto-suave': '#5B6584', '--cartao': '#FFFFFF', '--borda-cartao': '#E6DFD2',
    '--acento': '#A30E19', '--azul': '#042992', '--azul-fundo': '#E8EDFA', '--botao': '#FFFFFF', '--borda-botao': '#DDD6C8',
  },
  dark: {
    '--fundo': '#0A0F1C', '--painel': '#0F172A', '--linha': '#1C2640', '--texto': '#F1F4FA',
    '--texto-medio': '#B7C0D4', '--texto-suave': '#9AA6BF', '--cartao': '#111A2E', '--borda-cartao': '#243150',
    '--acento': '#F2707A', '--azul': '#A9C0F5', '--azul-fundo': '#17233F', '--botao': 'transparent', '--borda-botao': '#2A3654',
  },
} as const;

export type Tema = keyof typeof TEMAS;

/** As três cores da logo, na ordem da faixa do topo. */
export const CORES_DA_MARCA = ['#042992', '#A30E19', '#E5BE41'] as const;

export function variaveisDoTema(tema: Tema): CSSProperties {
  return TEMAS[tema] as unknown as CSSProperties;
}

/** O tema do aparelho (`prefers-color-scheme`); sem `matchMedia` (teste, navegador velho), claro. */
function temaDoAparelho(): Tema {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Começa no tema do aparelho; o botão sol/lua alterna. A escolha não é guardada. */
export function useTema(): { readonly tema: Tema; readonly alternar: () => void } {
  const [tema, setTema] = useState<Tema>(temaDoAparelho);
  const alternar = useCallback(() => {
    setTema((atual) => (atual === 'dark' ? 'light' : 'dark'));
  }, []);
  return { tema, alternar };
}
