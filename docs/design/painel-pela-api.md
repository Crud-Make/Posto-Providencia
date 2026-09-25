# Painel web pela API — Design Doc

Issue: #103 (mãe: #60) · Estado: **aprovado** (dono, 18/09/2026) · Data: 17/09/2026 · Atualizado: 18/09/2026 (DECISÃO 2: o `AuthContext` não é pré-requisito das fatias — o guard aceita o token atual; ver correção no §3)

> A maior fatia da Fase A. Cada módulo abre sub-issue própria quando chega a vez; este doc é o
> contrato comum às oito.
> Base: levantamento do agente `grafo` em 17/09 (`.claude/agent-memory/grafo/estrutura-dependencias-frontend.md`).

## 0. ⚠️ Correção do número da issue

A issue diz **231 chamadas em 52 arquivos**. São **231 chamadas em 45 arquivos**.

O 52 veio de contar `.from(` sem exigir a aspa — o padrão captura também `Array.from(`. Comando
conferido:

```bash
rg -U -o "\.from\(\s*['\"][A-Za-z_]+['\"]" -g '*.ts' -g '*.tsx' frontend/apps/web/src
# → 231 chamadas em 45 arquivos
```

O texto da issue precisa ser corrigido: planejar 52 arquivos e migrar 45 esconde a conclusão errada
de que sobraram 7.

## 1. O grafo diz que dá para fazer módulo a módulo

Medido em 17/09: **zero ciclo de import**, **zero acoplamento entre apps**, **zero violação de camada
FSD**. E o número que decide: **23 módulos, 21 deles com exatamente um importador externo** — o
`App.tsx`. São ilhas.

Existem **três** acoplamentos entre módulos no painel inteiro, e só **um é de runtime**:

| Acoplamento | Tipo |
|---|---|
| `leituras-diarias/hooks/useLeiturasDiarias.ts:5` → `fechamento-diario/hooks/useLeituras.ts` | **runtime** ⚠️ |
| `financeiro/index.tsx:14-15` → `despesas/…` | import type |
| `fechamento-diario/index.tsx:47` → `fechamento-mensal` | import |

**O primeiro cai exatamente entre os itens 1 e 2 da ordem da issue.** Ou os dois módulos migram
juntos, ou `useLeituras` é extraído antes. Migrar o item 1 sozinho quebra o item 2.

Fora isso, a ordem proposta na issue é compatível com o grafo e fica como está.

## 2. DECISÃO 1 — o adaptador entra em `base.ts`, não em 45 arquivos

`frontend/apps/web/src/services/api/base.ts:5` importa o client do Supabase e exporta
`withPostoFilter`. **11 services entram por ele.** É o ponto de estrangulamento: plantar ali o
adaptador para a API Laravel migra um bloco de uma vez, em vez de 45 edições independentes.

Os outros 30 services importam o client direto (`from '../supabase'`, `from './supabase'`). **Aviso
de método para quem executar:** contar essa fronteira por caminho subconta pela metade — um `rg` por
`services/supabase` devolve 18 dos 41. **Contar pelo símbolo, nunca pelo caminho.**

## 3. DECISÃO 2 — a troca do login acontece aqui, não na #102

Herdado do Design Doc da #102: uma sessão Laravel **não é** JWT do Supabase, e **24 das 103 policies**
do esquema decidem por `auth.role()`. Se o `AuthContext` trocar antes de o painel parar de falar com
o Postgres, o usuário fica autenticado no Laravel e **`anon` no banco** — que é exatamente a janela
do "reset do painel apaga em silêncio".

Então: `frontend/apps/web/src/contexts/AuthContext.tsx` e `contexts/useAuth.ts` trocam **nesta
issue**, junto com a última chamada direta ao Postgres. Nunca antes.

> **Correção de 18/09/2026 (decisão do dono, registrada em `fechamento-diario-api.md` §6, DECISÃO A).**
> O parágrafo acima continua valendo para a **troca de emissor** (Supabase → Laravel): ela fica
> acoplada ao fim das chamadas diretas. O que ele deixava implícito — e a `autenticacao.md:118`
> contradizia — era que, com a API exigindo sessão Sanctum desde a #102, nenhuma fatia migrada
> conseguiria autenticar antes dessa troca: 401 em tudo, inclusive no piloto de fornecedor (§3b).
> **O que passa a valer:** o guard da #102 aceita o token do login atual e resolve o `Usuario` por
> `Usuario.auth_user_id` (`01-esquema-base.sql:510`). O `AuthContext` **não precisa trocar** para
> as fatias migrarem — o token que ele já tem é o que a API aceita; `base.ts` passa a enviá-lo. A
> troca de emissor deixa de ser pré-requisito de qualquer fatia e continua sendo a última, junto
> com a última chamada direta.

