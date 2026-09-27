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

## 8. Análise de Custos pela API (#103, 25/09/2026)

Tela `components/analise-custos`, flag **`VITE_API_CUSTOS`** (`corteDaTelaLigado`: ausente segue
`VITE_API_URL`, `0` deixa no Supabase). No modo API a tela **não chama o Supabase** — prova em
`hooks/carregar-analise.test.ts`, com o client do Supabase e os três services mockados para reprovar se tocados.
**Nenhuma rota nova:** tudo o que a tela lê já existia.

| Antes (Supabase, `aggregatorService.fetchProfitabilityData`) | Agora (API) |
|---|---|
| `estoqueService.getAll` — `Estoque` + `combustivel(*)` (lista de produtos, nome, código, preço) | `GET /combustiveis` (catálogo; `Estoque` é 1:1 com `Combustivel` e não tem rota), em ordem de `id` |
| `Leitura` do mês + `bico:Bico(combustivel_id)`, somada no cliente por produto | `GET /dashboard?inicio=aaaa-mm-01&fim=aaaa-mm-último` → `produtos[].litros_vendidos`/`receita` |
| `despesaService.getByMonth` (competência) somada no cliente | `/dashboard` → `rateio.despesas_total` |
| Σ `litros_vendidos` de todas as leituras do mês (divisor do rateio) | `/dashboard` → `rateio.litros_vendidos` |
| `compraService.getByDateRange(mês)` → `custoMedioPorCombustivel` | `/dashboard` → `produtos[].compras` (Σ do mês civil) |

