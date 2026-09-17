import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { BicoComDetalhes } from '../../../types/fechamento';
import { useCalculoGestaoBicos } from './useCalculoGestaoBicos';
import { lucroCombustivel } from '@posto/utils';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  return { result: resultRef };
}

function bico(id: number, nomeCombustivel: string, precoVenda: number): BicoComDetalhes {
  return {
    id,
    numero: id,
    ativo: true,
    bomba: { id: 1, nome: '01' },
    combustivel: { id: 1, nome: nomeCombustivel, preco_venda: precoVenda },
  } as unknown as BicoComDetalhes;
}

const leitura = (inicial: string, fechamento: string) => ({ inicial, fechamento });

describe('useCalculoGestaoBicos — lucro vem de custo real do mês, nunca de margem fixa', () => {
  it('calcula o lucro do bico com lucroCombustivel(@posto/utils), usando o custo médio e a despesa do mês', () => {
    const bicos = [bico(1, 'Gasolina Comum', 6.28)];
    const leituras = { 1: leitura('0,000', '100,000') }; // 100 L
    const custoMedioPorProduto = { 'Gasolina Comum': 5.34516 };
    const despesaOperacionalLitro = 0.473036;

    const { result } = renderHook(() =>
      useCalculoGestaoBicos(bicos, leituras, custoMedioPorProduto, despesaOperacionalLitro)
    );

    const esperado = lucroCombustivel({
      litros: 100,
      precoVenda: 6.28,
      custoMedio: 5.34516,
      despesaOperacionalLitro: 0.473036,
    });

    expect(result.current.listaBicos[0].lucro).toBe(esperado);
    expect(result.current.listaBicos[0].apurado).toBe(true);
    expect(result.current.apurado).toBe(true);
  });

  it('marca apurado:false e lucro 0 quando o produto não tem custo no mês — nunca estima por margem fixa', () => {
    const bicos = [bico(1, 'Diesel S10', 7.38)];
    const leituras = { 1: leitura('0,000', '100,000') };
    const custoMedioPorProduto = { 'Diesel S10': null }; // sem compra lançada no mês

    const { result } = renderHook(() =>
      useCalculoGestaoBicos(bicos, leituras, custoMedioPorProduto, 0.47)
    );

    expect(result.current.listaBicos[0].apurado).toBe(false);
    expect(result.current.listaBicos[0].lucro).toBe(0);
    expect(result.current.apurado).toBe(false);
  });

  it('um bico não apurado não contamina o de outro produto que tem custo', () => {
    const bicos = [
      bico(1, 'Diesel S10', 7.38),
      bico(2, 'Gasolina Comum', 6.28),
    ];
    const leituras = {
      1: leitura('0,000', '100,000'),
      2: leitura('0,000', '100,000'),
    };
    const custoMedioPorProduto = { 'Diesel S10': null, 'Gasolina Comum': 5.34516 };

    const { result } = renderHook(() =>
      useCalculoGestaoBicos(bicos, leituras, custoMedioPorProduto, 0.473036)
    );

    const gasolina = result.current.listaBicos.find(b => b.combustivel === 'Gasolina Comum')!;
    const diesel = result.current.listaBicos.find(b => b.combustivel === 'Diesel S10')!;
    expect(gasolina.apurado).toBe(true);
    expect(gasolina.lucro).toBeGreaterThan(0);
    expect(diesel.apurado).toBe(false);
    expect(result.current.apurado).toBe(false); // o total é parcial por causa do Diesel
  });
});
