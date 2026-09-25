import { describe, expect, it } from 'vitest';
import { diaDeclarado } from '../../../services/api/fechamento.api';
import type { BicoComDetalhes, EntradaPagamento, SessaoFrentista } from '../../../types/fechamento';
import { montarDiaDeclarado, type DiaNaTela } from './montarDiaDeclarado';

/*
|--------------------------------------------------------------------------
| montarDiaDeclarado — as invariantes I2, I3, I4, I8, I12 e a leitura-base ganham teste
|--------------------------------------------------------------------------
| Asserções sobre STRING, exatas: `toBe('200.00')`, nunca `toBeCloseTo`. É o que vai para a
| coluna de dinheiro, e o servidor confere exato em centavos.
*/

/** Só os campos que o montador lê; o resto do `Bico`/`Bomba`/`Combustivel` não entra no contrato. */
function bico(id: number, combustivelId: number, precoVenda: number): BicoComDetalhes {
    return { id, combustivel: { id: combustivelId, preco_venda: precoVenda } } as unknown as BicoComDetalhes;
}

function sessao(overrides: Partial<SessaoFrentista> = {}): SessaoFrentista {
    return {
        tempId: 't1',
        frentistaId: 1,
        valor_cartao: '0',
        valor_cartao_debito: '0',
        valor_cartao_credito: '0',
        valor_nota: '0',
        valor_pix: '0',
        valor_dinheiro: '0',
        valor_baratao: '0',
        valor_moedas: '0',
        valor_encerrante: '0',
        valor_conferido: '0',
        observacoes: '',
        ...overrides,
    };
}

function pagamento(id: number, valor: string): EntradaPagamento {
    return { id, nome: 'PIX', tipo: 'pix', valor, taxa: 0 };
}

function dia(overrides: Partial<DiaNaTela> = {}): DiaNaTela {
    return {
        bicos: [bico(3, 2, 6)],
        leituras: { 3: { inicial: '1.000,000', fechamento: '1.100,000' } },
        sessoesFrentistas: [sessao({ valor_dinheiro: '600,00' })],
        payments: [pagamento(4, '600,00')],
        totalVendas: 600,
        totalFrentistas: 600,
        podeFechar: true,
        observacoes: 'dia de teste',
        ...overrides,
    };
}

describe('leituras (I12 e a leitura-base)', () => {
    it('bico com fechamento preenchido entra com litros e valor pelos canônicos, em string decimal', () => {
        const [leitura] = montarDiaDeclarado(dia()).leituras;

        expect(leitura).toEqual({
            bico_id: 3,
            combustivel_id: 2,
            leitura_inicial: '1000.000',
            leitura_final: '1100.000',
            litros_vendidos: '100.000',
            preco_litro: '6.00',
            valor_total: '600.00',
        });
    });

    it('a leitura-base (fechamento vazio) e o bico sem leitura na tela ficam FORA — não são declarados', () => {
        const montado = montarDiaDeclarado(
            dia({
                bicos: [bico(3, 2, 6), bico(4, 2, 6), bico(5, 7, 5.5)],
                leituras: { 3: { inicial: '1.000,000', fechamento: '1.100,000' }, 4: { inicial: '500,000', fechamento: '' } },
            }),
        );

        expect(montado.leituras.map((l) => l.bico_id)).toEqual([3]);
    });

    it('fechamento igual à inicial dá zero litros e zero reais, sem número negativo', () => {
        const [leitura] = montarDiaDeclarado(dia({ leituras: { 3: { inicial: '1.000,000', fechamento: '1.000,000' } } })).leituras;

        expect(leitura?.litros_vendidos).toBe('0.000');
        expect(leitura?.valor_total).toBe('0.00');
    });
});

