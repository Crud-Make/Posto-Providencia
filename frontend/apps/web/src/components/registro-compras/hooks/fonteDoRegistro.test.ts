import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/supabase', () => ({ supabase: {} }));

import { entradaDaApi } from './fonteDoRegistro';
import { montarRegistroDoMes } from './montarRegistroDoMes';
import { decimalDoFloat, montarRegistroDeCompras } from './montarRegistroDeCompras';
import type { EntradaDoRegistro } from './tipos-do-registro';
import type { DadosDoRegistroDaApi } from '../../../services/api/compras.api';

/*
 * Paridade das duas fontes do Registro de Compras (#103): o MESMO mês, na forma que o PostgREST
 * entregava (números) e na forma da API (strings decimais do catálogo e do /movimento), tem de dar
 * a MESMA tela — `montarRegistroDoMes` é uma conta só.
 */

const DA_API: DadosDoRegistroDaApi = {
    combustiveis: [
        { id: 2, nome: 'Etanol', codigo: 'ET', ativo: true, preco_venda: '4.80' },
        { id: 9, nome: 'Arla', codigo: 'ARL', ativo: true, preco_venda: '3.00' },
        { id: 3, nome: 'Diesel', codigo: 'DS', ativo: false, preco_venda: '6.00' },
        { id: 1, nome: 'Gasolina Comum', codigo: 'GC', ativo: true, preco_venda: '6.50' },
    ],
    tanques: [
        { id: 10, nome: 'T1', combustivel_id: 1, ativo: true },
        { id: 12, nome: 'T0 inativo', combustivel_id: 2, ativo: false },
        { id: 13, nome: 'T nulo', combustivel_id: 2, ativo: null },
        { id: 11, nome: 'T2', combustivel_id: 2, ativo: true },
    ],
    bicos: [{ id: 100, numero: 1 }, { id: 101, numero: 2 }],
    movimento: {
        periodo: { inicio: '2026-08-01', fim: '2026-08-31' },
        leituras: [
            { bico_id: 100, combustivel_id: 1, data: '2026-08-01', leitura_inicial: '1000.000', leitura_final: '1500.500', litros_vendidos: '500.500', preco_litro: '6.50', valor_total: '3253.25' },
            { bico_id: 101, combustivel_id: 2, data: '2026-08-02', leitura_inicial: '500.000', leitura_final: '700.000', litros_vendidos: '200.000', preco_litro: '4.80', valor_total: '960.00' },
            { bico_id: 999, combustivel_id: 2, data: '2026-08-02', leitura_inicial: '1.000', leitura_final: '2.000', litros_vendidos: '1.000', preco_litro: '4.80', valor_total: '4.80' },
        ],
        compras: [
            { combustivel_id: 1, data: '2026-08-05', quantidade_litros: '5000.00', valor_total: '29000.00' },
            { combustivel_id: 1, data: '2026-08-20', quantidade_litros: '3000.00', valor_total: '17700.00' },
        ],
        despesas: [],
        medicoes: [
            { tanque_id: 10, data: '2026-07-10', volume_fisico: '9000.00' },
            { tanque_id: 10, data: '2026-07-31', volume_fisico: '8000.00' },
            { tanque_id: 11, data: '2026-07-31', volume_fisico: null },
            { tanque_id: 10, data: '2026-08-10', volume_fisico: '7000.00' },
        ],
    },
};

/** O mesmo mês como o caminho do Supabase o montava: PostgREST com número, `!inner` sem o bico alheio. */
const DO_SUPABASE: EntradaDoRegistro = {
    combustiveis: [
        { id: 1, nome: 'Gasolina Comum', codigo: 'GC', preco_venda: 6.5 },
        { id: 2, nome: 'Etanol', codigo: 'ET', preco_venda: 4.8 },
        { id: 9, nome: 'Arla', codigo: 'ARL', preco_venda: 3 },
    ],
    tanques: [{ id: 10, combustivel_id: 1 }, { id: 11, combustivel_id: 2 }],
    leituras: [
        { data: '2026-08-01T00:00:00+00:00', bico_id: 100, leitura_inicial: 1000, leitura_final: 1500.5, valor_total: 3253.25, bico: { id: 100, numero: 1, combustivel_id: 1 } },
        { data: '2026-08-02T00:00:00+00:00', bico_id: 101, leitura_inicial: 500, leitura_final: 700, valor_total: 960, bico: { id: 101, numero: 2, combustivel_id: 2 } },
    ],
    compras: [
        { combustivel_id: 1, quantidade_litros: 5000, valor_total: 29000 },
        { combustivel_id: 1, quantidade_litros: 3000, valor_total: 17700 },
    ],
    reguas: [{ tanque_id: 10, data: '2026-07-31', volume_fisico: 8000 }, { tanque_id: 10, data: '2026-07-10', volume_fisico: 9000 }],
};

