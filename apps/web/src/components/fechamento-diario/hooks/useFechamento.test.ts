import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { SessaoFrentista } from '../../../types/fechamento';
import { useFechamento } from './useFechamento';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * O sinal da diferença de caixa, testado através do hook.
 *
 * @remarks Existe por um defeito real: até 16/08/2026 o hook calculava
 *          `conferido − concentrador`, com JSDoc afirmando o contrário. Como o
 *          valor é gravado em `Fechamento.diferenca`, e os FILHOS da mesma
 *          submissão já usavam a convenção canônica, pai e filho da mesma linha
 *          discordavam do sinal.
 *
 *          O golden `totais-do-dia.golden.spec.ts` cobre a aritmética no módulo.
 *          O que este teste cobre é outra coisa, e é onde o erro morava: a
 *          **ordem dos argumentos** na hora de chamar o módulo. Trocar os dois
 *          continua compilando e continua passando no golden.
 */

/*
 * Os valores vão no formato que a UI produz — com vírgula decimal. Não é
 * capricho: `parseValue` do web é alias de `analisarValor`, o parser de
 * ENCERRANTE, que sem vírgula trata os 3 últimos dígitos como decimais
 * ("900" → 0,90). Escrever o fixture sem vírgula faria este teste medir o
 * parser em vez do sinal, que é o que ele existe para travar.
 */

// Um bico de gasolina a R$ 5,00/L: 200 L vendidos = R$ 1.000,00 no concentrador.
const bicos = [
    {
        id: 1,
        numero: 1,
        combustivel_id: 1,
        combustivel: { id: 1, nome: 'Gasolina Comum', preco_venda: 5, cor: '#f5c239' },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any;

const leituras = { 1: { inicial: '1.000,000', fechamento: '1.200,000' } };

/** Sessão de frentista que entregou `valor` em dinheiro e nada nas outras formas. */
const sessaoComDinheiro = (valor: string): SessaoFrentista =>
    ({
        frentista_id: 1,
        valor_dinheiro: valor,
        valor_moedas: '',
        valor_pix: '',
        valor_cartao: '',
        valor_cartao_debito: '',
        valor_cartao_credito: '',
        valor_nota: '',
        valor_baratao: '',
        valor_encerrante: '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

function renderizar(sessoes: SessaoFrentista[]) {
    const container = document.createElement('div');
    let root: Root | null = null;
    let resultado: ReturnType<typeof useFechamento> | null = null;

    // A sonda entrega o resultado por callback: atribuir a variável de fora de
    // dentro do componente é o que a regra do React Compiler barra no lint.
    function Sonda({ aoCalcular }: { aoCalcular: (r: ReturnType<typeof useFechamento>) => void }) {
        aoCalcular(useFechamento(bicos, leituras, sessoes, []));
        return null;
    }

    act(() => {
        root = createRoot(container);
        root.render(React.createElement(Sonda, { aoCalcular: (r) => { resultado = r; } }));
    });
    act(() => {
        root?.unmount();
    });

    if (!resultado) throw new Error('o hook não devolveu resultado');
    return resultado as ReturnType<typeof useFechamento>;
}

describe('useFechamento — sinal da diferença (§6)', () => {
    it('o concentrador é o que o encerrante e o preço dizem', () => {
        const r = renderizar([sessaoComDinheiro('1.000,00')]);
        expect(r.totalVendas).toBe(1000);
        expect(r.totalLitros).toBe(200);
    });

    it('frentista entregando MENOS que o concentrador é FALTA, positiva', () => {
        // Concentrador 1.000, conferido 900 → faltam 100 no caixa.
        const r = renderizar([sessaoComDinheiro('900,00')]);

        expect(r.totalFrentistas).toBe(900);
        expect(r.diferenca).toBe(100);
        expect(r.diferenca).toBeGreaterThan(0);
    });

    it('frentista entregando MAIS que o concentrador é SOBRA, negativa', () => {
        // Concentrador 1.000, conferido 1.100 → sobraram 100.
        const r = renderizar([sessaoComDinheiro('1.100,00')]);

        expect(r.totalFrentistas).toBe(1100);
        expect(r.diferenca).toBe(-100);
        expect(r.diferenca).toBeLessThan(0);
    });

    it('caixa batido dá diferença zero', () => {
        const r = renderizar([sessaoComDinheiro('1.000,00')]);
        expect(r.diferenca).toBe(0);
    });

    it('soma as sessões antes de comparar, não compara uma a uma', () => {
        // Dois frentistas, 400 + 500 = 900 contra 1.000 → falta de 100.
        const r = renderizar([sessaoComDinheiro('400,00'), sessaoComDinheiro('500,00')]);

        expect(r.totalFrentistas).toBe(900);
        expect(r.diferenca).toBe(100);
    });
});