describe('sessões (I2, I3, I4 e o lump de cartão)', () => {
    it('I2: sessão só com moedas 200,00 → valor_moedas 200.00 e valor_conferido 200.00', () => {
        // Migrada de useSubmissaoFechamento.test.ts:154-155: as moedas não podem se perder.
        const [s] = montarDiaDeclarado(dia({ sessoesFrentistas: [sessao({ valor_moedas: '200,00' })] })).sessoes;

        expect(s?.valor_moedas).toBe('200.00');
        expect(s?.valor_conferido).toBe('200.00');
    });

    it('I3: sessão sem movimento e sessão sem frentista não viram linha', () => {
        const montado = montarDiaDeclarado(
            dia({
                sessoesFrentistas: [
                    sessao({ tempId: 'a', frentistaId: 1, valor_dinheiro: '100,00' }),
                    sessao({ tempId: 'b', frentistaId: 2 }), // semeada, intocada
                    sessao({ tempId: 'c', frentistaId: null, valor_dinheiro: '50,00' }), // sem dono
                ],
            }),
        );

        expect(montado.sessoes.map((s) => s.frentista_id)).toEqual([1]);
    });

    it('I4: sem encerrante a diferença é 0.00, não −conferido; com encerrante é FALTA positiva', () => {
        const semEncerrante = montarDiaDeclarado(dia({ sessoesFrentistas: [sessao({ valor_dinheiro: '200,00', valor_encerrante: '0' })] }));
        const comEncerrante = montarDiaDeclarado(dia({ sessoesFrentistas: [sessao({ valor_dinheiro: '200,00', valor_encerrante: '300,00' })] }));

        expect(semEncerrante.sessoes[0]?.diferenca_calculada).toBe('0.00');
        expect(semEncerrante.sessoes[0]?.encerrante).toBe('0.00');
        expect(comEncerrante.sessoes[0]?.diferenca_calculada).toBe('100.00');
        expect(comEncerrante.sessoes[0]?.encerrante).toBe('300.00');
    });

    it('valor_cartao é o lump legado como veio; débito e crédito ficam separados; o conferido soma os três (cartão aditivo)', () => {
        const [s] = montarDiaDeclarado(
            dia({ sessoesFrentistas: [sessao({ valor_cartao: '50,00', valor_cartao_debito: '10,00', valor_cartao_credito: '20,00' })] }),
        ).sessoes;

        expect(s?.valor_cartao).toBe('50.00');
        expect(s?.valor_cartao_debito).toBe('10.00');
        expect(s?.valor_cartao_credito).toBe('20.00');
        expect(s?.valor_conferido).toBe('80.00');
    });

    it('os 7 baldes saem em string com duas casas, e as observações passam intactas', () => {
        const [s] = montarDiaDeclarado(
            dia({
                sessoesFrentistas: [
                    sessao({
                        valor_dinheiro: '1.234,56', valor_moedas: '0,50', valor_pix: '100,00', valor_nota: '10,00',
                        valor_baratao: '5,00', observacoes: '[CONFERIDO]',
                    }),
                ],
            }),
        ).sessoes;

        expect(s).toMatchObject({
            valor_dinheiro: '1234.56', valor_moedas: '0.50', valor_pix: '100.00', valor_nota: '10.00', baratao: '5.00',
            valor_conferido: '1350.06', observacoes: '[CONFERIDO]',
        });
    });
});

describe('frentistas_conhecidos (§7 (c))', () => {
    it('só quem veio do BANCO (tempId existing-) conta, com ou sem movimento; semeada não', () => {
        const montado = montarDiaDeclarado(
            dia({
                sessoesFrentistas: [
                    sessao({ tempId: 'existing-11', frentistaId: 9, valor_dinheiro: '100,00' }),
                    sessao({ tempId: 'existing-12', frentistaId: 10 }), // veio do banco e foi zerada na tela: conhecida, não enviada → o servidor apaga
                    sessao({ tempId: 't3', frentistaId: 8, valor_dinheiro: '30,00' }), // semeada com lançamento: enviada, não "conhecida"
                    sessao({ tempId: 'existing-13', frentistaId: null }),
                ],
            }),
        );

        expect(montado.frentistas_conhecidos).toEqual([9, 10]);
        expect(montado.sessoes.map((s) => s.frentista_id)).toEqual([9, 8]);
    });
});

describe('recebimentos', () => {
    it('só valor > 0 entra, em string decimal', () => {
        const montado = montarDiaDeclarado(dia({ payments: [pagamento(4, '1.234,56'), pagamento(5, '0,00'), pagamento(6, '')] }));

        expect(montado.recebimentos).toEqual([{ forma_pagamento_id: 4, valor: '1234.56' }]);
    });
});

