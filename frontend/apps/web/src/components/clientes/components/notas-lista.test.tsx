import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotasLista } from './NotasLista';
import type { NotaFrentistaComRelacoes } from '../types';

/**
 * O dia da nota vem do banco à meia-noite UTC; `new Date(...).toLocaleDateString` em GMT-3 mostrava o dia
 * ANTERIOR — o mesmo defeito que o #164 tirou da tela de Frentistas. O `bun run test` roda em America/Sao_Paulo.
 */
const nota = (id: number, data: string) => ({
    id, data, valor: 50, status: 'pendente', cliente_id: 1, frentista_id: 1, descricao: null,
} as unknown as NotaFrentistaComRelacoes);

describe('NotasLista', () => {
    it('mostra o dia da nota, não o anterior — data pura e timestamp com offset', () => {
        const html = renderToStaticMarkup(
            <NotasLista notas={[nota(1, '2026-09-27'), nota(2, '2026-09-28T00:00:00+00:00')]} loading={false} onPagamento={() => undefined} />,
        );
        expect(html).toContain('27/09/2026');
        expect(html).toContain('28/09/2026');
        expect(html).not.toContain('26/09/2026');
    });
});
