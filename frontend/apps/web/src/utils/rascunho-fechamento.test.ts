import { describe, it, expect, beforeEach } from 'vitest';
import { chaveRascunhoFechamento, limparRascunhoDoMes } from './rascunho-fechamento';

const POSTO = 1;
const CHAVE = chaveRascunhoFechamento(POSTO);

const gravar = (dataSelecionada: string) =>
    localStorage.setItem(CHAVE, JSON.stringify({ dataSelecionada, leituras: {} }));

describe('limparRascunhoDoMes', () => {
    beforeEach(() => localStorage.clear());

    it('descarta rascunho do mês apagado', () => {
        gravar('2026-08-02');

        expect(limparRascunhoDoMes(POSTO, '2026-08')).toBe(true);
        expect(localStorage.getItem(CHAVE)).toBeNull();
    });

    /** Apagar junho não pode jogar fora o que o dono está digitando hoje. */
    it('preserva rascunho de outro mês', () => {
        gravar('2026-08-02');

        expect(limparRascunhoDoMes(POSTO, '2026-06')).toBe(false);
        expect(localStorage.getItem(CHAVE)).not.toBeNull();
    });

    it('não confunde postos diferentes', () => {
        gravar('2026-08-02');

        expect(limparRascunhoDoMes(2, '2026-08')).toBe(false);
        expect(localStorage.getItem(CHAVE)).not.toBeNull();
    });

    it('sem rascunho gravado, não faz nada', () => {
        expect(limparRascunhoDoMes(POSTO, '2026-08')).toBe(false);
    });

    /** JSON corrompido não pode derrubar quem acabou de apagar um mês com sucesso. */
    it('engole rascunho corrompido', () => {
        localStorage.setItem(CHAVE, 'isto não é json');

        expect(limparRascunhoDoMes(POSTO, '2026-08')).toBe(false);
    });

    it('ignora rascunho sem data', () => {
        localStorage.setItem(CHAVE, JSON.stringify({ leituras: {} }));

        expect(limparRascunhoDoMes(POSTO, '2026-08')).toBe(false);
    });
});