Nota de grep herdada do levantamento: procurar só por `AuthContext` **perde 3 dos 4 consumidores** —
eles importam `useAuth`. Buscar pelos dois símbolos.

## 3b. Fatia 0 — piloto do adaptador (aprovada pelo dono em 18/09/2026)

Antes do item 1 da ordem, entra uma fatia que existe só para provar o adaptador de ponta a ponta:
`fornecedorService.getAll` → `GET /api/postos/{posto}/fornecedores` (PR #121). Ela **não conta como
migração do módulo** registro-compras (item 3), que continua na sua vez.

Por que fornecedores: das 9 leituras de catálogo, é a única lida por uma tela (`/compras`) sem conta
de dinheiro e sem mudar o backend. O que ela deixou pronto para as próximas fatias, em `base.ts`:
- `urlDaApi()`: a chave do strangler. Sem `VITE_API_URL` o painel segue no Supabase, e a Vercel não
  define a variável, então a produção não muda até o cutover (#105);
- `buscarNaApi(caminho, schema)`: GET validado com **Zod**, devolvendo `ResultAsync` com erro
  discriminado (`sem_api | rede | http | formato`).

Regra que a fatia 0 expôs e que vale para todas: quando a tela **lê** da API e **grava** no Supabase, os
ids das duas fontes precisam bater. Conferir antes de migrar a leitura.

## 4. Regras da fatia

- **Cálculo não muda de lugar.** Continua em `frontend/packages/utils`. A API devolve dados. Se um
  endpoint precisar calcular, é decisão de Design Doc com golden — como já foi feito na #100, onde a
  resposta foi "devolve dado".
- **`reset.service.ts` e `limpezaMes.service.ts` não ganham endpoint nesta fase.** São destrutivos, a
  issue já os exclui, e há precedente ruim documentado (reset rodando como `anon`, RLS engolindo o
  erro e o app reportando sucesso com zeros). Recomendo manter fora da Fase A inteira, não só desta
  issue. `reset.service.ts:64` é, aliás, a função mais complexa do monorepo (CCN 34).
- **Realtime é a #104** e depende desta: enquanto o painel falar com o Postgres, o canal do Supabase
  continua sendo a fonte do sinal.

## 5. Cuidado com o barril

`frontend/packages/utils/src/index.ts` tem **104 importadores diretos e 205 transitivos, em 4 apps**.
`lucro.ts` tem 11 diretos e **225 transitivos** — porque todo mundo entra pelo barril.

Consequência prática: **mudar assinatura de qualquer módulo de `utils` atravessa os três apps.** Se
uma sub-issue precisar de uma forma nova, ela **acrescenta** função em vez de mudar a existente, e a
antiga sai depois, sozinha.

Os três `types/` somam 134 importadores diretos — acoplamento de tipo, não de runtime, e o mais
barato de resolver.

## 6. Oportunidade: a dívida de complexidade sai junto

Sete dos 13 arquivos listados como dívida em `frontend/.oxlintrc.json` são tocados por esta issue:
`useSubmissaoFechamento.ts` (27), `aggregator.service.ts` (24), `TabelaLeituras.tsx` (25),
`SecaoVendas.tsx` (27), `ValidationAlert.tsx` (29), `planilha-do-mes` (30 e 32), `login/index.tsx` (24).

Reescrever o transporte desses arquivos é o momento natural de tirá-los da lista. **Cada sub-issue
que migrar um deles remove a entrada do `overrides`** — é assim que a catraca aperta sem virar uma
tarefa de refatoração separada que ninguém faz.

## Pronto quando

`rg "\.from\(\s*['\"]" frontend/apps/web/src` vazio; `bun run test` e `bun run test:golden` verdes;
validação módulo a módulo em `localhost:3015` pela skill `validar-feature-posto-providencia`.

## Riscos

- ⚠️ **66 selects têm join embutido** (`usuario:Usuario(id, nome)`). O PostgREST resolve join na
  query; a API Laravel resolve com eager loading. Endpoint que esquecer o `with()` vira N+1 — o §5 do
  CLAUDE.md cobra isso, e a #97 já estabeleceu o padrão.
- ⚠️ `Usuario` **não aparece** num `rg "\.from\('Usuario'"`: entra por select embutido em
  `services/api/fechamento.service.ts` e é renderizado em `relatorio-diario`. Procurar tabela só pelo
  `.from()` produz o falso "ninguém lê essa tabela".
- Auth tem **cobertura de teste zero** hoje. A troca do `AuthContext` desta issue nasce sem rede
  herdada.

## 7. Relatório Diário pela API (#103, 25/09/2026)

Tela `components/relatorio-diario`, flag **`VITE_API_RELATORIO`** (`corteDaTelaLigado`: ausente segue
`VITE_API_URL`, `0` deixa no Supabase). No modo API a tela **não chama o Supabase** — prova em
`hooks/fonte-da-api.test.ts`, com o client do Supabase e os quatro services mockados para reprovar se tocados.

| Antes (Supabase) | Agora (API) |
|---|---|
| `fechamentoService.getByDate` — `Fechamento` do dia + `usuario:Usuario(id, nome)` | `GET /relatorio-diario?data=` → `fechamentos[]` (todas as linhas do dia, com `usuario_nome`) |
| `despesaService.getAll` + filtro `data === dia` no cliente | `GET /relatorio-diario?data=` → `despesas[]` (competência no dia, filtro no banco) |
| `leituraService.getByDate` — `Leitura` + `bico.combustivel(id, preco_venda)` | `GET /leituras?data=` (já existia; combustível pelo `combustivel_id` da leitura) |
| `compraService.getByDateRange(mês civil)` → `custoMedioPorCombustivel` | `GET /dashboard?inicio=dia&fim=dia` → `produtos[].compras` (já soma o mês civil) |

**Rota nova:** `GET /api/postos/{posto}/relatorio-diario?data=AAAA-MM-DD` (`App\Agregacao`:
`RelatorioDiarioController` → `RelatorioDoDia`, query builder, CA-7). Middleware `token.atual` +
`DefinePostoAtual` + `posto.acesso:gerir` — traz despesa e alimenta lucro, dado de proprietário como o
`/dashboard`. Corpo sem envelope:

```json
{ "data": "2026-09-20",
  "fechamentos": [{ "id": 10, "data": "2026-09-20T00:00:00Z", "status": "FECHADO", "total_vendas": "4000.00",
                    "diferenca": "-5.00", "turno_id": null, "usuario_nome": "Ana" }],
  "despesas": [{ "id": 1, "descricao": "Energia", "categoria": "Energia Elétrica", "valor": "150.00",
                 "data": "2026-09-20", "status": "pago", "data_pagamento": "2026-09-20", "observacoes": null }] }
```

Nenhuma conta no servidor. `total_vendas`/`diferenca` `null` ficam `null` (I8). Dia sem movimento é 200
com listas vazias. Sem token 401; operador 403; gerente do Jorro no BR 403; `data` inválida 422
(`RelatorioDiarioTest`).

**Contas:** saíram do hook para `hooks/montar-relatorio.ts` **sem mudar fórmula** (venda a preço
carimbado, lucro bruto a custo do mês, `diferenca` nula = não apurado, status Aberto/Pendente/Fechado).
As duas fontes entregam o mesmo `InsumosDoRelatorio` e o teste de PARIDADE compara o relatório inteiro
(`toEqual`) sobre o mesmo dia. O arquivo entrou na trava `so-fable-na-formula.py`.

**Diferenças de forma, não de número:** o recorte dos fechamentos é o mesmo instante (meia-noite UTC)
do `.eq('data', dia)`, feito no cliente como nas leituras; despesas saem em ordem de `id` (o Supabase
ordenava por `data` desc, que no mesmo dia é a ordem física); `status` da despesa fora de `pago` vira
`pendente` no tipo de UI (a tela não o exibe).

**Canários (cada trava muda → vermelho → desfeita):** tirar o `posto_id` dos fechamentos em
`RelatorioDoDia` → 2 testes vermelhos (vaza o BR); trocar `posto.acesso:gerir` por `posto.acesso` →
o teste do operador vermelho; forçar o Supabase no modo API → 4 vermelhos; tirar o recorte por instante
dos fechamentos → 1 vermelho; ignorar a compra do mês na fonte da API → a PARIDADE vermelha; tirar
`montar-relatorio` da regex do `so-fable-na-formula.py` → `testa-hooks.py` vermelho.
