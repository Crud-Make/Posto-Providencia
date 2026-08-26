/**
 * Estoque atual de cada tanque, DERIVADO — nunca lido de uma coluna carimbada.
 *
 * @remarks
 * `Tanque.estoque_atual` era um contador que só a tela de compras somava e
 * ninguém subtraía: a venda dava baixa em OUTRA tabela (`Estoque`), e os dois
 * livros divergiam a cada lançamento. Aqui o número sai da mesma regra da
 * corrente que a planilha usa e que `resumoEstoque` já implementa:
 *
 *     estoque_atual = última régua + compras desde a régua − vendas desde a régua
 *
 * A régua é a medição física (`HistoricoTanque.volume_fisico`); compras vêm de
 * `Compra` e vendas de `Leitura`, sempre **depois** da data da régua. Como não
 * há carimbo, não há o que desalinhar: cada `Leitura` salva reduz o tanque na
 * próxima leitura da tela, e uma régua nova zera a conta a partir dela.
 *
 * Coberto por `estoque-derivado.test.ts`; a fórmula em si é a de
 * `@posto/utils/resumo-estoque`, com golden master contra os 7 meses de 2026.
 */
import { resumoEstoque } from '@posto/utils';

/** Última medição física de um tanque. `data` em `YYYY-MM-DD`. */
export interface ReguaTanque {
    readonly tanqueId: number;
    readonly data: string;
    readonly litros: number;
}

/** Movimento de litros de um combustível numa data. `data` em ISO (qualquer precisão). */
export interface MovimentoLitros {
    readonly combustivelId: number;
    readonly data: string;
    readonly litros: number;
}

export interface TanqueParaDerivar {
    readonly id: number;
    readonly combustivelId: number;
}

/**
 * Compara datas pelo prefixo `YYYY-MM-DD`, sem `new Date()`.
 *
 * @remarks Converter o timestamp do banco para horário local escorrega a
 *          leitura um dia para trás (o posto está em GMT-3, o banco grava em
 *          UTC). O prefixo ISO ordena lexicograficamente, e é tudo que se
 *          precisa aqui.
 */
const depoisDe = (iso: string, diaRegua: string): boolean => iso.slice(0, 10) > diaRegua;

/**
 * Estoque atual derivado, por id de tanque.
 *
 * @returns `null` para tanque sem régua alguma — "nunca medido" não é zero, e
 *          mostrar 0 L num tanque que ninguém conferiu seria inventar dado.
 */
export function estoqueAtualDerivado(
    tanques: readonly TanqueParaDerivar[],
    reguas: readonly ReguaTanque[],
    compras: readonly MovimentoLitros[],
    vendas: readonly MovimentoLitros[]
): ReadonlyMap<number, number | null> {
    const resultado = new Map<number, number | null>();

    for (const tanque of tanques) {
        const regua = reguas
            .filter((r) => r.tanqueId === tanque.id)
            .reduce<ReguaTanque | null>((maisRecente, r) =>
                maisRecente === null || r.data > maisRecente.data ? r : maisRecente, null);

        if (regua === null) {
            resultado.set(tanque.id, null);
            continue;
        }

        const somaDesdeRegua = (movimentos: readonly MovimentoLitros[]): number =>
            movimentos
                .filter((m) => m.combustivelId === tanque.combustivelId && depoisDe(m.data, regua.data))
                .reduce((acc, m) => acc + m.litros, 0);

        const { produtos } = resumoEstoque([
            {
                produto: String(tanque.id),
                estoqueAnterior: regua.litros,
                litrosComprados: somaDesdeRegua(compras),
                litrosVendidos: somaDesdeRegua(vendas),
                estoqueMedido: null,
            },
        ]);

        resultado.set(tanque.id, produtos[0].estoqueTeorico);
    }

    return resultado;
}
