/**
 * Rascunho local da tela de Fechamento de Caixa.
 *
 * @remarks
 * O rascunho vive no `localStorage` — ou seja, **no navegador, não no banco**.
 * Isso é o que o dono estranhou em 02/08: apagou o mês inteiro no banco, voltou
 * à tela e os valores continuavam lá. Nenhum `DELETE` alcança o navegador.
 *
 * Este módulo é o **dono da chave**. Existe aqui, e não dentro de
 * `fechamento-diario`, porque quem limpa o rascunho é a tela de Configurações —
 * e uma fatia importar da outra seria import lateral (CLAUDE.md §2). Duplicar a
 * string da chave nos dois lugares seria drift garantido: o dia em que ela mudar
 * de um lado, o outro para de limpar em silêncio.
 */

/** Chave do rascunho no `localStorage`, por posto. */
export function chaveRascunhoFechamento(postoId: number): string {
    return `rascunho_fechamento_diario_v1_${postoId}`;
}

/** O que interessa do rascunho para decidir se ele deve morrer. */
interface RascunhoComData {
    dataSelecionada?: string;
}

/**
 * Descarta o rascunho local quando ele pertence ao mês informado.
 *
 * @param postoId - Posto do rascunho.
 * @param mesIso - Mês no formato `aaaa-mm`.
 * @returns `true` se algo foi descartado.
 *
 * @remarks
 * Rascunho de **outro** mês fica intacto: apagar o movimento de junho não pode
 * jogar fora o que o dono está digitando hoje.
 *
 * Falha em silêncio se o `localStorage` estiver indisponível (modo privado,
 * cota estourada). Limpar rascunho é conveniência — não pode derrubar o fluxo de
 * quem acabou de apagar um mês com sucesso.
 */
export function limparRascunhoDoMes(postoId: number, mesIso: string): boolean {
    try {
        const chave = chaveRascunhoFechamento(postoId);
        const bruto = localStorage.getItem(chave);
        if (!bruto) return false;

        const rascunho = JSON.parse(bruto) as RascunhoComData;
        if (!rascunho.dataSelecionada?.startsWith(mesIso)) return false;

        localStorage.removeItem(chave);
        return true;
    } catch {
        return false;
    }
}
