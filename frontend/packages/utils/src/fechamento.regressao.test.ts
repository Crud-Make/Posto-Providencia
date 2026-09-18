/**
 * Regressão sintética do módulo canônico de fechamento de caixa.
 *
 * @remarks
 * Esta suíte **não** prova correção contra a planilha do posto — isso continua
 * sendo trabalho dos golden masters (`fechamento.golden.spec.ts`,
 * `totais-do-dia.golden.spec.ts`), que dependem de `docs/data/` e por isso nunca
 * rodam no CI. O que esta suíte prova é que a **fórmula não mudou**: entradas
 * inventadas (números redondos, nada do posto real), saídas congeladas em
 * literais escritos à mão a partir da execução observada do código atual.
 *
 * Regra de leitura: se um teste daqui quebrar, alguém mexeu na aritmética de
 * dinheiro. Ou a mudança é intencional (e o golden local precisa confirmá-la
 * antes de o literal ser atualizado), ou é o bug que esta suíte existe para pegar.
 *
 * Nenhum acesso a `docs/data/`, nenhum fs, nenhum import de dado real.
 */
import { describe, it, expect } from 'vitest';
import {
    cartao,
    conferido,
    conferidoImplicito,
    diferenca,
    isFalta,
    isSobra,
    semLancamento,
    totaisDoDia,
    breakdown,
    meiosFromFechamentoRow,
    meiosFromPwaPayments,
    type MeiosPagamento,
    type PwaPayments,
} from './fechamento';

/** Sessão sintética: tudo zero, sobrescreva só o bucket que o caso exercita. */
const meios = (parcial: Partial<MeiosPagamento> = {}): MeiosPagamento => ({
    dinheiro: 0,
    moedas: 0,
    pix: 0,
    cartaoDebito: 0,
    cartaoCredito: 0,
    cartaoLegado: 0,
    nota: 0,
    baratao: 0,
    ...parcial,
});

/** Pagamentos do PWA: strings vazias, sobrescreva só o campo do caso. */
const pagamentos = (parcial: Partial<PwaPayments> = {}): PwaPayments => ({
    dinheiro: '',
    moedas: '',
    pix: '',
    debito: '',
    credito: '',
    notaPrazo: '',
    baratao: '',
    ...parcial,
});

describe('regressão: cartao — aditivo (lump web + split PWA)', () => {
    it('soma legado + débito + crédito', () => {
        expect(cartao(meios({ cartaoLegado: 100, cartaoDebito: 30, cartaoCredito: 20 }))).toBe(150);
    });

    it('origem PWA: só o split conta (legado 0)', () => {
        expect(cartao(meios({ cartaoDebito: 300, cartaoCredito: 200 }))).toBe(500);
    });

    it('origem web: só o lump conta (split 0)', () => {
        expect(cartao(meios({ cartaoLegado: 500 }))).toBe(500);
    });

    it('sessão sem cartão nenhum → 0', () => {
        expect(cartao(meios())).toBe(0);
    });

    it('estorno lançado como cartão negativo é preservado (não vira 0)', () => {
        expect(cartao(meios({ cartaoLegado: -50 }))).toBe(-50);
    });

    it('quantiza em centavos: 0,105 + 0,105 = 0,21 (não 0,20999…)', () => {
        expect(cartao(meios({ cartaoLegado: 0.105, cartaoDebito: 0.105 }))).toBe(0.21);
    });
});