describe('fonte da API do Registro de Compras', () => {
    it('filtra ativos, ordena como o combustivelService e pega a última régua ANTES do mês', () => {
        const entrada = entradaDaApi(DA_API, '2026-08-01');

        expect(entrada.combustiveis.map((c) => c.codigo)).toEqual(['GC', 'ET', 'ARL']);
        expect(entrada.tanques).toEqual([{ id: 10, combustivel_id: 1 }, { id: 11, combustivel_id: 2 }]);
        expect(entrada.reguas).toEqual([
            { tanque_id: 10, data: '2026-07-31', volume_fisico: '8000.00' },
            { tanque_id: 10, data: '2026-07-10', volume_fisico: '9000.00' },
        ]);
    });

    it('dá a MESMA tela que o caminho do Supabase', () => {
        const pelaApi = montarRegistroDoMes(entradaDaApi(DA_API, '2026-08-01'));
        const peloSupabase = montarRegistroDoMes(DO_SUPABASE);

        expect(pelaApi).toEqual(peloSupabase);
        const gc = pelaApi.combustiveis[0];
        expect(gc?.compra_mes_lt).toBe(8000);
        expect(gc?.compra_mes_rs).toBe(46700);
        expect(gc?.estoque_anterior).toBe('8.000,000');
        expect(gc?.tanque_id).toBe(10);
        // O bico de outro posto (999) não entra — como o `!inner` do Supabase.
        expect(pelaApi.vendasBicos.map((b) => b.numero)).toEqual([1, 2]);
    });
});

describe('corpo do Salvar pela API', () => {
    it('String(n) do float, como o JSON.stringify mandava; NaN vira null; expoente sai em casas fixas', () => {
        expect(decimalDoFloat(13654.123)).toBe('13654.123');
        expect(decimalDoFloat(0.1 + 0.2)).toBe('0.30000000000000004');
        expect(decimalDoFloat(-12.5)).toBe('-12.5');
        expect(decimalDoFloat(Number.NaN)).toBeNull();
        expect(decimalDoFloat(1e-7)).toBe('0.0000001');
    });

    it('compra só com litros > 0 e fornecedor; dinheiro em centavos; régua só medida', () => {
        const [gc, et] = montarRegistroDoMes(DO_SUPABASE).combustiveis;
        if (gc === undefined || et === undefined) throw new Error('mês sem combustível');
        const digitado = [
            { ...gc, compra_lt: '1.000,555', compra_rs: '5.850,505', estoque_tanque: '12.990' },
            { ...et, compra_lt: '0', compra_rs: '100,00', estoque_tanque: '' },
        ];

        const corpo = montarRegistroDeCompras(digitado, () => 13000.25, 7, '2026-08-31');
        expect(corpo).toEqual({
            data: '2026-08-31',
            fornecedor_id: 7,
            itens: [
                { combustivel_id: 1, tanque_id: 10, compra: { quantidade_litros: '1000.555', valor_total: '5850.51' }, volume_livro: '13000.25', volume_fisico: '12990' },
                { combustivel_id: 2, tanque_id: 11, compra: null, volume_livro: '13000.25', volume_fisico: null },
            ],
        });

        // Sem fornecedor, nenhuma compra sai (o painel pulava — e alertava antes).
        expect(montarRegistroDeCompras(digitado, () => 0, null, '2026-08-31').itens[0]?.compra).toBeNull();
    });
});
