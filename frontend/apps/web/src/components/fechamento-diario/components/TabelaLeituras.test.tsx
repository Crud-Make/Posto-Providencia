import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { BicoComDetalhes } from '../../../types/fechamento';
import { TabelaLeituras } from './TabelaLeituras';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function bico(id: number, combustivelId: number, nomeCombustivel: string): BicoComDetalhes {
  return {
    id,
    numero: id,
    bomba: { id: 1, nome: 'Bomba 1' },
    combustivel: { id: combustivelId, nome: nomeCombustivel, preco_venda: 6.98 },
  } as unknown as BicoComDetalhes;
}

const digitar = (input: HTMLInputElement, texto: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

/** O campo não tem `id`; localiza pelo texto do `<label>` irmão. */
const campoPrecoDoCombustivel = (nome: string): HTMLInputElement => {
  const labels = Array.from(container.querySelectorAll('label'));
  const label = labels.find(l => l.textContent === nome);
  if (!label) throw new Error(`Campo de preço para "${nome}" não encontrado`);
  const input = label.parentElement?.querySelector('input');
  if (!input) throw new Error(`Input de preço para "${nome}" não encontrado`);
  return input;
};

const semLeituras = () => ({});
const semLitros = () => ({ value: 0, display: '-' });

describe('TabelaLeituras — preço em massa por combustível', () => {
  it('aplica o preço digitado em todos os bicos do mesmo combustível, sem afetar os outros', () => {
    const onUpdatePrice = vi.fn();
    const bicos = [
      bico(1, 10, 'Gasolina Comum'),
      bico(2, 10, 'Gasolina Comum'),
      bico(3, 20, 'Etanol'),
    ];

    act(() => {
      root.render(
        React.createElement(TabelaLeituras, {
          bicos,
          leituras: semLeituras(),
          onLeituraInicialChange: vi.fn(),
          onLeituraFechamentoChange: vi.fn(),
          onLeituraInicialBlur: vi.fn(),
          onLeituraFechamentoBlur: vi.fn(),
          calcLitros: semLitros,
          onUpdatePrice,
        })
      );
    });

    const campoGasolina = campoPrecoDoCombustivel('Gasolina Comum');
    act(() => campoGasolina.focus());
    digitar(campoGasolina, '6,28');
    act(() => campoGasolina.blur());

    expect(onUpdatePrice).toHaveBeenCalledTimes(2);
    expect(onUpdatePrice).toHaveBeenCalledWith(1, 6.28);
    expect(onUpdatePrice).toHaveBeenCalledWith(2, 6.28);
    expect(onUpdatePrice).not.toHaveBeenCalledWith(3, expect.anything());
  });

  it('não some com o campo quando não há onUpdatePrice (tela sem permissão de editar preço)', () => {
    const bicos = [bico(1, 10, 'Gasolina Comum')];

    act(() => {
      root.render(
        React.createElement(TabelaLeituras, {
          bicos,
          leituras: semLeituras(),
          onLeituraInicialChange: vi.fn(),
          onLeituraFechamentoChange: vi.fn(),
          onLeituraInicialBlur: vi.fn(),
          onLeituraFechamentoBlur: vi.fn(),
          calcLitros: semLitros,
        })
      );
    });

    expect(() => campoPrecoDoCombustivel('Gasolina Comum')).toThrow();
  });
});

describe('TabelaLeituras — linhas agrupadas por bomba (#155)', () => {
  it('um título por bomba, na ordem da pista, com os bicos dela logo abaixo e os campos na mesma ordem', () => {
    const naBomba = (id: number, numero: number, bombaId: number, bombaNome: string): BicoComDetalhes =>
      ({ ...bico(id, 10, 'Gasolina Comum'), numero, bomba: { id: bombaId, nome: bombaNome } }) as unknown as BicoComDetalhes;
    const bicos = [naBomba(1, 3, 2, 'BOMBA 02'), naBomba(2, 1, 1, 'BOMBA 01'), naBomba(3, 2, 1, 'BOMBA 01')];
    const onInicial = vi.fn();

    act(() => {
      root.render(
        <TabelaLeituras
          bicos={bicos}
          leituras={semLeituras()}
          onLeituraInicialChange={onInicial}
          onLeituraFechamentoChange={vi.fn()}
          onLeituraInicialBlur={vi.fn()}
          onLeituraFechamentoBlur={vi.fn()}
          calcLitros={semLitros}
        />,
      );
    });

    const linhas = Array.from(container.querySelectorAll('tbody tr')).map((tr) =>
      tr.querySelector('th[scope="rowgroup"]')?.textContent ?? `bico ${tr.querySelector('td div div')?.textContent}`,
    );
    expect(linhas).toEqual(['BOMBA 012 bicos', 'bico 1', 'bico 2', 'BOMBA 021 bico', 'bico 3']);

    // O primeiro campo de leitura inicial é o do bico 1 (id 2): digitar nele não cai em outro bico.
    const primeiroInicial = container.querySelector<HTMLInputElement>('tbody input')!;
    digitar(primeiroInicial, '100');
    expect(onInicial).toHaveBeenCalledWith(2, '100');
  });
});