describe('regressão: conferido — os 7 buckets', () => {
    it('sessão cheia soma dinheiro + moedas + pix + cartão + nota + baratão', () => {
        const m = meios({
            dinheiro: 1000,
            moedas: 5.5,
            pix: 250,
            cartaoDebito: 300,
            cartaoCredito: 200,
            nota: 100,
            baratao: 50,
        });
        expect(conferido(m)).toBe(1905.5);
    });

    it('sessão zerada → 0', () => {
        expect(conferido(meios())).toBe(0);
    });

    it('soma de frações some o drift de float: 0,1+0,2+0,3+0,3+0,05+0,05 = 1', () => {
        const m = meios({
            dinheiro: 0.1,
            moedas: 0.2,
            pix: 0.3,
            cartaoDebito: 0.1,
            cartaoCredito: 0.2,
            nota: 0.05,
            baratao: 0.05,
        });
        expect(conferido(m)).toBe(1);
    });

    it('quantiza dízima: 1/3 → 0,33', () => {
        expect(conferido(meios({ dinheiro: 1 / 3 }))).toBe(0.33);
    });

    it('meio centavo sobe (0,005 → 0,01) e 0,004 desce (→ 0)', () => {
        expect(conferido(meios({ dinheiro: 0.005 }))).toBe(0.01);
        expect(conferido(meios({ dinheiro: 0.004 }))).toBe(0);
    });
});

describe('regressão: diferenca = encerrante − conferido', () => {
    it('FALTA: encerrante maior que o conferido → positivo', () => {
        expect(diferenca(6000, 5900)).toBe(100);
    });

    it('SOBRA: conferido maior que o encerrante → negativo', () => {
        expect(diferenca(6000, 6100)).toBe(-100);
    });

    it('caixa batido → 0', () => {
        expect(diferenca(6000, 6000)).toBe(0);
    });

    it('nada lançado → a diferença é o encerrante inteiro', () => {
        expect(diferenca(1000, 0)).toBe(1000);
    });

    it('quantiza a subtração em centavos', () => {
        expect(diferenca(1234.567, 34.561)).toBe(1200.01);
        expect(diferenca(6000.004, 0)).toBe(6000);
    });

    it('sobra menor que meio centavo colapsa em zero negativo (-0), não em -0,01', () => {
        // Congelado como está: Math.round(-0.5) devolve -0 em JS.
        expect(Object.is(diferenca(0, 0.005), -0)).toBe(true);
    });
});

describe('regressão: isFalta / isSobra', () => {
    it('isFalta só para diferença estritamente positiva', () => {
        expect(isFalta(0.01)).toBe(true);
        expect(isFalta(100)).toBe(true);
        expect(isFalta(0)).toBe(false);
        expect(isFalta(-0.01)).toBe(false);
    });

    it('isSobra só para diferença estritamente negativa', () => {
        expect(isSobra(-0.01)).toBe(true);
        expect(isSobra(-100)).toBe(true);
        expect(isSobra(0)).toBe(false);
        expect(isSobra(0.01)).toBe(false);
    });

    it('caixa batido não é falta nem sobra', () => {
        expect(isFalta(0)).toBe(false);
        expect(isSobra(0)).toBe(false);
    });
});

describe('regressão: totaisDoDia — o dia é a conta das suas partes', () => {
    it('duas sessões: soma conferido de cada uma e acusa falta', () => {
        const t = totaisDoDia(12000, [
            meios({ dinheiro: 3000, pix: 1000 }),
            meios({ dinheiro: 2000, cartaoLegado: 1000, nota: 500 }),
        ]);
        expect(t).toEqual({ totalVendas: 12000, totalRecebido: 7500, diferenca: 4500 });
    });

    it('três sessões, uma delas vazia (frentista que não lançou nada)', () => {
        const t = totaisDoDia(10000, [
            meios({ dinheiro: 2000, pix: 1000, cartaoDebito: 500, cartaoCredito: 500 }),
            meios({ dinheiro: 1500, moedas: 10, cartaoLegado: 1000, nota: 200, baratao: 100 }),
            meios(),
        ]);
        expect(t).toEqual({ totalVendas: 10000, totalRecebido: 6810, diferenca: 3190 });
    });

    it('LISTA VAZIA: nenhuma sessão → recebido 0 e diferença = venda inteira', () => {
        expect(totaisDoDia(6000, [])).toEqual({
            totalVendas: 6000,
            totalRecebido: 0,
            diferenca: 6000,
        });
    });

    it('dia sem venda e sem sessão → tudo zero', () => {
        expect(totaisDoDia(0, [])).toEqual({
            totalVendas: 0,
            totalRecebido: 0,
            diferenca: 0,
        });
    });

    it('SOBRA: entregaram mais do que o concentrador apurou → diferença negativa', () => {
        expect(totaisDoDia(1000, [meios({ dinheiro: 1200 })])).toEqual({
            totalVendas: 1000,
            totalRecebido: 1200,
            diferenca: -200,
        });
    });

    it('quantiza sessão a sessão: 0,1 + 0,2 + 0,005 = 0,31 (o meio centavo sobe antes de somar)', () => {
        expect(totaisDoDia(0, [
            meios({ dinheiro: 0.1 }),
            meios({ dinheiro: 0.2 }),
            meios({ dinheiro: 0.005 }),
        ])).toEqual({ totalVendas: 0, totalRecebido: 0.31, diferenca: -0.31 });
    });
});

