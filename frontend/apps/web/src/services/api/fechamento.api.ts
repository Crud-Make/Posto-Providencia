import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { Fechamento, Recebimento } from '../../types/database/index';
import { buscarNaApi, enviarParaApi, type ErroDaApi } from './base';

/**
 * Decimal em string, como o cast `decimal:2` do Eloquent entrega — o backend nunca manda float
 * (mesmo contrato de `leitura.api.ts` e `fechamentoFrentista.api.ts`; `FechamentoDoDiaTest` prova
 * as aspas no JSON cru). Número cru aqui é resposta fora do contrato, não dado a converter.
 */
const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/**
 * Valor que o dia pode não ter apurado. `null` é resposta legítima e FICA `null` (I8): `null` é
 * "ninguém apurou", `'0.00'` é "apurou e deu zero" — o segundo é uma afirmação sobre o dinheiro
 * do posto que ninguém fez. Um `0` cru (número) aqui é o servidor inventando dado, e o schema o
 * recusa como qualquer outro número.
 */
const decimalOuNulo = decimalEmString.nullable();

/**
 * Um recebimento do fechamento — espelha `RecebimentoResource.php`. `forma_pagamento_id` e
 * `maquininha_id` ficam inteiros (são de `Cadastro`, CA-7); `valor` é string decimal.
 */
const recebimentoDaApi = z.object({
    id: z.number().int(),
    fechamento_id: z.number().int(),
    forma_pagamento_id: z.number().int(),
    maquininha_id: z.number().int().nullable(),
    valor: decimalEmString,
    observacoes: z.string().nullable(),
});

/**
 * Contrato de `GET /api/postos/{posto}/fechamento?data=AAAA-MM-DD` — espelha
 * `backend/app/Fechamento/Http/Resources/FechamentoResource.php`.
 *
 * @remarks
 * `total_vendas` e `diferenca` são `null` até o dia ser apurado (I8); `total_recebido` é NOT NULL
 * no esquema (`01-esquema-base.sql:221`) e chega string sempre. `status` é o `.value` do enum
 * `StatusFechamento` do backend, os mesmos três literais do enum do Postgres que o Supabase
 * entrega (`types/database/enums.ts:13`). `data` chega em ISO 8601 Zulu (`toIso8601ZuluString()`).
 * `recebimentos` vem aninhado porque é do mesmo módulo e `Recebimento` não tem `posto_id` (TEN-3):
 * só existe escopado pelo pai. `usuario` NÃO vem (CA-7) — ver `paraFechamentoDoDia`.
 */
const fechamentoDaApi = z.object({
    id: z.number().int(),
    data: z.string(),
    total_vendas: decimalOuNulo,
    total_recebido: decimalEmString,
    diferenca: decimalOuNulo,
    status: z.enum(['RASCUNHO', 'ABERTO', 'FECHADO']),
    observacoes: z.string().nullable(),
    usuario_id: z.number().int(),
    turno_id: z.number().int().nullable(),
    recebimentos: z.array(recebimentoDaApi),
});

/**
 * Dia sem fechamento é **200 com `data: null`**, não 404 (`FechamentoController.php`): "ainda não
 * fecharam este dia" é resposta normal do domínio, e o painel abre em dia vazio o tempo todo. O
 * `null` é valor legítimo do contrato e sai como `Ok(null)`, nunca como `Err`.
 */
const respostaDeFechamento = z.object({ data: fechamentoDaApi.nullable() });

export type FechamentoDaApi = z.infer<typeof fechamentoDaApi>;

/**
 * Recebimento como o painel o consome. `observacoes` entra por cima do tipo de domínio: a coluna
 * existe (`01-esquema-base.sql:443`) e o `select *` do Supabase sempre a devolveu, mas o
 * `RecebimentoTable['Row']` não a declara.
 */
export type RecebimentoDoDia = Recebimento & { observacoes: string | null };

/**
 * O fechamento do dia como o painel o consome: a linha de `Fechamento` com os recebimentos.
 *
 * @remarks
 * Difere do tipo de domínio `Fechamento` a favor do dado real: `turno_id` é `number | null` — o
 * esquema permite `null` (`01-esquema-base.sql:228`), o PostgREST o entrega, e é exatamente o caso
 * que faz o dia poder ter mais de uma linha (o unique é `(data, turno_id)` e `NULL` não colide com
 * `NULL`). O tipo de domínio diz `number` e mente.
 */
export type FechamentoDoDia = Omit<Fechamento, 'turno_id'> & {
    turno_id: number | null;
    recebimentos: RecebimentoDoDia[];
};

