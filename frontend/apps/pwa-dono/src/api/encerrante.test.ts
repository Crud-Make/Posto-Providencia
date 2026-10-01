import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hojeIso, somarDias, deIsoLocal } from '@posto/utils';
import {
    contarDiasEmFalta,
    corpoDasLeituras,
    paraBicosDaTela,
    paraUltimasLeituras,
    paraUltimosPrecos,
    type BicoDaApi,
    type LeituraDaApi,
} from './encerrante';
import { api } from '../services/api';
import { esquecerToken, guardarToken } from './sessao';

// O módulo do Supabase cria o client na importação; aqui só o OCR o usaria, e o OCR não é testado.
vi.mock('../lib/supabase', () => ({ supabase: {} }));

const bico = (id: number, numero: number, ativo: boolean, preco = '6.98'): BicoDaApi => ({
    id,
    numero,
    ativo,
    combustivel: { id: 100 + id, nome: `Comb ${id}`, codigo: 'GC', preco_venda: preco },
});

const leitura = (bicoId: number, data: string, final: string, preco = '6.28'): LeituraDaApi => ({
    id: bicoId * 10,
    data: `${data}T00:00:00Z`,
    bico_id: bicoId,
    combustivel_id: 1,
    turno_id: null,
    leitura_inicial: '1000.000',
    leitura_final: final,
    litros_vendidos: '0.000',
    preco_litro: preco,
    valor_total: '0.00',
});

describe('adaptadores do encerrante (API → tela)', () => {
    /** A API devolve ativos E inativos; o Supabase filtrava `ativo = true`. */
    it('deixa de fora o bico inativo e ordena pelo número', () => {
        const tela = paraBicosDaTela([bico(12, 3, true), bico(11, 2, false), bico(10, 1, true)]);

        expect(tela.map((b) => b.id)).toEqual([10, 12]);
    });

    it('converte o preço do cadastro de string decimal para número, sem arredondar', () => {
        const [tela] = paraBicosDaTela([bico(10, 1, true, '6.989')]);

        expect(tela).toEqual({
            id: 10,
            numero: 1,
            combustivel_id: 110,
            combustivel: { nome: 'Comb 10', codigo: 'GC', preco_venda: 6.989 },
        });
    });

    it('a última leitura de cada bico vira o encerrante inicial, em número', () => {
        const mapa = paraUltimasLeituras([leitura(10, '2026-09-30', '1861796.633'), leitura(11, '2026-09-29', '500000.000')]);

        expect(mapa.get(10)).toBe(1861796.633);
        expect(mapa.get(11)).toBe(500000);
    });

    /** Preço zero não é preço herdado: o bico cai no cadastro, como no `api-core`. */
    it('herda o preço do último dia lançado e ignora preço zero', () => {
        const mapa = paraUltimosPrecos([leitura(10, '2026-09-30', '1.000', '6.28'), leitura(11, '2026-09-30', '1.000', '0.00')]);

        expect(mapa.get(10)).toBe(6.28);
        expect(mapa.has(11)).toBe(false);
    });
});

describe('dias em falta (regra do api-core, sobre a lista da API)', () => {
    const hoje = '2026-10-01';
    const dia = (atras: number) => somarDias(deIsoLocal(hoje), -atras);

    it('cobra os sete dias de antes de hoje, completos ficam de fora, incompletos entram', () => {
        const lidas = [
            leitura(10, dia(1), '1.000'),
            leitura(11, dia(1), '1.000'), // completo
            leitura(10, dia(2), '1.000'), // 1 de 2
        ];

        const faltas = contarDiasEmFalta(lidas, 2, hoje);

        expect(faltas.map((f) => f.data)).toEqual([dia(7), dia(6), dia(5), dia(4), dia(3), dia(2)]);
        expect(faltas.at(-1)).toEqual({ data: dia(2), bicosLancados: 1, bicosEsperados: 2 });
        expect(faltas[0]).toEqual({ data: dia(7), bicosLancados: 0, bicosEsperados: 2 });
    });

    it('hoje nunca entra na lista: está em andamento, não em falta', () => {
        const faltas = contarDiasEmFalta([], 2, hoje);

        expect(faltas).toHaveLength(7);
        expect(faltas.some((f) => f.data === hoje)).toBe(false);
    });
});

describe('corpo do PUT /leituras', () => {
    /**
     * O servidor recusa número JSON em campo decimal (float no PHP perde casa) e exige
     * exatamente 3 casas em litros e 2 em dinheiro. Litros e valor saem de
     * `litrosVendidos`/`valorDaLeitura` de `@posto/utils`, como no caminho do Supabase.
     */
    it('manda litros com 3 casas, dinheiro com 2, em string; ids inteiros', () => {
        const corpo = corpoDasLeituras([
            { bico_id: 10, combustivel_id: 1, leitura_inicial: 1861796.633, leitura_final: 1861900.5, preco_litro: 6.28 },
        ]);

        expect(corpo).toEqual({
            leituras: [
                {
                    bico_id: 10,
                    combustivel_id: 1,
                    leitura_inicial: '1861796.633',
                    leitura_final: '1861900.500',
                    litros_vendidos: '103.867',
                    preco_litro: '6.28',
                    // 103,867 L × 6,28 = 652,28476 → R$ 652,28
                    valor_total: '652.28',
                },
            ],
        });
        expect(JSON.stringify(corpo)).toContain('"bico_id":10,');
    });

    it('primeira leitura do bico (inicial = final) vai com zero litros e zero reais', () => {
        const { leituras } = corpoDasLeituras([
            { bico_id: 10, combustivel_id: 1, leitura_inicial: 1000, leitura_final: 1000, preco_litro: 6 },
        ]);

        expect(leituras[0]).toMatchObject({
            leitura_inicial: '1000.000',
            leitura_final: '1000.000',
            litros_vendidos: '0.000',
            preco_litro: '6.00',
            valor_total: '0.00',
        });
    });
});