describe('regressão: conferidoImplicito — inversa exata de diferenca', () => {
    it('falta gravada: encerrante − diferença devolve o conferido', () => {
        expect(conferidoImplicito(6000, 100)).toBe(5900);
    });

    it('sobra gravada (diferença negativa) devolve conferido maior que o encerrante', () => {
        expect(conferidoImplicito(6000, -100)).toBe(6100);
    });

    it('diferença igual ao encerrante → conferido 0 (nada foi lançado)', () => {
        expect(conferidoImplicito(6000, 6000)).toBe(0);
    });

    it('linha zerada → 0', () => {
        expect(conferidoImplicito(0, 0)).toBe(0);
    });

    it('quantiza em centavos (0,004 desce, 0,005 sobe)', () => {
        expect(conferidoImplicito(1000.005, 0.001)).toBe(1000);
        expect(conferidoImplicito(1000.006, 0.001)).toBe(1000.01);
    });
});

describe('regressão: semLancamento — venda sem nenhum meio declarado', () => {
    it('houve venda e o conferido implícito é zero → true', () => {
        expect(semLancamento(6000, 6000)).toBe(true);
    });

    it('tolerância padrão de R$ 0,05 é inclusiva', () => {
        expect(semLancamento(6000, 5999.96)).toBe(true); // conferido 0,04
        expect(semLancamento(6000, 5999.95)).toBe(true); // conferido 0,05 — limite
        expect(semLancamento(6000, 5999.94)).toBe(false); // conferido 0,06
    });

    it('fechamento normal (conferido alto) → false', () => {
        expect(semLancamento(6000, 100)).toBe(false);
    });

    it('sem venda no dia → false, mesmo com conferido zero', () => {
        expect(semLancamento(0, 0)).toBe(false);
        expect(semLancamento(-100, -100)).toBe(false);
    });

    it('tolerância customizada amplia a janela', () => {
        expect(semLancamento(6000, 5990, 10)).toBe(true);
        expect(semLancamento(6000, 5990)).toBe(false);
    });

    it('conferido implícito negativo também conta, pelo valor absoluto', () => {
        expect(semLancamento(6000, 6000.04)).toBe(true);
    });
});

describe('regressão: breakdown — buckets + total', () => {
    it('consolida cartão (aditivo) e repete os demais buckets crus', () => {
        const m = meios({
            dinheiro: 1000,
            moedas: 5,
            pix: 250,
            cartaoDebito: 300,
            cartaoCredito: 200,
            cartaoLegado: 100,
            nota: 50,
            baratao: 25,
        });
        expect(breakdown(m)).toEqual({
            dinheiro: 1000,
            moedas: 5,
            pix: 250,
            cartao: 600,
            nota: 50,
            baratao: 25,
            total: 1930,
        });
    });

    it('sessão zerada → todos os buckets e o total em 0', () => {
        expect(breakdown(meios())).toEqual({
            dinheiro: 0,
            moedas: 0,
            pix: 0,
            cartao: 0,
            nota: 0,
            baratao: 0,
            total: 0,
        });
    });

    it('buckets saem crus (sem quantizar); só cartao e total passam por emCentavos', () => {
        expect(breakdown(meios({ dinheiro: 0.005 }))).toEqual({
            dinheiro: 0.005,
            moedas: 0,
            pix: 0,
            cartao: 0,
            nota: 0,
            baratao: 0,
            total: 0.01,
        });
    });
});