`/dashboard` é `posto.acesso:gerir`: sem token 401, operador 403, gerente de outro posto 403 — já provado
em `AcessoAoDashboardTest`. O catálogo fechou em 26/09 (#102): `posto.acesso` = `ver`, ver `cadastro.md`.

**Contas:** saíram de `aggregator.service.ts` (−135 linhas) para `hooks/montar-analise.ts` **sem mudar
fórmula** (custo da compra do mês, despesa do mês ÷ litros do mês, `lucroCombustivel` em centavos,
produto vendido sem compra fora e nomeado). As fontes `hooks/fonte-supabase.ts` e `hooks/fonte-da-api.ts`
entregam o mesmo `InsumosDaAnalise`; `hooks/carregar-analise.ts` escolhe a fonte e monta. O teste de
PARIDADE compara o resultado inteiro (`toEqual`) sobre o mesmo mês. `montar-analise` entrou na trava
`so-fable-na-formula.py`. O teste de regressão do limite de mês foi junto (`hooks/fonte-supabase.test.ts`).

**Diferenças de forma, não de número:** `item.id` passa a ser o `combustivel_id` nas duas fontes (era o
`Estoque.id`; só serve de `key` do React, e no banco de hoje os dois coincidem); a venda por produto é
agrupada pelo `Leitura.combustivel_id` no servidor e pelo combustível do bico no Supabase (coincidem em
todas as leituras do banco); as somas vêm do Postgres em `numeric` em vez de float no cliente.

**Canários:** forçar o Supabase no modo API → 4 vermelhos; somar R$ 0,01 à despesa na fonte da API → a
PARIDADE vermelha; tirar `montar-analise` da regex do `so-fable-na-formula.py` → `testa-hooks.py` vermelho.

## 9. Registro de Compras pela API (#103, 25/09/2026)

Tela `components/registro-compras`, flag **`VITE_API_FORNECEDOR`** — já era o corte desta tela (o
fornecedor foi a primeira leitura dela a migrar) e `producao.md` a usa com `0` para deixá-la no Supabase.
Uma flag para a tela inteira: ausente segue `VITE_API_URL`, `0` deixa **tudo** no Supabase (inclusive a
despesa, que antes seguia só o `VITE_API_URL` e deixava a tela mista). No modo API a tela **não chama o
Supabase** — prova em `registro-compras-pela-api.test.tsx`, a TELA montada com o client do Supabase num
Proxy que reprova ao ser tocado (lê o mês, digita compra e régua, clica "FINALIZAR COMPRA").

| Antes (Supabase) | Agora (API) | |
|---|---|---|
| `fornecedorService.getAll` | `GET /fornecedores` (já existia) | leitura |
| `combustivelService.getAll` (ativos, `ORDEM_COMBUSTIVEIS`) | `GET /combustiveis` + filtro `ativo` e a mesma ordem no cliente | leitura |
| `tanqueService.getAll` (ativos, por nome) | `GET /tanques` + filtro `ativo === true` | leitura |
| `Leitura` do período com `bico:Bico!inner(id, numero, combustivel_id)` | `GET /movimento` → `leituras` (combustível DO BICO) + `GET /bicos` para o número | leitura |
| `Compra` do período | `GET /movimento` → `compras` | leitura |
| `HistoricoTanque` `data < início`, `volume_fisico` não nulo, desc | `GET /movimento` → `medicoes` (`data ≤ fim`, sem limite inferior) filtradas e ordenadas no cliente | leitura |
| `Despesa` do mês civil (ou `/dashboard` com `VITE_API_URL`) | `GET /dashboard` → `rateio.despesas_total`, pela flag da tela | leitura |
| `compraService.create` → INSERT `Compra` + `estoqueService.update` (`Estoque.quantidade_atual += L`) | `POST /compras` | **escrita** |
| `tanqueService.updateStock` (`Tanque.estoque_atual += L`) | `POST /compras` | **escrita** |
| `tanqueService.saveHistory` (upsert `HistoricoTanque` por `(tanque_id, data)`) | `POST /compras` | **escrita** |

Nenhuma rota de leitura nova. As duas fontes entregam a MESMA `EntradaDoRegistro`
(`hooks/tipos-do-registro.ts`) e a conta saiu do hook para `hooks/montarRegistroDoMes.ts` **sem mudar
uma linha** (encerranteMensal, soma das compras, régua anterior). Paridade em `fonteDoRegistro.test.ts`:
o mesmo mês nas duas formas dá a mesma tela (`toEqual`).

**Rota nova:** `POST /api/postos/{posto}/compras` (módulo novo `App\Compras`, CA-7: Estoque, Tanque,
HistoricoTanque, Fornecedor e Combustivel por query builder). `token.atual` + `DefinePostoAtual` +
`posto.acesso:gerir`, bloco próprio em `routes/api.php`.

```json
{ "chave": "uuid", "data": "2026-09-25", "fornecedor_id": 7,
  "itens": [{ "combustivel_id": 1, "tanque_id": 10,
              "compra": { "quantidade_litros": "1000.000", "valor_total": "5850.50" },
              "volume_livro": "13000", "volume_fisico": "12990" },
            { "combustivel_id": 2, "tanque_id": 11, "compra": null, "volume_livro": "2800.5", "volume_fisico": null }] }
```

Resposta 201 `{ data: { repetido: false, compras: [{ id, combustivel_id, fornecedor_id, data,
quantidade_litros, valor_total, custo_por_litro }], medicoes: [{ tanque_id, data, volume_livro,
volume_fisico }] } }`; a mesma chave com o mesmo corpo → 200 `repetido: true` **sem somar de novo**;
a mesma chave com outro corpo → 409 `chave_reutilizada`; recusa → 422 `{ erro: { codigo, mensagem } }`
(`fornecedor_invalido`, `combustivel_invalido`, `tanque_invalido`, `fora_da_janela`,
`custo_fora_do_limite`, `corpo_invalido` com `campos`).

**Efeitos (porte fiel de `usePersistenciaRegistro` + `compra.service` + `tanque.service`; o esquema não
tem trigger em nenhuma dessas tabelas):** por combustível com litros > 0 — INSERT `Compra` (`data` =
meia-noite UTC, `custo_por_litro` = valor ÷ litros arredondado na 4ª casa, observação "Atualização de
estoque via Painel", `chave_compra`), `Estoque.quantidade_atual += litros` e `ultima_atualizacao = now()`
(sem linha de Estoque, nada; `custo_medio` intocado desde 03/09), `Tanque.estoque_atual += litros`; por
combustível com tanque — upsert `HistoricoTanque` com `volume_livro` e, só quando medido,
`volume_fisico` (sem medição, a régua que o PWA gravou no dia fica). As somas são no próprio `UPDATE`
e o Postgres arredonda na escala da coluna, como arredondava o float do painel. Números provados em
`RegistroDeComprasTest` e conferidos contra o caminho do Supabase (node + psql): 5000 L por R$ 29.175,50
→ custo 5.8351; 3000,555 L por R$ 10.000 → Compra 3000.56 L, custo 3.3327, Estoque 2000.10 → 5000.66;
`volume_livro` "13654.123" → 13654.12.

**O que muda de propósito:** tudo numa transação (o painel gravava combustível a combustível — com a
régua fora da janela, a primeira compra já tinha entrado e o resto falhava); fornecedor, combustível e
tanque têm de ser do posto (e o tanque do combustível), antes não havia trava de posto; a chave de
idempotência (`banco/init/08-compra-pela-api.sql`, `Compra.chave_compra` unique com o combustível, no
CI) segura o duplo clique e a rede que cai depois de gravar. O cliente reusa a chave enquanto os números
não mudam e a troca depois do sucesso.

**Canários (mutação → vermelho → desfeita):** `posto.acesso:gerir` → `posto.acesso` (operador
vermelho); fornecedor sem filtro de posto; tanque sem filtro de posto (teste do tanque alheio apontando
para combustível do posto); janela desligada; `chave_compra` não gravada (4 vermelhos); upsert que
também zera `volume_fisico` (6 vermelhos); `use App\Estoque\...` em `App\Compras` (Pest Arch);
leitura, escrita e despesa forçadas ao Supabase no modo API (Proxy reprova); chave nova a cada clique;
dinheiro sem `emCentavos`; régua do próprio mês tomada como anterior.

**Fica de fora:** gravar `Despesa` não é desta tela (o botão leva ao Fechamento, aba Receitas e
Despesas, que ainda não funciona pela API); editar ou apagar compra lançada não existe na tela — nem
antes, nem agora. Antes do cutover, `08-compra-pela-api.sql` tem de ser aplicado no banco de produção.

## 10. Frentistas (gestão de equipe) pela API (#103, 26/09/2026)

Tela `components/frentistas` ("Gestão de Equipe"), flag própria **`VITE_API_FRENTISTAS`** (ausente
segue `VITE_API_URL`, `0` deixa a tela inteira no Supabase). No modo API a tela **não chama o
Supabase** — nem o canal de tempo real. Prova em `gestao-de-equipe-pela-api.test.tsx`: a TELA montada
com o client do Supabase num Proxy que reprova ao ser tocado, percorrendo listar, filtrar inativos,
abrir o histórico, cadastrar, editar e "Excluir". A escolha da fonte mora em
`hooks/fonteDaEquipe.ts`; os hooks só guardam estado.

| Antes (Supabase) | Agora (API) | |
|---|---|---|
| `Frentista` `select('*').eq('posto_id').order('nome')` (ativos e inativos) | `GET /equipe` | leitura |
| `FechamentoFrentista` + `Fechamento(data, turno:Turno(nome))`, `order id desc limit 30` | `GET /equipe/{id}/historico` + `GET /turnos` (nome do turno) | leitura |
| canal `frentistas_changes_gestao` (`postgres_changes` em `Frentista`) | nenhum — a lista é relida depois de cada gravação | tempo real |
| `frentistaService.create({ nome, data_admissao, ativo, posto_id })` | `POST /equipe` | **escrita** |
| `frentistaService.update(id, { nome, data_admissao, ativo, posto_id })` | `PUT /equipe/{id}` | **escrita** |
| `frentistaService.delete(id)` = `UPDATE ativo = false` (botão "Excluir") | `POST /equipe/{id}/desativar` | **escrita** |

**Rotas novas** (bloco próprio em `routes/api.php`; `token.atual` + `DefinePostoAtual` +
`posto.acesso:gerir` em todas — é dado pessoal e escrita de cadastro; `{id}` só dígitos):

- `GET /api/postos/{posto}/equipe` → `{ data: [{ id, nome, data_admissao: "2025-03-10T00:00:00Z", ativo, foto }] }`,
  ativos e inativos, por nome. **`foto` sai aqui** (rota protegida, a tela mostra o rosto); **CPF e
  telefone não saem** — a tela não os exibe. O catálogo público `GET /frentistas` segue sem foto.
- `POST /api/postos/{posto}/equipe` com `{ nome, data_admissao: "AAAA-MM-DD", ativo: boolean }` → 201
  `{ data: <frentista> }`. `PUT /api/postos/{posto}/equipe/{id}` com o mesmo corpo → 200.
  `nome` é aparado e não pode ser vazio; `ativo` é booleano de JSON (`"true"` e `1` são 422); forma
  errada → 422 `{ erro: { codigo: 'corpo_invalido', mensagem, campos } }`. `posto_id` no corpo é
  ignorado.
- `POST /api/postos/{posto}/equipe/{id}/desativar` → 200 `{ data: <frentista com ativo false> }`.
- `GET /api/postos/{posto}/equipe/{id}/historico` → os 30 envios mais novos, no mesmo item do
  histórico do PWA (`ItemDoHistoricoResource`: `diferenca_calculada` em string decimal,
  `fechamento: { data: "AAAA-MM-DD", turno_id }`). Módulo Fechamento (`HistoricoParaOGerente`).

Frentista de outro posto → **404** (o escopo `PertenceAoPosto` o esconde; o histórico confere
`Frentista.posto_id` por query builder, CA-7).

**Efeitos (porte fiel; a tabela `Frentista` não tem trigger em `01-esquema-base.sql`):** criar grava
nome, admissão (meia-noite UTC — o que o PostgREST gravava de `'AAAA-MM-DD'` numa `timestamptz`) e
status, com CPF, telefone, turno, `user_id` e foto nulos, como o INSERT de hoje; editar grava os mesmos
três campos e **não toca** CPF, telefone, foto, turno nem posto; "Excluir" continua sendo `ativo =
false` (nada é apagado; as FKs de `FechamentoFrentista` etc. seguem intactas).

**O que muda de propósito:**
- o posto é o da ROTA. O UPDATE do Supabase gravava o `posto_id` do corpo — editar pelo painel
  "mudava" o frentista de posto; o histórico do Supabase não filtrava posto. Agora frentista de outro
  posto não é lido nem editável pelo id;
- **desativar derruba as sessões de PIN abertas** do frentista. O `VerificaTokenDoFrentista` já
  recusava token de inativo a cada requisição (teste: desativado por fora → 401 na hora); agora os
  tokens também são apagados, então reativar não ressuscita a sessão de antes — ele entra de novo
  pelo PIN. Cadastro emite `Compartilhado\Eventos\FrentistaDesativado` dentro da transação e
  `Pessoas\Application\DerrubaSessoesDoFrentista` apaga os tokens (síncrono: se falhar, a desativação
  volta). Nenhum módulo conhece o outro (CA-7). O PIN em si fica;
- no modo API a recusa do servidor mantém o formulário aberto e mostra o motivo (no Supabase o
  `ApiResponse` do service nunca foi lido — gravação recusada fechava o modal como sucesso; esse
  caminho ficou **intacto**);
- sem tempo real no modo API ("realtime fica no Laravel", decisão de 21/09): a lista é relida depois de
  cada gravação da própria tela; mudança feita em outra aba só aparece ao recarregar.

**Paridade de exibição mantida, com defeito conhecido:** `data_admissao` e a data do histórico chegam
como meia-noite UTC e a tela faz `new Date(x).toLocaleDateString('pt-BR')`, que em São Paulo mostra
**o dia anterior**. Era assim no Supabase e continua igual (o formulário usa `split('T')[0]` e acerta).
Consertar é mudança de tela, fora desta fatia.

**Canários (mutação → vermelho → desfeita):** ouvinte do `FrentistaDesativado` desligado (2
vermelhos: sessões sobrevivem); `posto.acesso:gerir` → `posto.acesso` (operador vermelho); histórico
sem filtro de posto e edição com `withoutGlobalScope('posto')` (404 do vizinho vermelho);
`boolean:strict` → `boolean` (`ativo: 1` vermelho); canal do Supabase aberto no modo API (Proxy
reprova); flag ignorada (teste do `VITE_API_FRENTISTAS=0` vermelho); `posto_id` no corpo do POST
(corpo exato vermelho); nome do turno fora do histórico.

**⏸ Decisão PENDENTE do dono — não implementada:** quem define o PIN do frentista — só o comando no
servidor (`php artisan frentista:pin`, como hoje) ou uma tela no painel para o gerente. Não há rota nem
tela de PIN nesta fatia; o painel continua sem ver nem mexer no PIN.

**Fica de fora:** CPF, telefone, turno e vínculo com usuário (`user_id`) não estão no formulário — nem
antes, nem agora. Criar frentista não é idempotente (sem chave): o botão fica desabilitado enquanto
grava, como antes; um duplo envio pela rede cria dois cadastros, que se desativa um. Sem esquema novo.

## 11. Tanques (Combustível) pela API (#103, 26/09/2026)

Tela `components/estoque/dashboard` (rota `/estoque/tanques`), flag **`VITE_API_TANQUES`**
(`corteDaTelaLigado`: ausente segue `VITE_API_URL`, `0` deixa **leitura e medição** no Supabase). No modo
API a tela **não chama o Supabase** — prova em `tanques-pela-api.test.tsx`, a TELA montada com o client do
Supabase num Proxy que reprova ao ser tocado (lê, abre a "Nova Medição (Régua)", escolhe o tanque, digita,
confirma e relê).

| Antes (Supabase, `useDashboardEstoque`) | Agora (API) | |
|---|---|---|
| `tanqueService.getAll` — `Tanque` ativo + `combustivel(nome, codigo, preco_venda, preco_custo)`, por nome | `GET /tanques/painel` → `tanques` | leitura |
| `HistoricoTanque` dos tanques, `volume_fisico` não nulo (as réguas da corrente) | → `reguas` | leitura |
| `Compra` do posto, **todas** | → `compras` desde `movimento_desde` | leitura |
| `Leitura` do posto, **todas**, com o combustível do bico (`Bico!inner`) | → `vendas` desde `movimento_desde` | leitura |
| `Despesa` do mês local (competência) | → `despesas` | leitura |
| `tanqueService.getHistory(id, 30)` — uma consulta **por tanque** | → `historico` (uma só) | leitura |
| `tanqueService.saveHistory({ tanque_id, data: hojeIso(), volume_fisico })` (upsert) | `PUT /tanques/medicoes` | **escrita** |

A tela não cria, não edita nem desativa tanque (isso é Configurações), não ajusta estoque à mão e não
grava `volume_livro` — só a régua física. `Tanque.estoque_atual` (o carimbo) não é lido nem escrito: o
estoque exibido é DERIVADO (`model/estoque-derivado.ts`) desde 03/09.

**Rotas novas** (módulo `App\Estoque`, bloco próprio em `routes/api.php`, `token.atual` +
`DefinePostoAtual` + `posto.acesso:gerir` nas duas — a leitura traz `preco_custo` e despesa, dado de
proprietário como o `/dashboard`; a escrita é de quem gere):

`GET /api/postos/{posto}/tanques/painel?mes=AAAA-MM&historico_desde=AAAA-MM-DD` — os dois recortes vêm do
relógio LOCAL do painel, como antes (`hojeIso().slice(0, 7)` e hoje − 30). Corpo sem envelope, decimal em
string, nenhuma conta:

```json
{ "mes": { "inicio": "2026-09-01", "fim": "2026-09-30" }, "movimento_desde": "2026-08-20",
  "tanques": [{ "id": 10, "nome": "T-GC", "combustivel_id": 1, "capacidade": "15000.00",
                "combustivel": { "nome": "Gasolina Comum", "codigo": "GC", "preco_venda": "6.50", "preco_custo": "5.1234" } }],
  "reguas":   [{ "tanque_id": 10, "data": "2026-09-18", "volume_fisico": "8000.50" }],
  "compras":  [{ "combustivel_id": 2, "data": "2026-09-12", "quantidade_litros": "5000.55" }],
  "vendas":   [{ "combustivel_id": 1, "data": "2026-09-20", "litros_vendidos": "333.125" }],
  "despesas": [{ "data": "2026-09-01", "valor": "1500.00" }],
  "historico": [{ "id": 8, "tanque_id": 10, "data": "2026-09-19", "volume_livro": "7900.00", "volume_fisico": null }] }
```

`movimento_desde` = a mais antiga entre as ÚLTIMAS réguas de cada tanque ativo, ou o 1º do mês, o que vier
antes (`MovimentoDosTanques::desde`). É recorte, não conta: cada tanque só soma o que é posterior à própria
régua, e a venda do mês (divisor do rateio) começa no dia 1 — nenhuma linha cortada é lida pela tela. O
Supabase mandava tudo desde sempre (e o PostgREST corta em 1000 linhas por padrão — ver "perguntas").
`Leitura`/`Compra` saem no dia UTC, o mesmo prefixo que a tela comparava no timestamp.

`PUT /api/postos/{posto}/tanques/medicoes` — `{ tanque_id, data: "AAAA-MM-DD", volume_fisico: "12345.678" }`
→ 200 `{ data: { tanque_id, data, volume_fisico: "12345.68" } }`. Recusa: 422 `{ erro: { codigo, mensagem } }`
— `tanque_invalido` (tanque de outro posto), `fora_da_janela`, `corpo_invalido` (número JSON, vírgula,
expoente, negativo, 8+ dígitos inteiros).

**Uma regra de régua só.** O PUT chama `App\Estoque\Application\GravaMedicaoDeTanque`, o MESMO da régua do
PWA (`PUT /regua/medicoes`): upsert por `(tanque_id, data)` que só toca `volume_fisico` (o `volume_livro`
que o Registro de Compras gravou no dia fica), `JanelaDoBanco` e tanque do posto. Muda só a porta (guard do
gerente em vez do do frentista) e o FormRequest (`MedicaoDoPainelRequest`): o painel manda `String(numero)`
— o texto que o `JSON.stringify` do supabase-js mandava — com as casas que o float tiver, e o
`numeric(10,2)` arredonda no banco como antes (`15000.555` → `15000.56`, `1234.5649` → `1234.56`). Até 7
dígitos inteiros, para o arredondamento nunca estourar a coluna. Idempotente por natureza: repetir o mesmo
PUT deixa a mesma linha (provado). O teto da capacidade continua na tela, como antes.

**Contas:** saíram do hook para `hooks/montar-painel.ts` **sem mudar fórmula** (Σ despesas do mês ÷ Σ
litros vendidos no mês por `despesaOperacionalPorLitro`; estoque de cada tanque por
`estoqueAtualDerivado`; "Valor Bruto"/"Lucro Previsto" seguem em `calculos-resumo-financeiro.ts`). As
fontes `hooks/fonte-supabase.ts` (as consultas de antes, movidas) e `hooks/fonte-da-api.ts` entregam o mesmo
`InsumosDoPainel`; `hooks/carregar-painel.ts` escolhe, `hooks/gravar-medicao.ts` grava. PARIDADE em
`hooks/fonte-do-painel.test.ts`: as duas fontes REAIS (Supabase com o builder mockado, API com o `fetch`
mockado), o mesmo posto — com compra e venda antes do corte só no lado do Supabase — dão a mesma tela
(`toEqual`): T-ET 7950,55 L, T-GC 7667,375 L, despesa/L 1750,55 ÷ 383,125. `montar-painel` entrou na trava
`so-fable-na-formula.py`.

**Isolamento** (`TanquesDoPainelTest`, 17 testes): sem token 401 nas duas rotas; operador 403 nas duas;
gerente do posto A no B 403 nas duas, nada gravado; tanque do B pelo posto A 422 `tanque_invalido`; tanque
inativo, régua e histórico dele, leitura/compra/despesa do outro posto fora da resposta (`assertExactJson`).

**Diferenças de forma, não de número:** o histórico vem numa consulta em vez de uma por tanque; a ordem das
compras/vendas/despesas é `data, id` (no Supabase, a física) — só pode mexer no último ulp de uma soma em
float antes do `emCentavos`; na troca de posto a tela recarrega sem o spinner (o React 19 barra `setState`
síncrono no efeito; "Atualizar" e a releitura depois de medir mostram o spinner como antes).

**Canários (mutação → vermelho → desfeita):** listados no relatório da entrega e no `CHANGELOG.md`.

**Fica de fora:** o campo "Observações" do modal nunca foi gravado (nem antes, nem agora — `HistoricoTanque`
não tem a coluna); o botão "Ver Relatório Completo" não faz nada (nem antes). `model/estoque-derivado.ts`
é conta e não está na trava de fórmula (já não estava).
