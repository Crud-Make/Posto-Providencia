import { describe, expect, it } from 'vitest';
import type { PistaDaApi, TanqueDaApi } from '../api/cadastro-de-bicos.api';
import { agruparPorBomba, corpoDoBico, proximoNumeroLivre, tanquesDoCombustivel, trocaCombustivel, type FormularioDeBico } from './pista';

const gc = { id: 1, nome: 'Gasolina Comum', codigo: 'GC', cor: '#E53935', ativo: true };
const et = { id: 2, nome: 'Etanol', codigo: 'ET', cor: '#43A047', ativo: true };
const tanqueGc: TanqueDaApi = { id: 10, nome: 'Tanque GC', combustivel_id: 1, ativo: true };
const tanqueEt: TanqueDaApi = { id: 20, nome: 'Tanque ET', combustivel_id: 2, ativo: true };

const bico = (id: number, numero: number, bomba: number, ativo = true) => ({
    id, numero, ativo, bomba: { id: bomba }, combustivel: { id: 1 }, tanque: { id: 10 },
});

const pista: PistaDaApi = {
    bombas: [
        { id: 3, nome: 'BOMBA 10', localizacao: null, ativo: true },
        { id: 1, nome: 'BOMBA 02', localizacao: 'Ilha da frente', ativo: true },
        { id: 2, nome: 'BOMBA 03', localizacao: null, ativo: false },
    ],
    bicos: [bico(1, 4, 1), bico(2, 3, 1), bico(3, 5, 1, false), bico(4, 9, 3)],
    combustiveis: [gc, et],
    tanques: [tanqueGc, tanqueEt],
};

describe('agruparPorBomba', () => {
    it('ordena bombas pelo nome com número natural (02 < 10) e bicos pelo número', () => {
        const grupos = agruparPorBomba(pista, false);
        expect(grupos.map((g) => g.bomba.nome)).toEqual(['BOMBA 02', 'BOMBA 10']);
        expect(grupos[0]?.bicos.map((b) => b.numero)).toEqual([3, 4]);
        expect(grupos[0]?.bicos[0]?.combustivel?.codigo).toBe('GC');
        expect(grupos[0]?.bicos[0]?.tanque?.nome).toBe('Tanque GC');
    });

    it('com os desativados, a bomba e o bico inativos aparecem', () => {
        const grupos = agruparPorBomba(pista, true);
        expect(grupos.map((g) => g.bomba.nome)).toEqual(['BOMBA 02', 'BOMBA 03', 'BOMBA 10']);
        expect(grupos[0]?.bicos.map((b) => b.numero)).toEqual([3, 4, 5]);
    });
});

describe('tanquesDoCombustivel', () => {
    it('só os tanques ativos do combustível escolhido', () => {
        const inativo = { ...tanqueGc, id: 11, ativo: false };
        expect(tanquesDoCombustivel([tanqueGc, tanqueEt, inativo], 1)).toEqual([tanqueGc]);
        expect(tanquesDoCombustivel([tanqueGc], null)).toEqual([]);
    });
});

describe('proximoNumeroLivre', () => {
    it('o menor número que nenhum bico ATIVO usa', () => {
        expect(proximoNumeroLivre([])).toBe(1);
        expect(proximoNumeroLivre([bico(1, 1, 1), bico(2, 2, 1), bico(3, 4, 1)])).toBe(3);
        expect(proximoNumeroLivre([bico(1, 1, 1, false)])).toBe(1);
    });
});

describe('corpoDoBico', () => {
    const cheio: FormularioDeBico = { numero: '7', bombaId: 1, combustivelId: 1, tanqueId: 10, ativo: true };

    it('formulário completo vira o corpo da API', () => {
        expect(corpoDoBico(cheio)).toEqual({
            ok: true,
            corpo: { numero: 7, bomba_id: 1, combustivel_id: 1, tanque_id: 10, ativo: true },
        });
    });

    it.each([
        ['número vazio', { numero: '' }],
        ['número zero', { numero: '0' }],
        ['número decimal', { numero: '1.5' }],
        ['sem bomba', { bombaId: null }],
        ['sem combustível', { combustivelId: null }],
        ['sem tanque', { tanqueId: null }],
    ])('%s não vai para a API', (_, troca) => {
        expect(corpoDoBico({ ...cheio, ...troca }).ok).toBe(false);
    });
});

describe('trocaCombustivel', () => {
    const vazio: FormularioDeBico = { numero: '1', bombaId: 1, combustivelId: null, tanqueId: null, ativo: true };

    it('com um tanque só para o combustível, já o escolhe', () => {
        expect(trocaCombustivel(vazio, 2, [tanqueGc, tanqueEt])).toMatchObject({ combustivelId: 2, tanqueId: 20 });
    });

    it('com dois tanques, deixa o gerente escolher', () => {
        const outroGc = { ...tanqueGc, id: 12 };
        expect(trocaCombustivel({ ...vazio, tanqueId: 20 }, 1, [tanqueGc, outroGc])).toMatchObject({ combustivelId: 1, tanqueId: null });
    });
});
