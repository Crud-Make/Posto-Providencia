/**
 * Golden master dos TOTAIS DO DIA contra o dado real de janeiro/2026.
 *
 * @remarks
 * Existe porque os três números que fecham o dia — `total_vendas`,
 * `total_recebido` e `diferenca` — **não tinham cobertura nenhuma**. Nem golden,
 * nem unitário. Foi essa ausência que deixou passar duas coisas ao mesmo tempo,
 * no mesmo caminho de código do painel:
 *
 *   1. O SINAL INVERTIDO. O painel gravava `conferido − concentrador`, enquanto
 *      os filhos da mesma submissão gravavam `concentrador − conferido` (§6).
 *      Falta e sobra trocavam de lugar dependendo de quem escreveu a linha.
 *   2. O PAI ZERADO. O PWA insere `total_vendas: 0` e nunca volta; só o painel
 *      consolidava.
 *
 * Este arquivo trava a convenção antes de qualquer conserto: **positivo = FALTA**.
 *
 * Fonte: `docs/data/posto_jorro_2026.sqlite`, tabelas `fechamento_diario`,
 * `venda_frentista_diaria` e `frentista_dia_total` — as três extraídas da
 * planilha real e já validadas pelos golden anteriores.
 *
 * Comparação em CENTAVOS INTEIROS, como o resto dos golden do pacote.
 *
 * Roda sob `bun run test:golden` (usa `bun:sqlite` nativo); o vitest ignora
 * este arquivo, que é `*.spec.ts` e não `*.test.ts`.
 */
import { Database } from 'bun:sqlite';
import { test, expect } from 'bun:test';
import { totaisDoDia, isFalta, isSobra, type MeiosPagamento, conferido } from './fechamento';
import { emCentavos } from './lucro';

