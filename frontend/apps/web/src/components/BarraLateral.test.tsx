import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

/** Com dois postos na rede, a barra lateral diz em qual posto se está (ensaio Jorro+BR, 27/09/2026). */

const estado = { postoAtivo: null as null | { id: number; nome: string } };

vi.mock('../contexts/useAuth', () => ({ useAuth: () => ({ autenticado: true, sair: vi.fn() }) }));
vi.mock('../contexts/usePosto', () => ({ usePosto: () => ({ postoAtivo: estado.postoAtivo }) }));
vi.mock('../contexts/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));

const { default: BarraLateral } = await import('./BarraLateral');

let raiz: Root;
let div: HTMLDivElement;

async function montar(): Promise<void> {
  div = document.createElement('div');
  document.body.appendChild(div);
  raiz = createRoot(div);
  await act(async () =>
    raiz.render(
      <MemoryRouter>
        <BarraLateral />
      </MemoryRouter>,
    ),
  );
}

function postoDaBarra(): string | null {
  return div.querySelector('[data-testid="posto-da-barra"]')?.textContent ?? null;
}

afterEach(() => {
  act(() => raiz.unmount());
  div.remove();
});

describe('BarraLateral', () => {
  it('mostra o nome do posto ativo', async () => {
    estado.postoAtivo = { id: 2, nome: 'Posto BR' };
    await montar();
    expect(postoDaBarra()).toBe('Posto BR');
  });

  it('sem posto ativo, não inventa nome', async () => {
    estado.postoAtivo = null;
    await montar();
    expect(postoDaBarra()).toBeNull();
  });
});
