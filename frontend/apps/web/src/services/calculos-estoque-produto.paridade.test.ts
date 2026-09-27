import { describe, expect, it } from 'vitest';
import { precoMedioPonderadoProduto } from './calculos-estoque-produto';

/*
 * PARIDADE do custo médio da loja — o gêmeo TS de `backend/tests/Unit/Estoque/PrecoMedioDoProdutoTest.php`
 * (MESMA tabela). O caminho do Supabase era: esta função em float → `JSON.stringify` do supabase-js → o
 * Postgres arredonda o texto no `numeric(10,2)` (metade para longe do zero). `noNumeric` reproduz esse
 * último passo sobre o texto, sem float; os valores da coluna "Supabase" foram conferidos no Postgres do
 * compose. A API (`PrecoMedioDoProduto.php`) faz a mesma conta em decimal exato: dá o mesmo número em
 * tudo, menos no EMPATE exato da 3ª casa, onde o float fica um ulp abaixo do meio.
 */

/** O que o Postgres grava num `numeric(10,2)` a partir do texto do número JSON. */
function noNumeric(texto: string): string {
    const casado = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(texto);
    if (casado === null) throw new Error(`número fora do formato: ${texto}`);
    const [, sinal = '', inteira = '0', fracao = '', expoente = '0'] = casado;
    let digitos = `${inteira}${fracao}`;
    let ponto = inteira.length + Number(expoente);
    if (ponto < 0) {
        digitos = `${'0'.repeat(-ponto)}${digitos}`;
        ponto = 0;
    }
    digitos = digitos.padEnd(ponto + 3, '0');
    // Centavos com a 3ª casa decidindo o meio: metade para longe do zero.
    const centavos = BigInt(digitos.slice(0, ponto + 2)) + (Number(digitos[ponto + 2]) >= 5 ? 1n : 0n);
    const reais = centavos / 100n;
    const resto = String(centavos % 100n).padStart(2, '0');
    return `${sinal !== '' && centavos !== 0n ? '-' : ''}${reais}.${resto}`;
}

const supabaseGravava = (e: number, custo: number, q: number, vu?: number): string =>
    noNumeric(JSON.stringify(precoMedioPonderadoProduto(e, custo, q, vu)));

describe('custo médio da loja: o que o Supabase gravava × o que a API grava', () => {
    it.each([
        // estoque, custo, qtd, valor unit., Supabase grava, API grava
        [10, 10, 10, 20, '15.00', '15.00'],
        [3, 10, 1, 11, '10.25', '10.25'],
        [212, 1524.07, 190, 33.97307, '819.80', '819.80'],
        [0, 0, 7, 3.333, '3.33', '3.33'],
        [1, 1, 2, 1.01, '1.01', '1.01'],
        [10, 10, 5, undefined, '10.00', '10.00'],
        [10, 10, 5, 0, '10.00', '10.00'],
        [10, 10, 5, -5, '10.00', '10.00'],
        [-10, 10, 5, 7, '10.00', '10.00'],
        [-3, 10, 5, 1, '-12.50', '-12.50'],
        // EMPATE exato (422,325 e 12263,165): o float fica abaixo do meio; a API arredonda o exato.
        [4, 106.75, 100, 434.948, '422.32', '422.33'],
        [237, 886.48, 79, 46393.22, '12263.16', '12263.17'],
    ] as const)('estoque %d a R$ %d + %d a %s', (e, custo, q, vu, supabase, api) => {
        expect(supabaseGravava(e, custo, q, vu)).toBe(supabase);
        const empate = supabase !== api;
        expect(empate ? ['422.32', '12263.16'] : [api]).toContain(supabase);
    });

    it('o arredondamento do numeric que o teste simula é o do Postgres', () => {
        expect(noNumeric('422.32499999999993')).toBe('422.32');
        expect(noNumeric('422.325')).toBe('422.33');
        expect(noNumeric('-12.505')).toBe('-12.51');
        expect(noNumeric('15')).toBe('15.00');
        expect(noNumeric('1e-7')).toBe('0.00');
        expect(noNumeric('1.5e+3')).toBe('1500.00');
    });
});
