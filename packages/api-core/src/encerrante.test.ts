/**
 * `consolidarFechamento` — o que o pai do dia recebe em cada estado do encerrante.
 *
 * O client do Supabase é um dublê mínimo: cada tabela devolve as linhas do
 * cenário e registra o `update` que a função mandou. O que se prova aqui é a
 * REPRESENTAÇÃO — número quando apurado, `null` quando não —, porque foi ela que
 * faltou: a conta (`totaisDoDia`) já é coberta em `@posto/utils`.
 */
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { criarAcessoEncerrante } from './encerrante';

interface Cenario {
    readonly bicosAtivos: number;
    readonly leituras: readonly { valor_total: number | null }[];
    readonly filhos: readonly Record<string, number | null>[];
}

/** Dublê do client: `from(tabela)` → builder encadeável que resolve no cenário. */
function clientFalso(c: Cenario) {
    const updates: { tabela: string; valores: Record<string, unknown> }[] = [];

    const builder = (tabela: string) => {
        let payloadUpdate: Record<string, unknown> | null = null;
        const resultado = () => {
            if (payloadUpdate) {
                updates.push({ tabela, valores: payloadUpdate });
                return { data: null, error: null, count: null };
            }
            if (tabela === 'Fechamento') return { data: { id: 7, data: '2026-09-03', turno_id: 1, posto_id: 1 }, error: null, count: null };
            if (tabela === 'FechamentoFrentista') return { data: c.filhos, error: null, count: null };
            if (tabela === 'Leitura') return { data: c.leituras, error: null, count: null };
            if (tabela === 'Bico') return { data: null, error: null, count: c.bicosAtivos };
            throw new Error(`tabela inesperada: ${tabela}`);
        };
        const b: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'single', 'maybeSingle']) {
            b[m] = () => b;
        }
        b.update = (valores: Record<string, unknown>) => {
            payloadUpdate = valores;
            return b;
        };
        // `await builder` — o PostgREST builder é thenable.
        b.then = (resolve: (v: unknown) => void) => resolve(resultado());
        return b;
    };

    const client = { from: (tabela: string) => builder(tabela) } as unknown as SupabaseClient;
    return { client, updates };
}

const filhoDe = (dinheiro: number, pix = 0) => ({
    valor_dinheiro: dinheiro,
    valor_moedas: 0,
    valor_pix: pix,
    valor_cartao: 0,
    valor_cartao_debito: 0,
    valor_cartao_credito: 0,
    valor_nota: 0,
    baratao: 0,
});

describe('consolidarFechamento — apurado × não apurado', () => {
    it('sem nenhuma leitura: grava só o recebido e NULL em venda e diferença', async () => {
        const { client, updates } = clientFalso({
            bicosAtivos: 6,
            leituras: [],
            filhos: [filhoDe(1000), filhoDe(500, 250)],
        });
        const r = await criarAcessoEncerrante(client).consolidarFechamento(7);

        expect(r?.apurado).toBe(false);
        expect(updates).toEqual([
            { tabela: 'Fechamento', valores: { total_vendas: null, total_recebido: 1750, diferenca: null } },
        ]);
    });

    it('encerrante pela metade (3 de 6 bicos): continua não apurado — venda parcial não é venda', async () => {
        const { client, updates } = clientFalso({
            bicosAtivos: 6,
            leituras: [{ valor_total: 900 }, { valor_total: 800 }, { valor_total: 700 }],
            filhos: [filhoDe(2400)],
        });
        const r = await criarAcessoEncerrante(client).consolidarFechamento(7);

        expect(r?.apurado).toBe(false);
        expect(updates[0].valores).toEqual({ total_vendas: null, total_recebido: 2400, diferenca: null });
    });

    it('6 de 6 bicos: apura — diferença = concentrador − conferido, positivo é FALTA (§6)', async () => {
        const { client, updates } = clientFalso({
            bicosAtivos: 6,
            leituras: [900, 800, 700, 600, 500, 400].map(v => ({ valor_total: v })),
            filhos: [filhoDe(2000), filhoDe(1500, 300)],
        });
        const r = await criarAcessoEncerrante(client).consolidarFechamento(7);

        expect(r?.apurado).toBe(true);
        // 3.900 vendidos − 3.800 entregues = falta de 100
        expect(updates[0].valores).toEqual({ total_vendas: 3900, total_recebido: 3800, diferenca: 100 });
    });

    it('apurado e batido grava ZERO, não null — zero é resposta, null é pergunta', async () => {
        const { client, updates } = clientFalso({
            bicosAtivos: 2,
            leituras: [{ valor_total: 1000 }, { valor_total: 500 }],
            filhos: [filhoDe(1500)],
        });
        await criarAcessoEncerrante(client).consolidarFechamento(7);

        expect(updates[0].valores).toEqual({ total_vendas: 1500, total_recebido: 1500, diferenca: 0 });
    });
});
