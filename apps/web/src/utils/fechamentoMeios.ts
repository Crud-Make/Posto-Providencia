/**
 * Borda web do módulo canônico de Fechamento (@posto/utils/fechamento).
 *
 * @remarks
 * Converte uma `SessaoFrentista` (valores em string, formato BR) no value object
 * `MeiosPagamento` (reais) esperado pelo módulo. É o único ponto do web que sabe
 * como parsear a UI — os hooks/serviços chamam `cartao`/`conferido`/`diferenca`
 * sobre o resultado, sem reimplementar soma.
 */
import { meiosFromFechamentoRow, type MeiosPagamento } from '@posto/utils';
import type { SessaoFrentista } from '../types/fechamento';
import { parseValue } from './formatters';

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
    const totais: TotaisPorBalde = {
        dinheiro: 0, moedas: 0, pix: 0, credito: 0, debito: 0, nota: 0, baratao: 0,
    };

    for (const s of sessoes) {
        const m = meiosDaSessao(s);
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
