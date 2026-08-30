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
