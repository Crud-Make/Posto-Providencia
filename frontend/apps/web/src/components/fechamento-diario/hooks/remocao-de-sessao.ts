/**
 * Remoção de envio de frentista e marca de conferência no modo API — sem ida ao banco na hora.
 *
 * @remarks
 * No caminho do Supabase a lixeira da linha apagava o `FechamentoFrentista` NA HORA
 * (`fechamentoFrentistaService.delete`) e a marca `[CONFERIDO]` era gravada na hora
 * (`fechamentoFrentistaService.update`). Pela API as duas coisas viajam no `PUT /fechamento` do
 * Salvar, que é uma transação só:
 *
 * - a remoção é o `frentistas_conhecidos[]` da DECISÃO (c) do dono (20/09/2026,
 *   `fechamento-diario-api.md` §7): o servidor apaga só quem a tela declarou conhecer e não mandou
 *   de volta. Quem a tela carregou do banco e o gerente tirou precisa continuar declarado — é o que
 *   esta lista guarda. Sem ela, a linha tirada da tela sumia de `sessoes[]` E de
 *   `frentistas_conhecidos[]`, e o servidor não a apagava;
 * - a marca vai em `observacoes` da própria sessão, que o PUT já grava.
 *
 * A lista é do DIA em que a remoção aconteceu: declarar num dia a remoção feita em outro apagaria
 * o envio tardio de um frentista que a tela nunca viu — o defeito que a (c) existe para matar.
 */

/** Frentistas cujas sessões carregadas do banco o gerente tirou da tela, no dia `data`. */
export interface RemocoesDoDia {
    readonly data: string;
    readonly frentistas: readonly number[];
}

export const SEM_REMOCOES: RemocoesDoDia = { data: '', frentistas: [] };

/** Prefixo das sessões que vieram do banco (`useSessoesFrentistas`, `existing-<id>`). */
const PREFIXO_DO_BANCO = 'existing-';

/** Marca de sessão conferida — não há coluna `status` na tabela (ver `useSessoesFrentistas`). */
const MARCA_CONFERIDO = '[CONFERIDO]';

/**
 * Registra a remoção de uma sessão do dia. Só conta sessão que veio do banco e tem frentista:
 * linha semeada (`temp-…`) nunca existiu no servidor, não há o que apagar.
 */
export function registrarRemocao(
    atual: RemocoesDoDia,
    data: string,
    sessao: { readonly tempId: string; readonly frentistaId: number | null } | undefined,
): RemocoesDoDia {
    if (sessao === undefined || sessao.frentistaId === null || !sessao.tempId.startsWith(PREFIXO_DO_BANCO)) {
        return atual;
    }
    const doDia = atual.data === data ? atual.frentistas : [];
    return doDia.includes(sessao.frentistaId) ? atual : { data, frentistas: [...doDia, sessao.frentistaId] };
}

/** As remoções que valem para `data` — vazio quando foram feitas em outro dia. */
export function remocoesDoDia(atual: RemocoesDoDia, data: string): readonly number[] {
    return atual.data === data ? atual.frentistas : [];
}

/** `observacoes` com a marca de conferido, sem duplicá-la (mesma regra do caminho Supabase). */
export function comMarcaDeConferido(observacoes: string | undefined): string {
    const atual = observacoes ?? '';
    return atual.includes(MARCA_CONFERIDO) ? atual : `${MARCA_CONFERIDO} ${atual}`.trim();
}
