/**
 * Borda web do módulo canônico de Fechamento (@posto/utils/fechamento).
 *
 * @remarks
 * Converte uma `SessaoFrentista` (valores em string, formato BR) no value object
 * `MeiosPagamento` (reais) esperado pelo módulo. É o único ponto do web que sabe
 * como parsear a UI — os hooks/serviços chamam `cartao`/`conferido`/`diferenca`
 * sobre o resultado, sem reimplementar soma.
 */
import {
    meiosFromFechamentoRow,
    type FechamentoRowNumerico,
    type MeiosPagamento,
} from '@posto/utils';
import type { SessaoFrentista } from '../types/fechamento';
// `paraReais`/`parseValue` vêm de `./formatters` — nunca `analisarValor`, que é o
// parser de encerrante e divide dinheiro por mil.
import { parseValue, paraReais } from './formatters';

/** Constrói {@link MeiosPagamento} a partir de uma `SessaoFrentista` da UI. */
export const meiosDaSessao = (s: SessaoFrentista): MeiosPagamento =>
    meiosFromFechamentoRow({
        valor_dinheiro: parseValue(s.valor_dinheiro),
        valor_moedas: parseValue(s.valor_moedas ?? ''),
        valor_pix: parseValue(s.valor_pix),
        valor_cartao: parseValue(s.valor_cartao),
        valor_cartao_debito: parseValue(s.valor_cartao_debito),
        valor_cartao_credito: parseValue(s.valor_cartao_credito),
        valor_nota: parseValue(s.valor_nota),
        valor_baratao: parseValue(s.valor_baratao),
    });

/**
 * Balde canônico de dinheiro que uma forma de pagamento cadastrada representa.
 *
 * @remarks
 * São os 7 buckets de `conferido()` com o cartão aberto em crédito e débito, que
 * é como o Caixa Geral mostra na tela. `credito + debito` reconstitui `cartao()`.
 */
export type BaldePagamento =
    | 'dinheiro' | 'moedas' | 'pix' | 'credito' | 'debito' | 'nota' | 'baratao';

/** Tira acento e caixa para comparar nome digitado no cadastro. */
const chave = (nome: string): string =>
    nome.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Regras de reconhecimento, **da mais específica para a mais genérica**.
 * A ordem é load-bearing: "cartão de crédito" e "cartão de débito" precisam ser
 * testados antes de qualquer regra que olhe só "cartão".
 */
const REGRAS: readonly (readonly [BaldePagamento, RegExp])[] = [
    ['baratao', /baratao/],
    ['moedas', /moeda/],
    ['credito', /credito/],
    ['debito', /debito/],
    ['pix', /pix/],
    ['dinheiro', /dinheiro|especie/],
    ['nota', /nota|convenio/],
];

/**
 * Descobre qual balde canônico uma forma de pagamento cadastrada alimenta.
 *
 * @param nome - Nome como está em `FormaPagamento.nome`.
 * @returns O balde, ou `null` quando a forma não tem coluna de origem no
 *          fechamento do frentista.
 *
 * @remarks
 * `null` é resposta legítima, não falha: "Vale/Check" e "APP" existem no cadastro
 * e **não** têm valor correspondente no que o frentista envia. O código anterior
 * chutava — casava "Vale/Check" no mesmo ramo do `nota` (o teste era
 * `includes('vale')`) e lançava a nota duas vezes no Caixa Geral. Em 15/06/2026
 * isso somava R$ 2.242,00 a mais, e as moedas e o baratão, sem ramo nenhum,
 * sumiam: o painel fechava em R$ 15.681,58 contra R$ 14.119,81 de verdade.
 *
 * Coberto por `fechamentoMeios.test.ts`; não mexa sem rodar `bun run test`.
 */
export function baldeDaForma(nome: string): BaldePagamento | null {
    const k = chave(nome);
    return REGRAS.find(([, padrao]) => padrao.test(k))?.[0] ?? null;
}

/** Total de cada balde canônico somando todas as sessões do dia, em reais. */
export type TotaisPorBalde = Record<BaldePagamento, number>;

/**
 * Consolida as sessões dos frentistas do dia em total por balde.
 *
 * @remarks
 * A soma dos baldes é **exatamente** `conferido()` das mesmas sessões — é a
 * invariante que o bug violava, e o teste a trava. O cartão legado
 * (`valor_cartao`, o lump lançado direto no painel web) entra no débito porque
 * `cartao()` é aditivo: crédito + débito precisa reconstituir o total de cartão
 * sem sobrar nem faltar.
 */
export function totaisPorBalde(sessoes: readonly SessaoFrentista[]): TotaisPorBalde {
    return totaisDeMeios(sessoes.map(meiosDaSessao));
}

/**
 * Mesma consolidação de {@link totaisPorBalde}, a partir de linhas **numéricas** de
 * `FechamentoFrentista` vindas do banco (sem passar pela UI).
 *
 * @remarks É o caminho da visão mensal: ali as linhas chegam direto do Supabase, já
 *          em número, e não existe `SessaoFrentista` para converter.
 */
export function totaisDasLinhas(linhas: readonly FechamentoRowNumerico[]): TotaisPorBalde {
    return totaisDeMeios(linhas.map(meiosFromFechamentoRow));
}

/**
 * Distribui totais já consolidados sobre as formas de pagamento cadastradas.
 *
 * @param formas - As formas como estão no cadastro, na ordem em que aparecem na tela.
 * @param totais - Saída de {@link totaisPorBalde} / {@link totaisDasLinhas}.
 * @returns A mesma lista, com `valor` preenchido em texto BR (vazio quando zero).
 *
 * @remarks
 * Forma sem balde correspondente ("Vale/Check", "APP") fica **vazia**, não zerada:
 * é a diferença entre "não entrou nada" e "não temos essa informação". Não se
 * inventa valor para forma que o frentista não declara.
 */