describe('fachada `api` sobre a API Laravel', () => {
    const chamadas: { url: string; init: RequestInit }[] = [];
    let responder: (url: string, init: RequestInit) => Response;

    beforeEach(() => {
        chamadas.length = 0;
        vi.stubEnv('VITE_API_URL', 'http://api.teste/');
        vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
            chamadas.push({ url, init });
            return responder(url, init);
        });
        guardarToken('tok-br');
    });

    afterEach(() => {
        esquecerToken();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    const json = (corpo: unknown, status = 200) =>
        new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

    it('grava pelo PUT do posto da sessão, com o dia na query e o Bearer', async () => {
        responder = () => json({ data: [leitura(10, '2026-09-30', '1100.000')] });

        await api.salvarLeituras({
            postoId: 2,
            data: '2026-09-30',
            linhas: [{ bico_id: 10, combustivel_id: 1, leitura_inicial: 1000, leitura_final: 1100, preco_litro: 6 }],
        });

        expect(chamadas).toHaveLength(1);
        expect(chamadas[0]?.url).toBe('http://api.teste/api/postos/2/leituras?data=2026-09-30');
        expect(chamadas[0]?.init.method).toBe('PUT');
        const cabecalhos = (chamadas[0]?.init.headers ?? {}) as Record<string, string>;
        expect(cabecalhos.Authorization).toBe('Bearer tok-br');
        expect(JSON.parse(String(chamadas[0]?.init.body))).toEqual({
            leituras: [
                {
                    bico_id: 10,
                    combustivel_id: 1,
                    leitura_inicial: '1000.000',
                    leitura_final: '1100.000',
                    litros_vendidos: '100.000',
                    preco_litro: '6.00',
                    valor_total: '600.00',
                },
            ],
        });
    });

    /** A recusa do servidor (fora da janela, item de outro posto) chega à tela com a frase dele. */
    it('a recusa 422 chega à tela com a mensagem do servidor', async () => {
        responder = () => json({ erro: { codigo: 'fora_da_janela', mensagem: 'Dia fora da janela de edição.' } }, 422);

        await expect(
            api.salvarLeituras({
                postoId: 2,
                data: '2025-01-01',
                linhas: [{ bico_id: 10, combustivel_id: 1, leitura_inicial: 1, leitura_final: 2, preco_litro: 6 }],
            }),
        ).rejects.toThrow('Dia fora da janela de edição.');
    });

    it('encerrante inicial e preço herdado saem de UMA busca só, do mesmo dia', async () => {
        responder = () => json({ data: [leitura(10, '2026-09-29', '1500.250', '6.28')] });

        const [ultimas, precos] = await Promise.all([
            api.getUltimasLeiturasPorBico(2, '2026-09-30'),
            api.getUltimosPrecosPorBico(2, '2026-09-30'),
        ]);

        expect(chamadas.map((c) => c.url)).toEqual(['http://api.teste/api/postos/2/leituras/ultimas?antes_de=2026-09-30']);
        expect(ultimas.get(10)).toBe(1500.25);
        expect(precos.get(10)).toBe(6.28);
    });

    it('bicos: filtra o inativo também pela fachada', async () => {
        responder = () => json({ data: [bico(10, 1, true), bico(11, 2, false)] });

        const bicos = await api.getBicos(2);

        expect(chamadas[0]?.url).toBe('http://api.teste/api/postos/2/bicos');
        expect(bicos.map((b) => b.id)).toEqual([10]);
    });

    it('dias em falta pede a semana até ontem, nunca hoje', async () => {
        responder = () => json({ data: [] });
        const hoje = hojeIso();

        await api.diasEmFalta(2, 2);

        const url = new URL(chamadas[0]?.url ?? '');
        expect(url.pathname).toBe('/api/postos/2/leituras');
        expect(url.searchParams.get('data')).toBe(somarDias(deIsoLocal(hoje), -7));
        expect(url.searchParams.get('ate')).toBe(somarDias(deIsoLocal(hoje), -1));
    });

    /** Número cru onde o contrato diz string decimal é resposta fora do contrato. */
    it('recusa resposta com número cru no lugar de string decimal', async () => {
        responder = () => json({ data: [{ ...bico(10, 1, true), combustivel: { ...bico(10, 1, true).combustivel, preco_venda: 6.98 } }] });

        await expect(api.getBicos(2)).rejects.toThrow('formato inesperado');
    });
});
