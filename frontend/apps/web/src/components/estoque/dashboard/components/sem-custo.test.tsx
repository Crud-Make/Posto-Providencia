import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Tanque } from '../types';
import { faltaCusto } from './calculos-resumo-financeiro';
import ResumoFinanceiro from './ResumoFinanceiro';
import TabelaResumo from './TabelaResumo';

/**
 * Ensaio Jorro+BR (30/09/2026): o BR tinha custo 0 e os Tanques mostravam R$ 34.450 de "lucro previsto" —
 * a venda inteira. Tanque com litros e sem custo mostra "Falta o custo", nunca um número inventado.
 */
const tanque = (id: number, estoque: number, custo: number | null, venda = 6.89): Tanque => ({
    id, nome: `Tanque ${id}`, combustivel_id: id, capacidade: 10000, estoque_atual: estoque, medido: true,
    combustivel: { nome: `Comb ${id}`, codigo: `C${id}`, preco_venda: venda, preco_custo: custo },
} as Tanque);

describe('faltaCusto', () => {
    it('custo 0 ou null com litros no tanque = falta o custo', () => {
        expect(faltaCusto(tanque(1, 5000, 0))).toBe(true);
        expect(faltaCusto(tanque(1, 5000, null))).toBe(true);
    });

    it('custo informado, ou tanque vazio, não falta', () => {
        expect(faltaCusto(tanque(1, 5000, 5.34))).toBe(false);
        expect(faltaCusto(tanque(1, 0, 0))).toBe(false);
    });
});

describe('Tanques na tela', () => {
    it('um tanque sem custo derruba os dois totais do card para "Falta o custo"', () => {
        const html = renderToStaticMarkup(<ResumoFinanceiro tanques={[tanque(1, 5000, 0), tanque(2, 1000, 5)]} despesaLitro={0} />);
        expect(html.match(/Falta o custo/g)).toHaveLength(2);
        expect(html).not.toContain('R$');
    });

    it('com custo, o card mostra o lucro canônico (venda − custo − despesa/L)', () => {
        const html = renderToStaticMarkup(<ResumoFinanceiro tanques={[tanque(1, 1000, 5, 7)]} despesaLitro={0.5} />);
        expect(html).toContain('R$ 1.500,00');
        expect(html).toContain('R$ 5.000,00');
    });

    it('a linha da tabela usa a MESMA conta do card (desconta a despesa/L) e marca o tanque sem custo', () => {
        const html = renderToStaticMarkup(<TabelaResumo tanques={[tanque(1, 1000, 5, 7), tanque(2, 500, 0)]} despesaLitro={0.5} />);
        expect(html).toContain('R$ 1.500,00');
        expect(html).not.toContain('R$ 2.000,00');
        expect(html).toContain('Falta o custo');
    });
});