export function distribuirNasFormas<T extends { nome: string }>(
    formas: readonly T[],
    totais: TotaisPorBalde
): (T & { valor: string })[] {
    return formas.map((forma) => {
        const balde = baldeDaForma(forma.nome);
        const valor = balde ? totais[balde] : 0;
        return { ...forma, valor: valor > 0 ? paraReais(valor) : '' };
    });
}

/** Campos de uma linha `FechamentoFrentista` do banco que a UI consome. */
export interface LinhaFechamentoFrentista extends FechamentoRowNumerico {
    readonly id?: number;
    readonly frentista_id?: number | null;
    readonly observacoes?: string | null;
    readonly encerrante?: number | null;
    readonly valor_conferido?: number | null;
    readonly data_hora_envio?: string | null;
}

/**
 * Junta as linhas do período numa linha por frentista, somando cada campo.
 *
 * @remarks
 * A tabela de detalhamento monta **uma coluna por linha recebida**. No dia isso dá
 * uma coluna por pessoa, porque cada frentista fecha uma vez. No mês, sem agregar,
 * dava 133 colunas em junho — o mesmo nome repetido trinta vezes, ilegível.
 *
 * Somar aqui não altera nenhum total: os agregados do mês (`totaisDasLinhas`,
 * `conferido`) percorrem os mesmos números, só que agrupados.
 */
export function agruparPorFrentista(
    linhas: readonly LinhaFechamentoFrentista[]
): LinhaFechamentoFrentista[] {
    const CAMPOS = [
        'valor_dinheiro', 'valor_moedas', 'pix', 'valor_pix', 'valor_cartao',
        'valor_cartao_debito', 'valor_cartao_credito', 'valor_nota', 'baratao',
        'valor_baratao', 'encerrante', 'valor_conferido',
    ] as const;

    const porFrentista = new Map<number, Record<string, unknown>>();

    for (const linha of linhas) {
        const chave = linha.frentista_id ?? -1;
        const atual = porFrentista.get(chave);

        if (!atual) {
            porFrentista.set(chave, { ...linha, id: chave });
            continue;
        }

        for (const campo of CAMPOS) {
            const soma = Number(atual[campo] ?? 0) + Number(
                (linha as unknown as Record<string, number | null>)[campo] ?? 0
            );
            if (soma !== 0) atual[campo] = soma;
        }
        // Basta um envio conferido no mês para a pessoa contar como conferida.
        if (linha.observacoes?.includes('[CONFERIDO]')) atual.observacoes = '[CONFERIDO]';
    }

    return [...porFrentista.values()] as LinhaFechamentoFrentista[];
}

/**
 * Converte uma linha do banco na `SessaoFrentista` que a UI manipula.
 *
 * @remarks
 * Existe para a visão mensal reaproveitar **exatamente** os mesmos cálculos da visão
 * diária (`calcularTotaisPagamentos`, `gerarTabelaDetalhamento`), que recebem
 * `SessaoFrentista`. Sem isso, o mês precisaria de uma segunda implementação de cada
 * agregação — e duas implementações da mesma soma é como divergência silenciosa
 * entra em produção.
 *
 * Traduz os três nomes que diferem entre banco e UI: `frentista_id`→`frentistaId`,
 * `baratao`→`valor_baratao`, `encerrante`→`valor_encerrante`.
 */
export function sessaoDaLinha(linha: LinhaFechamentoFrentista, indice: number): SessaoFrentista {
    const txt = (v: number | null | undefined): string => (v ? paraReais(v) : '');

    return {
        tempId: `mes-${linha.id ?? indice}`,
        frentistaId: linha.frentista_id ?? null,
        valor_cartao: txt(linha.valor_cartao),
        valor_cartao_debito: txt(linha.valor_cartao_debito),
        valor_cartao_credito: txt(linha.valor_cartao_credito),
        valor_nota: txt(linha.valor_nota),
        valor_pix: txt(linha.valor_pix),
        valor_dinheiro: txt(linha.valor_dinheiro),
        valor_moedas: txt(linha.valor_moedas),
        valor_baratao: txt(linha.baratao ?? linha.valor_baratao),
        valor_encerrante: txt(linha.encerrante),
        valor_conferido: txt(linha.valor_conferido),
        observacoes: linha.observacoes ?? '',
        status: linha.observacoes?.includes('[CONFERIDO]') ? 'conferido' : 'pendente',
        data_hora_envio: linha.data_hora_envio ?? undefined,
    };
}

/** Núcleo da consolidação: soma os baldes de uma lista de {@link MeiosPagamento}. */
function totaisDeMeios(meios: readonly MeiosPagamento[]): TotaisPorBalde {
    const totais: TotaisPorBalde = {
        dinheiro: 0, moedas: 0, pix: 0, credito: 0, debito: 0, nota: 0, baratao: 0,
    };

    for (const m of meios) {
        totais.dinheiro += m.dinheiro;
        totais.moedas += m.moedas;
        totais.pix += m.pix;
        totais.credito += m.cartaoCredito;
        totais.debito += m.cartaoDebito + m.cartaoLegado;
        totais.nota += m.nota;
        totais.baratao += m.baratao;
    }

    // Quantiza em centavos: soma de reais em float acumula sujeira, e daqui o
    // valor vai direto para um campo que o dono pode salvar como `Recebimento`.
    for (const balde of Object.keys(totais) as BaldePagamento[]) {
        totais[balde] = Math.round(totais[balde] * 100) / 100;
    }

    return totais;
}
