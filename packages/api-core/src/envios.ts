/**
 * Acesso aos envios de fechamento dos frentistas.
 *
 * Mora aqui, e não no `services/api.ts` de um app, porque os dois PWAs olham
 * para a mesma lista por motivos diferentes: o frentista para não enviar duas
 * vezes, o dono para conferir quem já fechou. Segue o molde do
 * `criarAcessoEncerrante` — fábrica que recebe o client, sem importar o
 * `supabase` de nenhum app.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Uma linha de `FechamentoFrentista` com o nome do frentista já resolvido.
 *
 * @remarks Os nomes das colunas seguem o BANCO, não a migration de 2025: a
 *          tabela real tem `diferenca_calculada` (e não `diferenca`), e não tem
 *          `total`. O arquivo `20251221_create_mobile_tables.sql` ficou para
 *          trás — conferido no catálogo em 30/08/2026.
 */
export interface EnvioDeFechamento {
    readonly id: number;
    readonly frentista_id: number;
    readonly frentista: { nome: string; foto: string | null } | null;
    readonly valor_conferido: number | null;
    readonly encerrante: number | null;
    /** Positivo = FALTA, negativo = SOBRA (CLAUDE.md §6). */
    readonly diferenca_calculada: number | null;
    readonly data_hora_envio: string | null;
}

export interface AcessoEnvios {
    /** Envios de um dia, do mais antigo para o mais recente. */
    listarDoDia(postoId: number, dataIso: string): Promise<EnvioDeFechamento[]>;
}

export function criarAcessoEnvios(supabase: SupabaseClient): AcessoEnvios {
    return {
        async listarDoDia(postoId, dataIso) {
            // `!inner` no Fechamento é o que permite filtrar por data e posto:
            // `FechamentoFrentista` não guarda nenhum dos dois, eles vivem no pai.
            const { data, error } = await supabase
                .from('FechamentoFrentista')
                .select(`
                    id, frentista_id, valor_conferido, encerrante, diferenca_calculada, data_hora_envio,
                    frentista:Frentista(nome, foto),
                    fechamento:Fechamento!inner(data, posto_id)
                `)
                .eq('fechamento.posto_id', postoId)
                .eq('fechamento.data', dataIso)
                .order('data_hora_envio', { ascending: true });

            if (error) throw new Error(error.message);

            return (data || []) as unknown as EnvioDeFechamento[];
        },
    };
}
