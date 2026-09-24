import { describe, it, expect } from 'vitest';
import {
    envioDoDiaSchema,
    fechamentoFrentistaPayloadSchema,
    idsDeFechamentoSchema,
    itemDoHistoricoSchema,
    linhaCriadaSchema,
} from './schema';

/**
 * Linhas fixas no formato do PostgREST para os `select` desta entity, montadas a partir de
 * `banco/init/01-esquema-base.sql` (numeric → número JSON; timestamptz → texto ISO; join
 * many-to-one → objeto único). Não são cópia de produção.
 */
const PAYLOAD = {
    fechamento_id: 1, frentista_id: 1, posto_id: 1, encerrante: 1000,
    valor_pix: 300, valor_dinheiro: 700, valor_moedas: 0, baratao: 0, valor_nota: 0,
    valor_cartao_debito: 0, valor_cartao_credito: 0, valor_cartao: 0,
    valor_conferido: 1000, diferenca_calculada: 0, observacoes: 'Fechamento via PWA Frentista',
};

const LINHA_INSERIDA = {
    ...PAYLOAD, id: 812, baratencia: 0, data_hora_envio: '2026-09-22T21:10:04.123456+00:00',
};

const ENVIO = {
    id: 812, frentista_id: 1, valor_conferido: 1000, encerrante: 1000, diferenca_calculada: 0,
    data_hora_envio: '2026-09-22T21:10:04.123456+00:00',
    frentista: { nome: 'Fulano' },
    fechamento: { data: '2026-09-22T00:00:00+00:00', posto_id: 1 },
};

const ITEM_HISTORICO = {
    id: 812, encerrante: 1000, valor_pix: 300, valor_dinheiro: 700, valor_moedas: 0,
    valor_cartao_debito: 0, valor_cartao_credito: 0, valor_nota: 0, baratao: 0,
    diferenca_calculada: 0, valor_conferido: 1000, observacoes: 'Fechamento via PWA Frentista',
    data_hora_envio: '2026-09-22T21:10:04.123456+00:00',
    fechamento: { data: '2026-09-22T00:00:00+00:00', turno_id: 1 },
};

describe('entities/fechamento-frentista — schema', () => {
    it('o payload tem exatamente os 15 campos de sempre', () => {
        expect(Object.keys(fechamentoFrentistaPayloadSchema.shape).sort()).toEqual(Object.keys(PAYLOAD).sort());
        expect(Object.keys(fechamentoFrentistaPayloadSchema.shape)).toHaveLength(15);
        expect(fechamentoFrentistaPayloadSchema.parse(PAYLOAD)).toEqual(PAYLOAD);
    });

    it('a linha inserida volta inteira (não corta colunas), e o id é conferido', () => {
        expect(linhaCriadaSchema.parse(LINHA_INSERIDA)).toEqual(LINHA_INSERIDA);
        expect(linhaCriadaSchema.safeParse({ ...LINHA_INSERIDA, id: null }).success).toBe(false);
    });

    it('ids do Fechamento do dia: lista, vazia ou null', () => {
        expect(idsDeFechamentoSchema.parse([{ id: 5 }])).toEqual([{ id: 5 }]);
        expect(idsDeFechamentoSchema.parse([])).toEqual([]);
        expect(idsDeFechamentoSchema.parse(null)).toBeNull();
    });

    it('envio do dia como vem do banco', () => {
        expect(envioDoDiaSchema.parse(ENVIO)).toEqual(ENVIO);
        expect(envioDoDiaSchema.parse({ ...ENVIO, frentista: null, encerrante: null })).toEqual({ ...ENVIO, frentista: null, encerrante: null });
    });

    it('item do histórico como vem do banco, com meios nulos', () => {
        expect(itemDoHistoricoSchema.parse(ITEM_HISTORICO)).toEqual(ITEM_HISTORICO);
        const nulos = { ...ITEM_HISTORICO, encerrante: null, diferenca_calculada: null, fechamento: null };
        expect(itemDoHistoricoSchema.parse(nulos)).toEqual(nulos);
    });

    it('não coage: valor em texto é recusado', () => {
        expect(itemDoHistoricoSchema.safeParse({ ...ITEM_HISTORICO, valor_pix: '300.00' }).success).toBe(false);
        expect(envioDoDiaSchema.safeParse({ ...ENVIO, valor_conferido: '1000' }).success).toBe(false);
    });
});