describe('totais (I1 e I8)', () => {
    it('dia apurado: total_vendas e total_recebido quantizados, diferenca canônica exata sobre os dois', () => {
        const montado = montarDiaDeclarado(dia({ totalVendas: 8697.390000000001, totalFrentistas: 1000.1 }));

        expect(montado.totais).toEqual({ total_vendas: '8697.39', total_recebido: '1000.10', diferenca: '7697.29' });
    });

    it('diferenca é FALTA positiva e SOBRA negativa, sempre igual a total_vendas − total_recebido em centavos', () => {
        const falta = montarDiaDeclarado(dia({ totalVendas: 1000, totalFrentistas: 990.01 }));
        const sobra = montarDiaDeclarado(dia({ totalVendas: 1000, totalFrentistas: 1000.02 }));
        const exato = montarDiaDeclarado(dia({ totalVendas: 1000, totalFrentistas: 1000 }));

        expect(falta.totais.diferenca).toBe('9.99');
        expect(sobra.totais.diferenca).toBe('-0.02');
        expect(exato.totais.diferenca).toBe('0.00');

        // A conta em centavos inteiros, sobre as STRINGS que vão sair — sem toBeCloseTo.
        for (const { totais } of [falta, sobra, exato]) {
            const centavos = (s: string | null): number => Math.round(Number(s) * 100);
            expect(centavos(totais.diferenca)).toBe(centavos(totais.total_vendas) - centavos(totais.total_recebido));
        }
    });

    it('I8: com podeFechar false o par vai null e total_recebido continua', () => {
        const montado = montarDiaDeclarado(dia({ podeFechar: false, totalVendas: 600, totalFrentistas: 600 }));

        expect(montado.totais).toEqual({ total_vendas: null, total_recebido: '600.00', diferenca: null });
    });

    it('I8: a FONTE diz não apurado (totalVendas null) → o par vai null, mesmo com podeFechar true e leitura declarada', () => {
        // Desde 22/09/2026 (#103 P8) `totalVendas` vem de `vendaDoDiaPeloEncerrante`, que devolve
        // `null` quando há menos bicos lidos que ativos. Aqui há um bico lido (3) e outro sem
        // leitura (4): a leitura declarada existe, `podeFechar` é true, e mesmo assim não há
        // apuração — a guarda por `leiturasDeclaradasNoDia === 0` sozinha deixaria passar `0`.
        const montado = montarDiaDeclarado(dia({ bicos: [bico(3, 2, 6), bico(4, 2, 6)], totalVendas: null }));

        expect(montado.leituras.map((l) => l.bico_id)).toEqual([3]);
        expect(montado.totais).toEqual({ total_vendas: null, total_recebido: '600.00', diferenca: null });
    });

    it('I8: só leitura-base (nenhuma leitura declarada) é dia não apurado — o par vai null mesmo com podeFechar true', () => {
        // O painel hoje grava 0 aqui (defeito 3 da memória salvar-o-dia-apaga-leitura-base); o
        // api-core grava null (encerrante.ts:632,646). null é "ninguém apurou"; 0 é "apurou e deu zero".
        const montado = montarDiaDeclarado(dia({ leituras: { 3: { inicial: '1.000,000', fechamento: '' } }, totalVendas: 0 }));

        expect(montado.leituras).toEqual([]);
        expect(montado.totais).toEqual({ total_vendas: null, total_recebido: '600.00', diferenca: null });
    });
});

describe('o contrato', () => {
    it('o que sai passa no schema diaDeclarado, o espelho das rules do FormRequest', () => {
        const apurado = montarDiaDeclarado(dia());
        const naoApurado = montarDiaDeclarado(dia({ podeFechar: false }));

        expect(diaDeclarado.safeParse(apurado).success).toBe(true);
        expect(diaDeclarado.safeParse(naoApurado).success).toBe(true);
        expect(apurado.observacoes).toBe('dia de teste');
    });

    it('é puro: a mesma entrada dá a mesma saída e não mexe na entrada', () => {
        const entrada = dia();
        const antes = JSON.stringify(entrada);

        expect(montarDiaDeclarado(entrada)).toEqual(montarDiaDeclarado(entrada));
        expect(JSON.stringify(entrada)).toBe(antes);
    });
});
