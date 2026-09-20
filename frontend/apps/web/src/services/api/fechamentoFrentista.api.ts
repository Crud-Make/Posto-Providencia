import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { FechamentoFrentista } from '../../types/database/index';
import { buscarNaApi, type ErroDaApi } from './base';

/**
 * Decimal em string, como o cast `decimal:2` do Eloquent entrega — o backend nunca manda float
 * (mesmo contrato de `leitura.api.ts`; `SessoesDoDiaTest` prova as aspas no JSON cru). Número
 * cru aqui é resposta fora do contrato, não dado a converter.
 */
const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/**
 * Balde que o frentista pode não ter informado. `null` é resposta legítima e FICA `null` (I8):
 * `null` é "não informou", `'0.00'` é "informou zero". Um `0` cru (número) aqui é o servidor
 * inventando dado — e o schema o recusa como qualquer outro número.
 */
const decimalOuNulo = decimalEmString.nullable();

/**
 * Contrato de `GET /api/postos/{posto}/sessoes?data=AAAA-MM-DD` — espelha
 * `backend/app/Fechamento/Http/Resources/FechamentoFrentistaResource.php`.
 *
 * @remarks
 * Os seis baldes NOT NULL do esquema (`01-esquema-base.sql:241-245,256`) são string sempre; os
 * demais são string ou `null`. `data_hora_envio` chega em ISO 8601 Zulu sem fração
 * (`2026-09-20T14:03:22Z`, `toIso8601ZuluString()` do Carbon). Não há relação aninhada:
 * `frentista` é de `Cadastro` (CA-7) e `fechamento` não sai no Resource.
 */
const sessaoDaApi = z.object({
    id: z.number().int(),
    fechamento_id: z.number().int(),
    frentista_id: z.number().int(),
    valor_dinheiro: decimalEmString,
    valor_cartao: decimalEmString,
    valor_cartao_debito: decimalOuNulo,
    valor_cartao_credito: decimalOuNulo,
    valor_pix: decimalEmString,
    valor_nota: decimalEmString,
    valor_moedas: decimalEmString,
    baratao: decimalOuNulo,
    baratencia: decimalOuNulo,
    valor_conferido: decimalEmString,
    encerrante: decimalOuNulo,
    diferenca_calculada: decimalOuNulo,
    observacoes: z.string().nullable(),
    data_hora_envio: z.string().nullable(),
});

const respostaDeSessoes = z.object({ data: z.array(sessaoDaApi) });

export type SessaoDaApi = z.infer<typeof sessaoDaApi>;

/**
 * Sessão do frentista como o painel a consome: a linha da tabela, sem relação aninhada.
 *
 * @remarks
 * Difere do tipo de domínio `FechamentoFrentista` em três pontos, todos a favor do dado real:
 *
 * - `diferenca` sai: é coluna FANTASMA do tipo — a tabela tem `diferenca_calculada`
 *   (`01-esquema-base.sql:237-256`), e o `select *` do Supabase nunca a devolveu.
 * - `valor_cartao_debito`/`valor_cartao_credito` são `number | null`: o esquema permite `null`
 *   (`:250-251`), o PostgREST o entrega, e `useSessoesFrentistas.ts:187-188` já o trata com
 *   `?? 0`. O tipo de domínio diz `number` e mente.
 * - `data_hora_envio` entra: o carimbo do envio do PWA, que o service do Supabase complementa
 *   por fora do tipo (`fechamentoFrentista.service.ts:35`).
 *
 * `baratencia` é validada no schema e não é carregada: não está no tipo de domínio e nenhum
 * consumidor a lê. Quem precisar amplia este tipo, não o Resource.
 */
export type SessaoDoDia = Omit<FechamentoFrentista, 'diferenca' | 'valor_cartao_debito' | 'valor_cartao_credito'> & {
    valor_cartao_debito: number | null;
    valor_cartao_credito: number | null;
    data_hora_envio: string | null;
};

/**
 * String decimal → número; `null` → `null`.
 *
 * @remarks
 * É a fronteira da I8 no cliente. `Number(null)` é `0`, e `Number(undefined)` é `NaN`: uma
 * conversão distraída transforma "não informou" em "informou zero" sem erro nenhum. Só a string
 * passa pelo `Number()`; o `null` nunca chega perto dele.
 */
function numeroOuNulo(decimal: string | null): number | null {
    return decimal === null ? null : Number(decimal);
}

