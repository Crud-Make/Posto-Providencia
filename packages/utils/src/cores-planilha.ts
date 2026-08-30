/**
 * Cores tradicionais dos bicos na planilha do posto.
 *
 * @remarks
 * Lidas do preenchimento das células de rótulo de bico no `.xlsx` (aba de resumo
 * `POSTO JORRO 2026` e abas diárias), em 30/08/2026 — são as mesmas em todas as
 * abas: Gasolina Comum vermelho, Aditivada azul, Etanol verde, Diesel amarelo.
 * Chaveadas pelo `codigo` de `Combustivel` (GC/GA/ET/S10), não pelo id, para
 * valer em qualquer posto com o mesmo cadastro. `Combustivel.cor` no banco
 * carrega outra paleta (dourado/laranja/verde/cinza), que ninguém no posto
 * reconhece — a que o dono lê de relance é a da planilha.
 */
export interface CorBico {
    /** Cor de preenchimento da planilha, em hex. */
    readonly fundo: string;
    /** Cor de texto legível sobre `fundo`. */
    readonly texto: string;
}

const CORES_BICO_PLANILHA: Readonly<Record<string, CorBico>> = {
    GC: { fundo: '#FF0000', texto: '#FFFFFF' },
    GA: { fundo: '#00B0F0', texto: '#FFFFFF' },
    ET: { fundo: '#00FF99', texto: '#064E3B' },
    S10: { fundo: '#FFFF00', texto: '#713F12' },
};

const SEM_COR: CorBico = { fundo: '#94A3B8', texto: '#FFFFFF' };

/** Cor da planilha para o combustível de `codigo`; cinza neutro se não houver. */
export function corDoProduto(codigo: string | null | undefined): CorBico {
    return (codigo && CORES_BICO_PLANILHA[codigo.toUpperCase()]) || SEM_COR;
}

/**
 * Classes Tailwind para dinheiro com sinal, iguais no projeto inteiro:
 * ganho (lucro, sobra) verde; perda (prejuízo, falta, perca) vermelha; zero neutro.
 *
 * @param valor - Número já na convenção "positivo = bom". Para `diferenca` de
 *                caixa (positivo = FALTA) passe o valor NEGADO, ou use
 *                {@link corDaDiferenca}.
 */
export function corDeSinal(valor: number): { readonly texto: string; readonly fundo: string } {
    if (valor > 0) return { texto: 'text-green-600 dark:text-green-400', fundo: 'bg-green-50 dark:bg-green-900/10' };
    if (valor < 0) return { texto: 'text-red-600 dark:text-red-400', fundo: 'bg-red-50 dark:bg-red-900/10' };
    return { texto: 'text-slate-500 dark:text-slate-400', fundo: '' };
}

/**
 * Classes para a `diferenca` de caixa, na convenção do domínio
 * (skill fechamento-posto-providencia): positivo = FALTA (vermelho), negativo = SOBRA (verde).
 */
export function corDaDiferenca(diferenca: number): { readonly texto: string; readonly fundo: string } {
    return corDeSinal(-diferenca);
}
