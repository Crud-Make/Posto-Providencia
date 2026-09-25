/**
 * Insumos do Relatório Diário — o que a tela lê, venha do Supabase ou da API Laravel.
 *
 * @remarks
 * As duas fontes (`fonte-supabase.ts`, `fonte-da-api.ts`) entregam este MESMO formato, e só
 * `montar-relatorio.ts` faz conta com ele. É o que garante que trocar a fonte não muda número.
 */
import type { ExpenseData } from '../types';

/**
 * Fechamento com os campos necessários para o relatório diário.
 */
export interface FechamentoDiario {
    turno_id?: number | null;
    total_vendas?: number | null;
    diferenca?: number | null;
    /**
     * `'ABERTO'` enquanto o dia não foi consolidado pelo painel, `'FECHADO'` depois.
     *
     * @remarks
     * Campo decisivo, e que este hook ignorava. O PWA cria o `Fechamento` pai com
     * `total_vendas`, `total_recebido` e `diferenca` zerados (`getOrCreateFechamento`)
     * e nunca os atualiza — quem preenche é o passo 5 de `useSubmissaoFechamento`,
     * ao salvar pelo painel. Sem olhar o status, um dia só lançado pelo celular
     * aparecia como "FECHADO" com R$ 0,00 de venda. Medido em 13/08/2026:
     * `status = 'ABERTO'` ⟺ `total_vendas = 0`, em 12 de 12 casos; os 201 FECHADO
     * têm todos o valor preenchido.
     */
    status?: string | null;
    usuario?: {
        nome?: string | null;
    } | null;
}

/**
 * Leitura com os campos necessários para cálculo de volume e lucro.
 */
export interface LeituraDiaria {
    turno_id?: number | null;
    leitura_inicial: number;
    leitura_final: number;
    /** Preço do litro NO DIA da leitura, carimbado na submissão. */
    preco_litro?: number | null;
    /** Venda do bico no dia, gravada na submissão (`litros × preco_litro`). */
    valor_total?: number | null;
    bico?: {
        combustivel?: {
            id?: number;
            preco_venda?: number | null;
        } | null;
    } | null;
}

/** Tudo o que o relatório de UM dia precisa, já recortado ao dia e ao posto. */
export interface InsumosDoRelatorio {
    readonly fechamentos: readonly FechamentoDiario[];
    readonly leituras: readonly LeituraDiaria[];
    /** Só as despesas de competência no dia. */
    readonly despesasDoDia: readonly ExpenseData[];
    /** R$/L da compra do MÊS do dia, por combustível; `null` sem compra (`custo-do-mes.ts`). */
    readonly custoDoMes: (combustivelId: number) => number | null;
}
