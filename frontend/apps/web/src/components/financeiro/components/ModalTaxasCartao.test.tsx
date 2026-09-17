import { describe, it, expect } from 'vitest';
import { provedorDaDescricao, CATEGORIA_TAXAS_CARTAO } from './taxas-cartao';

describe('provedorDaDescricao', () => {
  it('extrai o provedor de uma descrição gravada pelo modal', () => {
    expect(provedorDaDescricao('Taxas de cartão — Sicoob')).toBe('Sicoob');
    expect(provedorDaDescricao('Taxas de cartão —  Sipag ')).toBe('Sipag');
  });

  it('devolve null para a linha histórica da planilha e para descrições soltas', () => {
    expect(provedorDaDescricao('Despeza com das taxas dos Cartao.')).toBeNull();
    expect(provedorDaDescricao('Energia')).toBeNull();
    expect(provedorDaDescricao('Taxas de cartão — ')).toBeNull();
  });

  it('usa a mesma categoria que a carga histórica gravou em Despesa', () => {
    expect(CATEGORIA_TAXAS_CARTAO).toBe('Taxas Cartão');
  });
});
