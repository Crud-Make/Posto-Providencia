import { describe, expect, it } from 'vitest';
import { corDaDiferenca, corDeSinal, corDoProduto } from './cores-planilha';

describe('corDoProduto', () => {
    it('devolve as cores da planilha pelo código, sem distinguir maiúsculas', () => {
        expect(corDoProduto('GC').fundo).toBe('#FF0000');
        expect(corDoProduto('ga').fundo).toBe('#00B0F0');
        expect(corDoProduto('ET').fundo).toBe('#00FF99');
        expect(corDoProduto('s10').fundo).toBe('#FFFF00');
    });

    it('cai no cinza neutro para código desconhecido ou ausente', () => {
        expect(corDoProduto('GNV').fundo).toBe('#94A3B8');
        expect(corDoProduto(null).fundo).toBe('#94A3B8');
        expect(corDoProduto(undefined).fundo).toBe('#94A3B8');
    });
});

describe('corDeSinal e corDaDiferenca', () => {
    it('ganho é verde, perda é vermelha, zero é neutro', () => {
        expect(corDeSinal(1).texto).toContain('green');
        expect(corDeSinal(-1).texto).toContain('red');
        expect(corDeSinal(0).texto).toContain('slate');
    });

    it('diferença de caixa segue a convenção do domínio: positivo = FALTA (vermelho), negativo = SOBRA (verde)', () => {
        expect(corDaDiferenca(10).texto).toContain('red');
        expect(corDaDiferenca(-10).texto).toContain('green');
    });
});