/**
 * String decimal → número; `null` → `null`.
 *
 * @remarks
 * É a fronteira da I8 no cliente. `Number(null)` é `0`: uma conversão distraída transforma
 * "ninguém apurou" em "apurou e deu zero" sem erro nenhum. Só a string passa pelo `Number()`;
 * o `null` nunca chega perto dele. Mesma função de `fechamentoFrentista.api.ts`.
 */
function numeroOuNulo(decimal: string | null): number | null {
    return decimal === null ? null : Number(decimal);
}

/**
 * Converte a resposta da API no mesmo objeto que o Supabase devolve em
 * `fechamentoService.getDoDia` + `getWithDetails` (o pai, depois os recebimentos).
 *
 * @remarks
 * Paridade com a query antiga (`fechamento.service.ts:45-60` e `:102-125`), campo a campo:
 *
 * - **Um fechamento, o mais recente.** `getDoDia` ordena por `id` desc e pega 1, porque o dia
 *   pode ter mais de uma linha; `FechamentoDoDia.php` faz o mesmo. A API já entrega o escolhido —
 *   aqui não há o que escolher.
 * - **Nulos (I8).** `total_vendas`/`diferenca` `null` continuam `null`; `'0.00'` vira `0`. O
 *   PostgREST entrega `null` e `0` respectivamente, e é isso que o painel recebe hoje.
 * - **Recorte do dia.** O Supabase acha por igualdade `data = 'AAAA-MM-DD'` (meia-noite UTC); a
 *   API por `[00:00Z, +1 dia)`. Todo escritor grava meia-noite UTC (`useSubmissaoFechamento.ts:128`,
 *   `pwa-frentista/services/api.ts:83`), então a faixa e a igualdade acham as mesmas linhas.
 * - **`status`.** Literal do enum nas duas fontes: o Postgres devolve `'RASCUNHO'` e o Resource
 *   devolve `->value`, que é a mesma string. O schema recusa qualquer outro literal.
 * - **`data`.** Fica como a API manda (`...T00:00:00Z`); o PostgREST mandava
 *   `...T00:00:00+00:00`. Mesmo instante; nenhum consumidor deste caminho a lê.
 * - **Recebimentos.** Nem `Recebimento(*)` do Supabase nem `with('recebimentos')` da API ordenam:
 *   os dois entregam a ordem física. Reordena-se por `id` para o resultado ser determinístico,
 *   como em `fechamentoFrentista.api.ts`. `valor` chega string e vira `number` por `Number()`, o
 *   mesmo valor que o PostgREST serializa do `numeric`. `forma_pagamento`/`maquininha` aninhados
 *   não vêm (CA-7); `usePagamentos` não os lê.
 * - **`usuario`.** `getByDate` do Supabase traz `usuario:Usuario(id, nome)`; `getDoDia` (o caminho
 *   que este adaptador substitui) NÃO traz, e o Resource também não (CA-7). Nada a preservar.
 * - `posto_id` não sai no Resource; vem do posto pedido, que é o escopo da própria rota.
 */
export function paraFechamentoDoDia(lido: FechamentoDaApi, postoId: number): FechamentoDoDia {
    return {
        id: lido.id,
        data: lido.data,
        usuario_id: lido.usuario_id,
        turno_id: lido.turno_id,
        status: lido.status,
        total_vendas: numeroOuNulo(lido.total_vendas),
        total_recebido: Number(lido.total_recebido),
        diferenca: numeroOuNulo(lido.diferenca),
        observacoes: lido.observacoes,
        posto_id: postoId,
        recebimentos: lido.recebimentos
            .map((recebimento) => ({
                id: recebimento.id,
                fechamento_id: recebimento.fechamento_id,
                forma_pagamento_id: recebimento.forma_pagamento_id,
                maquininha_id: recebimento.maquininha_id,
                valor: Number(recebimento.valor),
                observacoes: recebimento.observacoes,
            }))
            .sort((a, b) => a.id - b.id),
    };
}

/**
 * O fechamento do dia (`AAAA-MM-DD`) do posto, com os recebimentos, lido da API Laravel — ou
 * `null` quando o dia ainda não tem fechamento. Rota protegida: leva o Bearer da sessão.
 */
export function lerFechamentoDoDiaDaApi(postoId: number, dia: string): ResultAsync<FechamentoDoDia | null, ErroDaApi> {
    const consulta = new URLSearchParams({ data: dia }).toString();
    return buscarNaApi(`/api/postos/${postoId}/fechamento?${consulta}`, respostaDeFechamento)
        .map((resposta) => (resposta.data === null ? null : paraFechamentoDoDia(resposta.data, postoId)));
}

