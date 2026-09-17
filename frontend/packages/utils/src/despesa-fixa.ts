/**
 * Despesa fixa: quais lançamentos recorrentes ainda faltam num mês.
 *
 * @remarks
 * **"Fixa" significa RECORRENTE, não valor constante.** Medido nos 7 meses de 2026
 * carregados em 02/08: "Paulo" (salário) teve **3 valores distintos** no ano, de
 * R$ 1.626 a R$ 2.200, por reajuste; "Luz" teve **6**, de R$ 280 a R$ 850, porque
 * conta de energia varia por natureza. O que se repete é a **descrição**, não o número.
 *
 * Por isso este módulo **sugere** o valor do lançamento mais recente em vez de impor
 * um valor de cadastro: o dono revisa e ajusta o que mudou antes de salvar. Um valor
 * fixo guardado num molde envelheceria e passaria a divergir do que foi pago de fato —
 * e num sistema que apura lucro, despesa errada vira lucro errado.
 *
 * A chave de recorrência é `descricao` normalizada, e não `id`: cada mês gera uma
 * despesa nova, então não existe "a mesma linha" atravessando meses. O que atravessa
 * é o nome que o dono deu.
 *
 * @module @posto/utils/despesa-fixa
 */

/** Despesa recorrente já lançada em algum mês — serve de molde para o próximo. */
export interface DespesaRecorrente {
    readonly descricao: string;
    readonly categoria: string | null;
    /** Valor do lançamento; vira apenas a SUGESTÃO do mês novo. */
    readonly valor: number;
    /** Data do lançamento, ISO local `aaaa-mm-dd`. */
    readonly data: string;
    readonly categoriaId?: number | null;
}

/** Uma fixa pendente, pronta para virar lançamento do mês alvo. */
export interface FixaPendente {
    readonly descricao: string;
    readonly categoria: string | null;
    /** Valor sugerido — o do lançamento mais recente. O dono pode mudar. */
    readonly valorSugerido: number;
    /** Mês de onde veio a sugestão, `aaaa-mm`. Mostra ao dono o quão velha ela é. */
    readonly referencia: string;
    readonly categoriaId?: number | null;
}

/**
 * Normaliza a descrição para comparar.
 *
 * @remarks A planilha é digitada à mão: "Felip" e "Felip = 01" são a mesma pessoa,
 *          "Sistema." e "Sistema" o mesmo serviço. Comparar cru trataria cada grafia
 *          como uma fixa diferente e lançaria a mesma despesa duas vezes. Isso corta
 *          espaço em excesso, caixa e pontuação de borda — não tenta adivinhar mais
 *          que isso, porque casar "Paulo = 20" com "Paulo = 10" seria errado: são
 *          dias de pagamento distintos que o dono escreve de propósito.
 */
export function chaveDescricao(descricao: string): string {
    return descricao
        .trim()
        .toLocaleLowerCase('pt-BR')
        .replace(/\s+/g, ' ')
        .replace(/[.\s]+$/, '');
}

/**
 * Mantém, para cada descrição, apenas o lançamento **mais recente**.
 *
 * @remarks É o que faz a sugestão acompanhar o reajuste: depois que o salário do
 *          Paulo passou de 2.100 para 2.200, é o 2.200 que deve ser oferecido.
 */
export function molde(recorrentes: readonly DespesaRecorrente[]): DespesaRecorrente[] {
    const maisRecente = new Map<string, DespesaRecorrente>();

    for (const d of recorrentes) {
        const chave = chaveDescricao(d.descricao);
        const atual = maisRecente.get(chave);
        if (!atual || d.data > atual.data) maisRecente.set(chave, d);
    }

    return [...maisRecente.values()].sort((a, b) =>
        a.descricao.localeCompare(b.descricao, 'pt-BR')
    );
}

/**
 * Quais despesas fixas ainda **não foram lançadas** no mês alvo.
 *
 * @param recorrentes - Todas as despesas marcadas como fixas, de qualquer mês.
 * @param jaLancadasNoMes - Descrições que já existem no mês alvo.
 * @param mesAlvo - Mês em ISO local `aaaa-mm`.
 *
 * @returns As pendentes, em ordem alfabética, com o valor do lançamento mais recente
 *          como sugestão. Lista vazia quando o mês já está completo.
 *
 * @remarks Ignora molde cuja referência seja o **próprio mês alvo ou posterior**: sem
 *          isso, relançar um mês já fechado sugeriria o valor dele mesmo, e um mês
 *          futuro contaminaria a sugestão do passado.
 */
export function fixasPendentes(
    recorrentes: readonly DespesaRecorrente[],
    jaLancadasNoMes: readonly string[],
    mesAlvo: string
): FixaPendente[] {
    const lancadas = new Set(jaLancadasNoMes.map(chaveDescricao));
    const anteriores = recorrentes.filter((d) => d.data.slice(0, 7) < mesAlvo);

    return molde(anteriores)
        .filter((d) => !lancadas.has(chaveDescricao(d.descricao)))
        .map((d) => ({
            descricao: d.descricao,
            categoria: d.categoria,
            // Quantiza em centavos por precaução, não por bug observado: o valor
            // vem de `numeric` do Postgres via `Number()`, e uma soma ou média a
            // montante pode entregar 4315.7600000000002. Barato aqui, caro depois —
            // um centavo de sujeira num INSERT não se desfaz.
            valorSugerido: Math.round(d.valor * 100) / 100,
            referencia: d.data.slice(0, 7),
            categoriaId: d.categoriaId ?? null,
        }));
}

/** Soma do que entraria se todas as pendentes fossem lançadas como sugerido. */
export function totalSugerido(pendentes: readonly FixaPendente[]): number {
    return Math.round(pendentes.reduce((acc, p) => acc + p.valorSugerido, 0) * 100) / 100;
}