describe('regressão: meiosFromFechamentoRow — adapter do banco/UI', () => {
    it('linha do PWA: split de cartão, legado 0, com moedas', () => {
        expect(meiosFromFechamentoRow({
            valor_dinheiro: 1000,
            valor_moedas: 5,
            valor_pix: 250,
            valor_cartao: 0,
            valor_cartao_debito: 300,
            valor_cartao_credito: 200,
            valor_nota: 50,
            baratao: 25,
        })).toEqual({
            dinheiro: 1000,
            moedas: 5,
            pix: 250,
            cartaoDebito: 300,
            cartaoCredito: 200,
            cartaoLegado: 0,
            nota: 50,
            baratao: 25,
        });
    });

    it('linha do web: lump em valor_cartao, sem moedas, baratão pelo nome de UI', () => {
        expect(meiosFromFechamentoRow({
            valor_dinheiro: 1000,
            valor_pix: 250,
            valor_cartao: 500,
            valor_nota: 50,
            valor_baratao: 25,
        })).toEqual({
            dinheiro: 1000,
            moedas: 0,
            pix: 250,
            cartaoDebito: 0,
            cartaoCredito: 0,
            cartaoLegado: 500,
            nota: 50,
            baratao: 25,
        });
    });

    it('null e undefined viram 0; baratao null cai para valor_baratao', () => {
        expect(meiosFromFechamentoRow({
            valor_dinheiro: null,
            valor_moedas: undefined,
            baratao: null,
            valor_baratao: 25,
        })).toEqual({
            dinheiro: 0,
            moedas: 0,
            pix: 0,
            cartaoDebito: 0,
            cartaoCredito: 0,
            cartaoLegado: 0,
            nota: 0,
            baratao: 25,
        });
    });

    it('baratao = 0 tem precedência sobre valor_baratao (??, não ||)', () => {
        expect(meiosFromFechamentoRow({ baratao: 0, valor_baratao: 25 }).baratao).toBe(0);
    });

    it('linha vazia → todos os buckets em 0', () => {
        expect(meiosFromFechamentoRow({})).toEqual({
            dinheiro: 0,
            moedas: 0,
            pix: 0,
            cartaoDebito: 0,
            cartaoCredito: 0,
            cartaoLegado: 0,
            nota: 0,
            baratao: 0,
        });
    });

    it('NaN e Infinity viram 0 (coerção para número finito)', () => {
        const m = meiosFromFechamentoRow({ valor_dinheiro: NaN, valor_pix: Infinity });
        expect(m.dinheiro).toBe(0);
        expect(m.pix).toBe(0);
    });

    it('valores negativos na linha são preservados', () => {
        expect(meiosFromFechamentoRow({ valor_dinheiro: -100 }).dinheiro).toBe(-100);
    });

    it('conferido da linha do web bate com o da linha do PWA equivalente', () => {
        const pwa = meiosFromFechamentoRow({
            valor_dinheiro: 1000,
            valor_pix: 250,
            valor_cartao_debito: 300,
            valor_cartao_credito: 200,
            valor_nota: 50,
            baratao: 25,
        });
        const web = meiosFromFechamentoRow({
            valor_dinheiro: 1000,
            valor_pix: 250,
            valor_cartao: 500,
            valor_nota: 50,
            valor_baratao: 25,
        });
        expect(conferido(pwa)).toBe(1825);
        expect(conferido(web)).toBe(1825);
    });
});

