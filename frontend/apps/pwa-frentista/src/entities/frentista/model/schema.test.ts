import { describe, it, expect } from 'vitest';
import { frentistaSchema, listaDeFrentistasSchema } from './schema';

/**
 * Linha fixa no formato que o PostgREST devolve para `select('id, nome, foto')`, montada a
 * partir de `banco/init/01-esquema-base.sql` (não é cópia de linha de produção).
 */
const LINHA = { id: 3, nome: 'Maria das Graças', foto: 'data:image/jpeg;base64,QVZBVEFS' };

describe('entities/frentista — schema', () => {
    it('aceita a linha como vem do banco, sem mudar nada', () => {
        expect(frentistaSchema.parse(LINHA)).toEqual(LINHA);
    });

    it('aceita foto nula (mostra as iniciais)', () => {
        expect(frentistaSchema.parse({ ...LINHA, foto: null })).toEqual({ ...LINHA, foto: null });
    });

    it('lista nula passa (o client pode devolver null)', () => {
        expect(listaDeFrentistasSchema.parse(null)).toBeNull();
    });

    it('não coage: id em texto é recusado', () => {
        expect(frentistaSchema.safeParse({ ...LINHA, id: '3' }).success).toBe(false);
    });

    it('nome nulo é recusado (NOT NULL no banco)', () => {
        expect(frentistaSchema.safeParse({ ...LINHA, nome: null }).success).toBe(false);
    });
});