const DB_PATH = `${import.meta.dir}/../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(DB_PATH, { readonly: true });

const ANO = 2026;
const MES = 1;

/**
 * Reais para centavos inteiros, normalizando o zero negativo.
 *
 * @remarks O `-0` não é frescura de teste: um dia que fecha EXATAMENTE certo
 *          (falta zero, como o 27 de janeiro) sai de `Math.round` como `-0`, e
 *          `toBe` usa `Object.is`, onde `-0 !== 0`. Sem isto, o golden reprova
 *          justamente o dia perfeito.
 */
const centavos = (reais: number): number => {
    const n = Math.round(reais * 100);
    return n === 0 ? 0 : n;
};

interface DiaDaReferencia {
    dia: number;
    /** Venda do dia pelo encerrante dos bicos. */
    venda_concentrador_total: number;
    /** Venda do dia pelo concentrador, na conferência de caixa. */
    caixa_venda_concentrador: number;
    /** O que os frentistas entregaram, na conferência de caixa. */
    caixa_venda_frentista: number;
    dado_incompleto: number;
}

interface FormaDePagamento {
    dia: number;
    frentista: string;
    forma: string;
    valor: number;
}

const dias = db
    .query(
        `SELECT dia, venda_concentrador_total, caixa_venda_concentrador,
                caixa_venda_frentista, dado_incompleto
           FROM fechamento_diario
          WHERE ano = ? AND mes = ?
          ORDER BY dia`
    )
    .all(ANO, MES) as unknown as DiaDaReferencia[];

const formas = db
    .query(
        `SELECT dia, frentista, forma, valor
           FROM venda_frentista_diaria
          WHERE ano = ? AND mes = ?`
    )
    .all(ANO, MES) as unknown as FormaDePagamento[];

/**
 * Monta uma sessão por frentista a partir das formas soltas da referência.
 *
 * @remarks A referência guarda uma linha por (dia, frentista, forma); o módulo
 *          canônico recebe uma sessão com os 7 baldes preenchidos. `cartaoLegado`
 *          fica em zero de propósito: ele é o lump de cartão do dashboard web, e
 *          a referência já traz débito e crédito separados — somar nos dois
 *          lugares contaria cartão duas vezes.
 */
function sessoesDoDia(dia: number): MeiosPagamento[] {
    const porFrentista = new Map<string, MeiosPagamento>();

    for (const f of formas) {
        if (f.dia !== dia) continue;

        const atual = porFrentista.get(f.frentista) ?? {
            dinheiro: 0,
            moedas: 0,
            pix: 0,
            cartaoDebito: 0,
            cartaoCredito: 0,
            cartaoLegado: 0,
            nota: 0,
            baratao: 0,
        };

        const rotulo = f.forma.trim().toLowerCase();
        if (rotulo.includes('dinheiro')) atual.dinheiro += f.valor;
        else if (rotulo.includes('moeda')) atual.moedas += f.valor;
        else if (rotulo.includes('pix')) atual.pix += f.valor;
        else if (rotulo.includes('débito') || rotulo.includes('debito'))
            atual.cartaoDebito += f.valor;
        else if (rotulo.includes('crédito') || rotulo.includes('credito'))
            atual.cartaoCredito += f.valor;
        else if (rotulo.includes('nota')) atual.nota += f.valor;
        else if (rotulo.includes('barat')) atual.baratao += f.valor;
        else throw new Error(`forma de pagamento desconhecida na referência: "${f.forma}"`);

        porFrentista.set(f.frentista, atual);
    }

    return [...porFrentista.values()];
}

test('a referência de janeiro está no disco e tem os 31 dias', () => {
    expect(dias.length).toBe(31);
    expect(formas.length).toBeGreaterThan(1000);
});

test('nenhum dia de janeiro está marcado como incompleto', () => {
    // Se um dia virar incompleto numa extração futura, o golden abaixo passaria
    // a comparar contra número parcial sem ninguém perceber.
    expect(dias.filter((d) => d.dado_incompleto !== 0)).toEqual([]);
});

for (const d of dias) {
    test(`total recebido bate com a referência — dia ${d.dia}`, () => {
        const totais = totaisDoDia(d.caixa_venda_concentrador, sessoesDoDia(d.dia));
        expect(centavos(totais.totalRecebido)).toBe(centavos(d.caixa_venda_frentista));
        // Sem `centavos()` no lado do módulo: `totaisDoDia` acumulando em float
        // passava verde pela linha acima (auditoria de 21/09).
        expect(totais.totalRecebido).toBe(emCentavos(d.caixa_venda_frentista));
    });

    test(`diferença é FALTA positiva e bate com a referência — dia ${d.dia}`, () => {
        const totais = totaisDoDia(d.caixa_venda_concentrador, sessoesDoDia(d.dia));

        // A referência guarda a falta por frentista; a soma delas é a do dia.
        const faltaDaReferencia = db
            .query(
                `SELECT COALESCE(SUM(falta), 0) AS falta
                   FROM frentista_dia_total
                  WHERE ano = ? AND mes = ? AND dia = ?`
            )
            .get(ANO, MES, d.dia) as unknown as { falta: number };

        expect(centavos(totais.diferenca)).toBe(centavos(faltaDaReferencia.falta));
    });
}

/**
 * Canário: somar as sessões do dia em float cru derrapa do centavo em 15 dos 31
 * dias reais de janeiro. Medido em 21/09/2026. É o que a asserção exata acima
 * pega — se esta lista esvaziar, ela deixou de provar alguma coisa.
 */
test('somar as sessões em float derrapa em 15 dias reais; totaisDoDia em nenhum', () => {
    const derrapam = dias
        .filter((d) => {
            const cru = sessoesDoDia(d.dia).reduce((acc, m) => acc + conferido(m), 0);
            return cru !== emCentavos(cru);
        })
        .map((d) => d.dia);
    expect(derrapam).toEqual([2, 4, 6, 10, 13, 14, 15, 16, 18, 21, 22, 23, 24, 25, 27]);
});

test('o mês inteiro fecha: concentrador − conferido = falta', () => {
    const concentrador = dias.reduce((a, d) => a + d.caixa_venda_concentrador, 0);
    const sessoes = dias.flatMap((d) => sessoesDoDia(d.dia));
    const totais = totaisDoDia(concentrador, sessoes);

    const conferidoReferencia = dias.reduce((a, d) => a + d.caixa_venda_frentista, 0);

    expect(centavos(totais.totalRecebido)).toBe(centavos(conferidoReferencia));
    expect(centavos(totais.diferenca)).toBe(
        centavos(concentrador) - centavos(conferidoReferencia)
    );
    // Janeiro fechou com FALTA — é o sinal que o §6 exige, e o que trava a
    // inversão do painel se alguém tentar "consertar" o sinal ao contrário.
    expect(isFalta(totais.diferenca)).toBe(true);
    expect(isSobra(totais.diferenca)).toBe(false);
});

test('os dois concentradores da referência NÃO são o mesmo número', () => {
    // Documentado, não corrigido: `venda_concentrador_total` é a venda pelo
    // encerrante dos bicos; `caixa_venda_concentrador` é a que entra na
    // conferência de caixa. Em janeiro elas diferem, e a conferência do
    // frentista usa a SEGUNDA. Escolher a errada move a falta do mês inteiro.
    const porEncerrante = dias.reduce((a, d) => a + d.venda_concentrador_total, 0);
    const porCaixa = dias.reduce((a, d) => a + d.caixa_venda_concentrador, 0);

    expect(centavos(porEncerrante)).not.toBe(centavos(porCaixa));
    expect(centavos(porCaixa) - centavos(porEncerrante)).toBe(19484);
});
