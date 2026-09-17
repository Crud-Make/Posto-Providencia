import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { BicoComDetalhes } from '../../../types/fechamento';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/api', () => ({
  bicoService: {
    getWithDetails: vi.fn(),
  },
  frentistaService: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }),
    }),
  },
}));

import { useCarregamentoDados } from './useCarregamentoDados';
import { bicoService, frentistaService } from '../../../services/api';

/** Harness mínimo para exercitar um hook fora do @testing-library (não instalado neste projeto). */
function renderHook<T>(useHookFn: () => T) {
  const resultRef: { current: T } = { current: undefined as unknown as T };
  function TestComponent() {
    const value = useHookFn();
    React.useEffect(() => {
      resultRef.current = value;
    });
    return null;
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(React.createElement(TestComponent));
  });
  return {
    result: resultRef,
    desmontar: () => act(() => root.unmount()),
  };
}

function bico(id: number, precoVenda: number): BicoComDetalhes {
  return {
    id,
    numero: id,
    bomba: { id: 1, nome: 'Bomba 1' },
    combustivel: { id: 1, nome: 'Gasolina Comum', preco_venda: precoVenda },
  } as unknown as BicoComDetalhes;
}

describe('useCarregamentoDados — preço editado na tela não pode voltar sozinho', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // `precos-editados` é 'permanente' (localStorage): sem limpar, o 6,28 de um
    // teste vaza para o seguinte e a ordem dos `it` passa a decidir o resultado.
    localStorage.clear();
    vi.mocked(frentistaService.getAll).mockResolvedValue({
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    });
    // Cadastro sempre devolve o preço de HOJE (6,98) — é o que toda recarga
    // (realtime, remontagem ou fetch inicial) rebusca do banco.
    vi.mocked(bicoService.getWithDetails).mockResolvedValue({
      success: true,
      data: [bico(1, 6.98)],
      timestamp: new Date().toISOString(),
    });
  });

  it('mantém o preço editado depois de uma recarga disparada pelo realtime (mesma montagem)', async () => {
    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));

    await act(async () => {
      await result.current.carregarDados();
    });
    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.98);

    act(() => {
      result.current.updateBicoPrice(1, 6.28);
    });
    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.28);

    // Simula o gatilho do realtime: qualquer escrita em `Fechamento` chama
    // `carregarDados()` de novo, e o cadastro ainda devolve 6,98.
    await act(async () => {
      await result.current.carregarDados();
    });

    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.28);
  });

  it("herança do dia anterior ('se-vazio') não pisa no preço digitado; a digitação ('sobrescrever') pisa", async () => {
    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });

    // Dia novo, sem nada digitado: a herança preenche.
    act(() => {
      result.current.updateBicoPrice(1, 6.28, 'se-vazio');
    });
    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.28);

    // Gerente digita 6,50. Uma recarga (realtime, reabrir a aba) tenta herdar
    // 6,28 de novo e NÃO pode vencer o que foi digitado.
    act(() => {
      result.current.updateBicoPrice(1, 6.5);
    });
    act(() => {
      result.current.updateBicoPrice(1, 6.28, 'se-vazio');
    });
    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.5);
  });

  it('mantém o preço editado depois de desmontar e montar de novo (navegar para outra tela e voltar)', async () => {
    const primeira = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await primeira.result.current.carregarDados();
    });
    act(() => {
      primeira.result.current.updateBicoPrice(1, 6.28);
    });
    expect(primeira.result.current.bicos[0].combustivel.preco_venda).toBe(6.28);

    // Navegar para /planilha e voltar desmonta o componente da tela — o
    // useRef morreria aqui; o sessionStorage por trás de useEstadoPersistido, não.
    primeira.desmontar();

    const segunda = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await segunda.result.current.carregarDados();
    });

    expect(segunda.result.current.bicos[0].combustivel.preco_venda).toBe(6.28);
  });

  it('não deixa o preço editado de um dia vazar para outro dia', async () => {
    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });
    act(() => {
      result.current.updateBicoPrice(1, 6.28);
    });
    expect(result.current.bicos[0].combustivel.preco_venda).toBe(6.28);

    // Troca de dia sem desmontar (ex.: o usuário troca a data no seletor da
    // própria tela) — o dia novo não tem edição salva, então deve mostrar o
    // preço puro do cadastro, não o 6,28 que era só de 01/01.
    const outroDia = renderHook(() => useCarregamentoDados(1, '2026-02-01'));
    await act(async () => {
      await outroDia.result.current.carregarDados();
    });

    expect(outroDia.result.current.bicos[0].combustivel.preco_venda).toBe(6.98);
  });

  it('mantém todos os bicos quando updateBicoPrice é chamado várias vezes em sequência síncrona (preço por combustível)', async () => {
    vi.mocked(bicoService.getWithDetails).mockResolvedValue({
      success: true,
      data: [bico(1, 6.98), bico(2, 6.98), bico(5, 6.98)],
      timestamp: new Date().toISOString(),
    });

    const { result } = renderHook(() => useCarregamentoDados(1, '2026-01-01'));
    await act(async () => {
      await result.current.carregarDados();
    });

    // Reproduz o botão "preço por combustível": um clique dispara várias
    // chamadas de updateBicoPrice, uma por bico, no mesmo evento.
    act(() => {
      result.current.updateBicoPrice(1, 6.28);
      result.current.updateBicoPrice(2, 6.28);
      result.current.updateBicoPrice(5, 6.28);
    });

    expect(result.current.bicos.map(b => b.combustivel.preco_venda)).toEqual([6.28, 6.28, 6.28]);
  });
});
