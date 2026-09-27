import { describe, it, expect, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TelaEscolherPosto } from './tela-escolher-posto';

/**
 * A tela "Escolha o posto" com a marca nova (27/09/2026): cartão com a foto `/postos/<id>.jpg`,
 * que cai nas iniciais quando a foto não carrega; tocar no cartão escolhe o posto; tema claro/escuro.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const JORRO = { id: 1, nome: 'Posto Jorro' };
const BR = { id: 2, nome: 'Posto BR' };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const montar = (aoEscolher: (posto: { id: number; nome: string }) => void = () => undefined) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(React.createElement(TelaEscolherPosto, { postos: [JORRO, BR], aoEscolher, agora: new Date(2026, 8, 27, 9) }));
  });
  return container;
};

const cartao = (nome: string): HTMLButtonElement | null =>
  container?.querySelector<HTMLButtonElement>(`button[aria-label="${nome}"]`) ?? null;

afterEach(() => {
  if (root !== null) act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('TelaEscolherPosto (marca nova, 27/09/2026)', () => {
  it('cada cartão mostra a foto do posto pelo id, com o nome no alt', () => {
    montar();

    const foto = cartao('Posto Jorro')?.querySelector('img');
    expect(foto?.getAttribute('src')).toBe('/postos/1.jpg');
    expect(foto?.getAttribute('alt')).toBe('Posto Jorro');
    expect(cartao('Posto BR')?.querySelector('img')?.getAttribute('src')).toBe('/postos/2.jpg');
  });

  it('foto que não carrega vira as iniciais do posto', () => {
    montar();
    const foto = cartao('Posto BR')?.querySelector('img');

    act(() => { foto?.dispatchEvent(new Event('error')); });

    expect(cartao('Posto BR')?.querySelector('img')).toBeNull();
    expect(cartao('Posto BR')?.querySelector('[data-testid="iniciais-do-posto"]')?.textContent).toBe('BR');
    expect(cartao('Posto Jorro')?.querySelector('img')).not.toBeNull();
  });

  it('tocar no cartão escolhe aquele posto', () => {
    const aoEscolher = vi.fn();
    montar(aoEscolher);

    act(() => { cartao('Posto BR')?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(aoEscolher).toHaveBeenCalledWith(BR);
  });

  it('mostra a logo da rede, a frase do dia e o rodapé, sem os textos que o dono tirou', () => {
    const tela = montar();

    expect(tela.querySelector('img[src="/logo-providencia.png"]')).not.toBeNull();
    expect(tela.textContent).toContain('Atendimento bom faz o cliente voltar, e voltar de novo.');
    expect(tela.textContent).toContain('Escolha o posto para começar');
    expect(tela.textContent).toContain('© 2026 Rede Providência. Todos os direitos reservados.');
    expect(tela.textContent).not.toContain('Em qual posto');
  });

  it('o botão sol/lua alterna o tema (sem matchMedia, começa no claro)', () => {
    const tela = montar();
    const raiz = tela.firstElementChild as HTMLElement;
    expect(raiz.dataset['tema']).toBe('light');
    expect(raiz.style.getPropertyValue('--fundo')).toBe('#FBF8F2');

    act(() => { tela.querySelector('button[aria-label="Usar modo escuro"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(raiz.dataset['tema']).toBe('dark');
    expect(raiz.style.getPropertyValue('--fundo')).toBe('#0A0F1C');
    expect(tela.querySelector('button[aria-label="Usar modo claro"]')).not.toBeNull();
  });
});
