import { describe, it, expect } from 'vitest';
import { formatCurrency, dataFechamentoInicial, abaSalvaOuPadrao, ABAS_VALIDAS } from './index';

/**
 * As três funções puras que saíram do App.tsx no P7b (22/09/2026). Os casos são os mesmos que
 * o App.test.tsx já exercita pela tela, aqui direto na função — e mais as bordas que a tela
 * não alcança (string vazia no localStorage, JSON válido de outro formato).
 */
describe('shared/lib — formatCurrency', () => {
    it.each([
        ['', ''],
        [',.', ''],
        ['abc', ''],
        ['0', '0,00'],
        ['000', '0,00'],
        ['1', '0,01'],
        ['12345', '123,45'],
        ['1.234,56', '1.234,56'],
        ['99999999999', '999.999.999,99'],
    ])('%j → %j', (entrada, esperado) => {
        expect(formatCurrency(entrada)).toBe(esperado);
    });
});

describe('shared/lib — dataFechamentoInicial', () => {
    const HOJE = '2026-09-22';

    it('null cai em hoje', () => {
        expect(dataFechamentoInicial(null, HOJE)).toBe(HOJE);
    });

    it('string vazia cai em hoje', () => {
        expect(dataFechamentoInicial('', HOJE)).toBe(HOJE);
    });

    it('data gravada hoje é restaurada', () => {
        expect(dataFechamentoInicial(JSON.stringify({ data: '2026-09-21', gravadoEm: HOJE }), HOJE)).toBe('2026-09-21');
    });

    it('data gravada em outro dia é descartada', () => {
        expect(dataFechamentoInicial(JSON.stringify({ data: '2026-09-21', gravadoEm: '2026-09-21' }), HOJE)).toBe(HOJE);
    });

    it('formato antigo (string pura) é descartado', () => {
        expect(dataFechamentoInicial('2026-01-01', HOJE)).toBe(HOJE);
    });

    it.each([
        ['lixo', '{nao é json'],
        ['número', '42'],
        ['null em JSON', 'null'],
        ['sem gravadoEm', JSON.stringify({ data: '2026-09-21' })],
        ['data fora do formato', JSON.stringify({ data: '21/09/2026', gravadoEm: HOJE })],
        ['data não string', JSON.stringify({ data: 20260921, gravadoEm: HOJE })],
    ])('%s cai em hoje', (_rotulo, salvo) => {
        expect(dataFechamentoInicial(salvo, HOJE)).toBe(HOJE);
    });
});

describe('shared/lib — abaSalvaOuPadrao', () => {
    it.each(ABAS_VALIDAS.map((aba) => [aba]))('%s é mantida', (aba) => {
        expect(abaSalvaOuPadrao(aba)).toBe(aba);
    });

    it.each([
        ['encerrante (aba que saiu do app)', 'encerrante'],
        ['null', null],
        ['vazio', ''],
        ['lixo', 'xyz'],
    ])('%s cai no registro', (_rotulo, valor) => {
        expect(abaSalvaOuPadrao(valor)).toBe('registro');
    });

    it('as abas válidas são exatamente as cinco de hoje', () => {
        expect(ABAS_VALIDAS).toEqual(['registro', 'vendas', 'historico', 'tanques', 'perfil']);
    });
});