/**
 * Converte a resposta da API na mesma lista que o Supabase devolve em
 * `fechamentoFrentistaService.getByDate`.
 *
 * @remarks
 * Paridade com a query antiga (`fechamentoFrentista.service.ts:293-338`), campo a campo:
 *
 * - **Nulos (I8).** Balde `null` continua `null`; `'0.00'` vira `0`. O PostgREST entrega
 *   `null` e `0` respectivamente, e é isso que o hook recebe hoje. O `?? 0` que existe no hook
 *   é decisão de TELA (o input mostra R$ 0,00), tomada lá — não aqui, na camada de dado.
 * - **Recorte do dia.** O Supabase acha os `Fechamento` com `data` em
 *   `[AAAA-MM-DDT00:00:00Z, AAAA-MM-DDT23:59:59Z]` e depois os filhos; a API faz o mesmo em
 *   `[00:00Z, +1 dia)` (`SessoesDoDia.php`). A única diferença é o último segundo do dia com
 *   fração (`23:59:59.500Z`), que nenhum escritor grava: PWA e painel gravam `data: 'AAAA-MM-DD'`,
 *   que é meia-noite UTC (`pwa-frentista/services/api.ts:83`, `useSubmissaoFechamento.ts:128`).
 *   Não dá para refazer o recorte no cliente — o Resource não traz `Fechamento.data` — e não é
 *   preciso.
 * - **Ordem.** O Supabase não ordena (`getByDate` não tem `.order()`), e o Postgres devolve na
 *   ordem física, que numa tabela de inserção é a de `id` — a ordem em que os frentistas
 *   enviaram, e a ordem das linhas na tela. A API ordena por `frentista_id`. Reordena-se por
 *   `id`, o mesmo critério de `leitura.api.ts`.
 * - **Números.** Dinheiro chega como string decimal e vira `number` por `Number()`, o mesmo
 *   valor que o PostgREST serializa do `numeric` — sem arredondar, sem escala. `paraReais`
 *   aceita string, mas `agruparPorFrentista` e o tipo de domínio esperam `number`.
 * - **`data_hora_envio`.** Fica como a API manda (`...T14:03:22Z`); o PostgREST mandava
 *   `...T14:03:22.123456+00:00`. Mesmo instante ao segundo, e o único leitor
 *   (`EnviosMobile.tsx:82-83`) mostra hora e minuto.
 * - **Relações.** `frentista` e `fechamento` aninhados não vêm (CA-7); `useSessoesFrentistas`
 *   não os lê. O `aggregator.service.ts`, que lê, segue no Supabase.
 * - `posto_id` não sai no Resource; vem do posto pedido, que é o escopo da própria rota.
 */
export function paraSessoesDoDia(lidas: readonly SessaoDaApi[], postoId: number): SessaoDoDia[] {
    return lidas
        .map((sessao) => ({
            id: sessao.id,
            fechamento_id: sessao.fechamento_id,
            frentista_id: sessao.frentista_id,
            valor_cartao: Number(sessao.valor_cartao),
            valor_cartao_debito: numeroOuNulo(sessao.valor_cartao_debito),
            valor_cartao_credito: numeroOuNulo(sessao.valor_cartao_credito),
            valor_moedas: Number(sessao.valor_moedas),
            valor_dinheiro: Number(sessao.valor_dinheiro),
            valor_pix: Number(sessao.valor_pix),
            valor_nota: Number(sessao.valor_nota),
            valor_conferido: Number(sessao.valor_conferido),
            observacoes: sessao.observacoes,
            posto_id: postoId,
            encerrante: numeroOuNulo(sessao.encerrante),
            diferenca_calculada: numeroOuNulo(sessao.diferenca_calculada),
            baratao: numeroOuNulo(sessao.baratao),
            data_hora_envio: sessao.data_hora_envio,
        }))
        .sort((a, b) => a.id - b.id);
}

/** Sessões dos frentistas do dia (`AAAA-MM-DD`) do posto, lidas da API Laravel. Rota protegida: leva o Bearer da sessão. */
export function lerSessoesDoDiaDaApi(postoId: number, dia: string): ResultAsync<SessaoDoDia[], ErroDaApi> {
    const consulta = new URLSearchParams({ data: dia }).toString();
    return buscarNaApi(`/api/postos/${postoId}/sessoes?${consulta}`, respostaDeSessoes)
        .map((resposta) => paraSessoesDoDia(resposta.data, postoId));
}