/*
|--------------------------------------------------------------------------
| PUT /api/postos/{posto}/fechamento?data=AAAA-MM-DD — a escrita do dia (#103 P11)
|--------------------------------------------------------------------------
| O corpo é o espelho TS das rules de `GravaFechamentoDoDiaRequest.php`: dinheiro em string
| decimal com DUAS casas, litros com TRÊS, ids inteiros, listas sempre presentes (podem ser
| vazias), e o par `total_vendas`/`diferenca` ambos null (dia não apurado, I8) ou ambos presentes.
| Número JSON em campo de dinheiro é recusado aqui ANTES de sair — o servidor também recusaria
| (422 corpo_invalido); dois lados do mesmo contrato. A conversão do formato BR da tela para
| esta string acontece no montador (`montarDiaDeclarado`), uma vez, e nunca no PHP.
*/

/** Dinheiro no contrato de escrita: exatamente duas casas. `'1.718,35'` e `600` não passam. */
const dinheiroDeclarado = z.string().regex(/^-?\d+\.\d{2}$/, 'dinheiro fora de string decimal com duas casas');

/** Litros no contrato de escrita: exatamente três casas (`decimal:3` da `Leitura`). */
const litrosDeclarados = z.string().regex(/^-?\d+\.\d{3}$/, 'litros fora de string decimal com três casas');

const leituraDeclarada = z.object({
    bico_id: z.number().int(),
    combustivel_id: z.number().int(),
    leitura_inicial: litrosDeclarados,
    leitura_final: litrosDeclarados,
    litros_vendidos: litrosDeclarados,
    preco_litro: dinheiroDeclarado,
    valor_total: dinheiroDeclarado,
});

/** Os 7 baldes (I2) mais encerrante, conferido e diferença, todos já calculados no cliente. */
const sessaoDeclarada = z.object({
    frentista_id: z.number().int(),
    valor_cartao: dinheiroDeclarado,
    valor_cartao_debito: dinheiroDeclarado,
    valor_cartao_credito: dinheiroDeclarado,
    valor_dinheiro: dinheiroDeclarado,
    valor_moedas: dinheiroDeclarado,
    valor_pix: dinheiroDeclarado,
    valor_nota: dinheiroDeclarado,
    baratao: dinheiroDeclarado,
    encerrante: dinheiroDeclarado,
    valor_conferido: dinheiroDeclarado,
    diferenca_calculada: dinheiroDeclarado,
    observacoes: z.string(),
});

const recebimentoDeclarado = z.object({
    forma_pagamento_id: z.number().int(),
    valor: dinheiroDeclarado,
});

/**
 * `total_vendas` e `diferenca` andam juntos: os dois `null` (não apurado) ou os dois presentes.
 * A CONTA (`diferenca = total_vendas − total_recebido`, exata em centavos) é revalidada no
 * servidor pelo VO `TotaisDeclarados`; aqui só a forma do par.
 */
const totaisDeclarados = z
    .object({
        total_vendas: dinheiroDeclarado.nullable(),
        total_recebido: dinheiroDeclarado,
        diferenca: dinheiroDeclarado.nullable(),
    })
    .refine((t) => (t.total_vendas === null) === (t.diferenca === null), {
        message: 'total_vendas e diferenca andam juntos: os dois null ou os dois presentes',
    });

/** O corpo do PUT. Exportado para o montador provar, por `safeParse`, que produz o contrato. */
export const diaDeclarado = z.object({
    leituras: z.array(leituraDeclarada),
    sessoes: z.array(sessaoDeclarada),
    frentistas_conhecidos: z.array(z.number().int()),
    recebimentos: z.array(recebimentoDeclarado),
    totais: totaisDeclarados,
    observacoes: z.string(),
});

export type DiaDeclarado = z.infer<typeof diaDeclarado>;

/** O PUT sempre devolve o dia gravado: `data` null aqui é resposta fora do contrato. */
const respostaDeFechamentoGravado = z.object({ data: fechamentoDaApi });

/**
 * Grava o dia (`AAAA-MM-DD`) do posto pela API Laravel e devolve o fechamento gravado, no MESMO
 * objeto que `lerFechamentoDoDiaDaApi` entrega — o servidor responde com o shape do GET, então o
 * mapeador é o mesmo. Rota protegida por `posto.acesso:gerir`: leva o Bearer da sessão; sem
 * `gerir` o servidor responde 403, que chega como `{ tipo: 'http', status: 403 }`. Recusa de
 * forma ou de domínio chega como `{ tipo: 'recusado', codigo, mensagem, campos? }`.
 */
export function gravarFechamentoDoDiaNaApi(postoId: number, dia: string, corpo: DiaDeclarado): ResultAsync<FechamentoDoDia, ErroDaApi> {
    const consulta = new URLSearchParams({ data: dia }).toString();
    return enviarParaApi(`/api/postos/${postoId}/fechamento?${consulta}`, 'PUT', corpo, respostaDeFechamentoGravado)
        .map((resposta) => paraFechamentoDoDia(resposta.data, postoId));
}
