import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ModalProduto from './ModalProduto';

/**
 * Reensaio Jorro+BR (30/09/2026): os rótulos do "Novo Produto" não estavam ligados aos campos (sem
 * `htmlFor`/`id`) — o leitor de tela lia só "caixa de texto" e tocar no rótulo não focava o campo.
 */
describe('ModalProduto', () => {
    it('todo campo do formulário tem exatamente um rótulo', () => {
        const raiz = document.createElement('div');
        raiz.innerHTML = renderToStaticMarkup(
            <ModalProduto isOpen onClose={() => undefined} onSave={async () => undefined} editingProduct={null} />,
        );
        document.body.appendChild(raiz);
        const campos = [...raiz.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input[name], select[name], textarea[name]')];

        expect(campos.map((c) => c.name)).toEqual(expect.arrayContaining(['nome', 'preco_custo', 'preco_venda', 'estoque_inicial', 'descricao']));
        for (const campo of campos) expect([campo.name, campo.labels?.length]).toEqual([campo.name, 1]);
        raiz.remove();
    });
});