describe('regressão: meiosFromPwaPayments — string mascarada em centavos', () => {
    it('moeda mascarada completa vira reais', () => {
        expect(meiosFromPwaPayments(pagamentos({
            dinheiro: 'R$ 1.000,00',
            moedas: 'R$ 5,50',
            pix: 'R$ 250,00',
            debito: 'R$ 300,00',
            credito: 'R$ 200,00',
            notaPrazo: 'R$ 50,00',
            baratao: 'R$ 25,00',
        }))).toEqual({
            dinheiro: 1000,
            moedas: 5.5,
            pix: 250,
            cartaoDebito: 300,
            cartaoCredito: 200,
            cartaoLegado: 0,
            nota: 50,
            baratao: 25,
        });
    });

    it('o total da sessão do PWA fecha em 1830,50', () => {
        expect(conferido(meiosFromPwaPayments(pagamentos({
            dinheiro: 'R$ 1.000,00',
            moedas: 'R$ 5,50',
            pix: 'R$ 250,00',
            debito: 'R$ 300,00',
            credito: 'R$ 200,00',
            notaPrazo: 'R$ 50,00',
            baratao: 'R$ 25,00',
        })))).toBe(1830.5);
    });

    it('dígitos crus (sem máscara) valem o mesmo que a string mascarada', () => {
        expect(meiosFromPwaPayments(pagamentos({ dinheiro: '100000' })).dinheiro).toBe(1000);
        expect(meiosFromPwaPayments(pagamentos({ dinheiro: 'R$ 1.000,00' })).dinheiro).toBe(1000);
        expect(meiosFromPwaPayments(pagamentos({ moedas: '550' })).moedas).toBe(5.5);
        expect(meiosFromPwaPayments(pagamentos({ debito: '7' })).cartaoDebito).toBe(0.07);
    });

    it('string vazia, zeros e lixo sem dígito → 0', () => {
        expect(meiosFromPwaPayments(pagamentos())).toEqual({
            dinheiro: 0,
            moedas: 0,
            pix: 0,
            cartaoDebito: 0,
            cartaoCredito: 0,
            cartaoLegado: 0,
            nota: 0,
            baratao: 0,
        });
        expect(meiosFromPwaPayments(pagamentos({ pix: '000' })).pix).toBe(0);
        expect(meiosFromPwaPayments(pagamentos({ credito: 'abc' })).cartaoCredito).toBe(0);
        expect(meiosFromPwaPayments(pagamentos({ baratao: 'R$ 0,00' })).baratao).toBe(0);
    });

    it('o PWA nunca preenche o cartão legado', () => {
        expect(meiosFromPwaPayments(pagamentos({ debito: 'R$ 300,00' })).cartaoLegado).toBe(0);
    });

    it('sinal de menos é descartado com o resto dos não-dígitos: "-R$ 10,00" vira +10', () => {
        // Comportamento congelado, não endosso: a máscara do PWA não emite negativo.
        expect(meiosFromPwaPayments(pagamentos({ dinheiro: '-R$ 10,00' })).dinheiro).toBe(10);
    });

    it('milhar com ponto não duplica dígitos: "R$ 1.234,56" = 1234,56', () => {
        expect(meiosFromPwaPayments(pagamentos({ notaPrazo: 'R$ 1.234,56' })).nota).toBe(1234.56);
    });
});

describe('regressão: fechamento de ponta a ponta (PWA → conferido → diferença)', () => {
    it('FALTA: encerrante 2.000,00 contra 1.830,50 conferidos', () => {
        const m = meiosFromPwaPayments(pagamentos({
            dinheiro: 'R$ 1.000,00',
            moedas: 'R$ 5,50',
            pix: 'R$ 250,00',
            debito: 'R$ 300,00',
            credito: 'R$ 200,00',
            notaPrazo: 'R$ 50,00',
            baratao: 'R$ 25,00',
        }));
        const total = conferido(m);
        const d = diferenca(2000, total);
        expect(total).toBe(1830.5);
        expect(d).toBe(169.5);
        expect(isFalta(d)).toBe(true);
        expect(isSobra(d)).toBe(false);
    });

    it('SOBRA: encerrante 1.000,00 contra 1.200,00 conferidos', () => {
        const d = diferenca(1000, conferido(meios({ dinheiro: 1200 })));
        expect(d).toBe(-200);
        expect(isSobra(d)).toBe(true);
    });

    it('a inversa fecha o ciclo: conferidoImplicito devolve o conferido original', () => {
        const total = conferido(meios({ dinheiro: 1000, pix: 500, cartaoLegado: 300 }));
        const d = diferenca(2000, total);
        expect(total).toBe(1800);
        expect(d).toBe(200);
        expect(conferidoImplicito(2000, d)).toBe(1800);
    });
});
