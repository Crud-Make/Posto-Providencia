import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Tanque } from '../types';
import ModalMedicao from './ModalMedicao';

const tanque = {
    id: 1, nome: 'Tanque GC', combustivel_id: 1, capacidade: 20000, estoque_atual: 5000, medido: true,
    combustivel: { nome: 'Gasolina Comum', codigo: 'GC', preco_venda: 6.89, preco_custo: 5.34 },
} as Tanque;

/**
 * Ensaio Jorro+BR (30/09/2026): ✕, Cancelar e Confirmar não tinham `type` e seriam "enviar" se o modal
 * um dia ficasse dentro de um `<form>`. Todo botão do modal é `type="button"`; o ✕ tem nome para leitor de tela.
 */
describe('ModalMedicao', () => {
    const html = renderToStaticMarkup(
        <ModalMedicao
            isOpen onClose={() => undefined} onSave={() => undefined}
            selectedTanque={tanque} setSelectedTanque={() => undefined}
            medicaoValue="" setMedicaoValue={() => undefined}
            medicaoObservacao="" setMedicaoObservacao={() => undefined}
            tanques={[tanque]} saving={false}
        />,
    );

    it('nenhum botão é submit', () => {
        const botoes = html.match(/<button[^>]*>/g) ?? [];
        expect(html).toContain('Cancelar');
        expect(html).toContain('Confirmar Medição');
        expect(botoes.length).toBeGreaterThanOrEqual(3);
        for (const b of botoes) expect(b).toContain('type="button"');
    });

    it('o ✕ se chama "Fechar"', () => {
        expect(html).toContain('aria-label="Fechar"');
    });
});
