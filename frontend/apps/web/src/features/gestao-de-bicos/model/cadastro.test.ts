import { describe, expect, it } from 'vitest';
import type { PistaDaApi } from '../api/cadastro-de-bicos.api';
import {
    capacidadeDoTexto,
    combustiveisComTanques,
    corpoDoCombustivel,
    corpoDoTanque,
    custoDoTexto,
    custoParaCampo,
    litrosParaCampo,
    litrosParaTela,
    precoDoTexto,
    precoParaTela,
} from './cadastro';

describe('precoDoTexto — dinheiro em string, sem float', () => {
    it.each([
        ['6,89', '6.89'],
        ['6.89', '6.89'],
        [' 7,2 ', '7.2'],
        ['7', '7'],
    ])('%s → %s', (texto, esperado) => {
        expect(precoDoTexto(texto)).toEqual({ ok: true, valor: esperado });
    });

    it.each(['', '0', '0,00', '6,899', 'abc', '-6,89', '6,89,1'])('%s não passa', (texto) => {
        expect(precoDoTexto(texto).ok).toBe(false);
    });

    it('volta para a tela no formato do posto', () => {
        expect(precoParaTela('6.89')).toBe('R$ 6,89');
    });
});

describe('capacidadeDoTexto — o ponto é separador de milhar', () => {
    it.each([
        ['20.000', '20000'],
        ['20000', '20000'],
        ['15.000,5', '15000.5'],
    ])('%s → %s', (texto, esperado) => {
        expect(capacidadeDoTexto(texto)).toEqual({ ok: true, valor: esperado });
    });

    it.each(['', '0', 'muito'])('%s não passa', (texto) => {
        expect(capacidadeDoTexto(texto).ok).toBe(false);
    });

    it('litros para a tela e de volta para o campo', () => {
        expect(litrosParaTela('20000.00')).toBe('20.000 L');
        expect(litrosParaTela('15000.50')).toBe('15.000,50 L');
        expect(litrosParaCampo('20000.00')).toBe('20.000');
    });
});

describe('combustiveisComTanques', () => {
    const pista: PistaDaApi = {
        bombas: [],
        bicos: [],
        combustiveis: [
            { id: 1, nome: 'Gasolina Comum', codigo: 'GC', cor: null, ativo: true, preco_venda: '6.89', preco_custo: null },
            { id: 2, nome: 'Etanol', codigo: 'ET', cor: null, ativo: true, preco_venda: '4.89', preco_custo: null },
            { id: 3, nome: 'Querosene', codigo: 'QR', cor: null, ativo: false, preco_venda: '5.00', preco_custo: null },
        ],
        tanques: [
            { id: 10, nome: 'Tanque 2', combustivel_id: 1, capacidade: '15000.00', ativo: true },
            { id: 11, nome: 'Tanque 1', combustivel_id: 1, capacidade: '20000.00', ativo: true },
            { id: 12, nome: 'Tanque ET velho', combustivel_id: 2, capacidade: '10000.00', ativo: false },
        ],
    };

    it('combustíveis por nome, cada um com os tanques dele; inativos só a pedido', () => {
        const lista = combustiveisComTanques(pista, false);
        expect(lista.map((c) => c.combustivel.codigo)).toEqual(['ET', 'GC']);
        expect(lista[1]?.tanques.map((t) => t.nome)).toEqual(['Tanque 1', 'Tanque 2']);
        expect(lista[0]?.tanques).toEqual([]);
        expect(combustiveisComTanques(pista, true).map((c) => c.combustivel.codigo)).toEqual(['ET', 'GC', 'QR']);
    });
});

describe('custo por litro — o que o gerente informa (30/09)', () => {
    it.each([
        ['5,34', '5.34'],
        ['5,3451', '5.3451'],
        [' 4.1 ', '4.1'],
    ])('%s → %s', (texto, esperado) => {
        expect(custoDoTexto(texto)).toEqual({ ok: true, valor: esperado });
    });

    it('vazio é "não sei o custo" (null), não zero', () => {
        expect(custoDoTexto('')).toEqual({ ok: true, valor: null });
        expect(custoDoTexto('   ')).toEqual({ ok: true, valor: null });
    });

    it.each(['0', '0,00', '5,34516', 'abc', '-5', '5,3,4'])('%s não passa', (texto) => {
        expect(custoDoTexto(texto).ok).toBe(false);
    });

    it('volta para o campo sem os zeros da coluna de 4 casas; custo nunca informado fica vazio', () => {
        expect(custoParaCampo('5.3100')).toBe('5,31');
        expect(custoParaCampo('5.3451')).toBe('5,3451');
        expect(custoParaCampo('5.3450')).toBe('5,345');
        expect(custoParaCampo('5.0000')).toBe('5,00');
        expect(custoParaCampo('0.0000')).toBe('');
        expect(custoParaCampo('0')).toBe('');
        expect(custoParaCampo(null)).toBe('');
    });
});

describe('corpo dos formulários', () => {
    it('combustível: código em maiúsculas, preço em string, cor inválida vira null', () => {
        expect(corpoDoCombustivel({ nome: ' Diesel S10 ', codigo: 's10', cor: 'xx', preco: '7,29', custo: '5,3451', ativo: true })).toEqual({
            ok: true,
            valor: { nome: 'Diesel S10', codigo: 'S10', cor: null, preco_venda: '7.29', preco_custo: '5.3451', ativo: true },
        });
        expect(corpoDoCombustivel({ nome: 'Etanol', codigo: 'ET', cor: '#43A047', preco: '', custo: '', ativo: true }).ok).toBe(false);
        expect(corpoDoCombustivel({ nome: 'Etanol', codigo: 'ET-1', cor: '', preco: '4,89', custo: '', ativo: true }).ok).toBe(false);
        expect(corpoDoCombustivel({ nome: 'Etanol', codigo: 'ET', cor: '', preco: '4,89', custo: '0', ativo: true }).ok).toBe(false);
    });

    it('combustível sem custo manda preco_custo null (a chave vai sempre)', () => {
        const lido = corpoDoCombustivel({ nome: 'Etanol', codigo: 'ET', cor: '', preco: '4,89', custo: ' ', ativo: true });
        expect(lido).toEqual({ ok: true, valor: { nome: 'Etanol', codigo: 'ET', cor: null, preco_venda: '4.89', preco_custo: null, ativo: true } });
    });

    it('tanque: sem combustível ou sem capacidade não vai; nunca manda estoque', () => {
        const ok = corpoDoTanque({ nome: 'Tanque GC', combustivelId: 1, capacidade: '20.000', ativo: true });
        expect(ok).toEqual({ ok: true, valor: { nome: 'Tanque GC', combustivel_id: 1, capacidade: '20000', ativo: true } });
        expect(ok.ok && 'estoque_atual' in ok.valor).toBe(false);
        expect(corpoDoTanque({ nome: 'T', combustivelId: null, capacidade: '1', ativo: true }).ok).toBe(false);
        expect(corpoDoTanque({ nome: 'T', combustivelId: 1, capacidade: '', ativo: true }).ok).toBe(false);
    });
});
