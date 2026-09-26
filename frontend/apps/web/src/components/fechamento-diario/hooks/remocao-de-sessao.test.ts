import { describe, expect, it } from 'vitest';
import { comMarcaDeConferido, registrarRemocao, remocoesDoDia, SEM_REMOCOES } from './remocao-de-sessao';

describe('remoção de sessão no modo API', () => {
    it('só sessão que veio do banco e tem frentista é registrada', () => {
        const comBanco = registrarRemocao(SEM_REMOCOES, '2026-09-20', { tempId: 'existing-5', frentistaId: 9 });
        expect(comBanco).toEqual({ data: '2026-09-20', frentistas: [9] });

        // Semeada nunca existiu no servidor; sem frentista não há quem apagar; ausente não muda nada.
        expect(registrarRemocao(comBanco, '2026-09-20', { tempId: 'temp-1', frentistaId: 3 })).toBe(comBanco);
        expect(registrarRemocao(comBanco, '2026-09-20', { tempId: 'existing-6', frentistaId: null })).toBe(comBanco);
        expect(registrarRemocao(comBanco, '2026-09-20', undefined)).toBe(comBanco);
    });

    it('não duplica e acumula no mesmo dia', () => {
        const uma = registrarRemocao(SEM_REMOCOES, '2026-09-20', { tempId: 'existing-5', frentistaId: 9 });
        const duas = registrarRemocao(uma, '2026-09-20', { tempId: 'existing-6', frentistaId: 4 });
        expect(registrarRemocao(duas, '2026-09-20', { tempId: 'existing-5', frentistaId: 9 })).toBe(duas);
        expect(remocoesDoDia(duas, '2026-09-20')).toEqual([9, 4]);
    });

    it('remoção de OUTRO dia não vale — declará-la apagaria envio tardio que a tela nunca viu', () => {
        const ontem = registrarRemocao(SEM_REMOCOES, '2026-09-19', { tempId: 'existing-5', frentistaId: 9 });
        expect(remocoesDoDia(ontem, '2026-09-20')).toEqual([]);

        // Remover no dia novo recomeça a lista, não herda a de ontem.
        const hoje = registrarRemocao(ontem, '2026-09-20', { tempId: 'existing-7', frentistaId: 2 });
        expect(hoje).toEqual({ data: '2026-09-20', frentistas: [2] });
    });

    it('a marca de conferido entra uma vez só', () => {
        expect(comMarcaDeConferido(undefined)).toBe('[CONFERIDO]');
        expect(comMarcaDeConferido('troco ok')).toBe('[CONFERIDO] troco ok');
        expect(comMarcaDeConferido('[CONFERIDO] troco ok')).toBe('[CONFERIDO] troco ok');
    });
});
