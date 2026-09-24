import { describe, it, expect } from 'vitest';
import { medicaoDoDiaSchema, medicaoRelidaSchema, tanqueSchema } from './schema';

/**
 * Linhas fixas no formato do PostgREST, montadas a partir de `banco/init/01-esquema-base.sql`
 * (`Tanque` + `Combustivel`, `HistoricoTanque`). Não são cópia de produção.
 */
const TANQUE = { id: 2, combustivel: { nome: 'Gasolina Comum', codigo: 'GC' } };

describe('entities/tanque — schema', () => {
    it('tanque como vem do banco, e com o combustível nulo', () => {
        expect(tanqueSchema.parse(TANQUE)).toEqual(TANQUE);
        expect(tanqueSchema.parse({ id: 2, combustivel: null })).toEqual({ id: 2, combustivel: null });
    });

    it('medição do dia com colunas nuláveis', () => {
        expect(medicaoDoDiaSchema.parse({ tanque_id: 2, volume_fisico: 5000 })).toEqual({ tanque_id: 2, volume_fisico: 5000 });
        expect(medicaoDoDiaSchema.parse({ tanque_id: null, volume_fisico: null })).toEqual({ tanque_id: null, volume_fisico: null });
    });

    it('releitura aceita número, texto ou nulo, sem coagir', () => {
        expect(medicaoRelidaSchema.parse({ volume_fisico: 5000 })).toEqual({ volume_fisico: 5000 });
        expect(medicaoRelidaSchema.parse({ volume_fisico: '5000.00' })).toEqual({ volume_fisico: '5000.00' });
        expect(medicaoRelidaSchema.parse(null)).toBeNull();
    });

    it('não coage: id em texto é recusado', () => {
        expect(tanqueSchema.safeParse({ ...TANQUE, id: '2' }).success).toBe(false);
    });
});
