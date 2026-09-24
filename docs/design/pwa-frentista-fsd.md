# FSD do PWA do frentista

**Módulo:** `frontend/apps/pwa-frentista` · **Branch:** `refactor/pwa-frentista-fsd`
**Trabalho-pai:** #101 (o PWA pela API Laravel) — esta refatoração é a preparação de terreno.
**Estado:** aprovado · P7–P8 implementados; **metade da fatia curta do lote 2 entregue** (`977840b`) · P9–P12 pendentes · **Data:** 19/09/2026 (plano), 24/09/2026 (transcrição, revisada contra medição)
**Idioma:** pt-BR

> Este documento existe porque até 24/09 o plano do lote 2 só vivia no transcript da sessão de 19/09.
> Aqui ele vira fonte de verdade: sobrevive à limpeza do `~/.claude/projects` e serve de contrato
> para quem continuar. Onde o plano de 19/09 e a medição de 24/09 divergirem, **vale a medição**,
> e a divergência está marcada.

---

## 0. Por que este módulo é refatorado

O PWA do frentista é o app que **grava dinheiro real do posto**: o fechamento individual do
frentista, a venda de produto, a régua dos tanques e a presença. Hoje quase tudo mora no legado
fora das camadas FSD: `App.tsx` (784 linhas), `services/api.ts`, `screens/*`, `components/*`,
`lib/*`. O `frontend/eslint.config.mjs` declara esse código fora do `boundaries` "até migrar"
(o elemento `legado`).

O alvo é o mesmo dos outros módulos: `app → pages → widgets → features → entities → shared`,
com regra de negócio devolvendo `Result`, dado externo entrando como `unknown` e passando por
Zod. **Nenhuma fórmula de dinheiro muda nesta refatoração.** O que muda é onde o código mora.

O módulo **não toca o backend**: é só frontend, então o layout `App\<Modulo>\{Http,Application,Domain}`
da Fase 2 não se aplica. A API Laravel do PWA é a issue #101, outro trabalho.

---

## 1. Estado verificado em 24/09/2026

Conferido no filesystem da worktree `pp-pwa-fsd`, não suposto:

| Passo | O que é | Status |
|---|---|---|
| **P7-0** | rebase sobre `origin/fase-a` (PR #126) | ✅ feito — `91593a8` está na ancestralidade do HEAD |
| **P7a** | testes de caracterização (sem mexer em produção) | ✅ feito |
| **P7b** | `shared/config` + `shared/lib` com funções puras | ✅ feito |
| **P7c** | borda `shared/api` com `ResultAsync`, `ErroDeApi`, `assertUnreachable` | ✅ feito |
| **P8** | entities com `ResultAsync` + Zod; `services/api.ts` vira fachada | ✅ feito (`eedb410`) |
| **P9** | `features/enviar-fechamento` | ⛔ **pendente — bloqueado por decisão do dono** |
| **P10** | `widgets/*` + `features/trocar-foto` | ⛔ pendente |
| **P11** | `pages/*`, `app/`, remoção do legado | ⛔ **pendente — bloqueado por decisão do dono** |
| **P12** | ligar as travas pendentes, cada uma com canário | ⛔ pendente |

**Três correções ao plano de 19/09, medidas em 24/09:**

1. `assertUnreachable` **já existe** em `shared/api/erros.ts:39` (entregue pelo P7c). O plano o
   listava como a criar. Consequência prática: adicionar um membro novo à união `ErroDeApi`
   **reprova o `tsc`** no `default` de `paraExcecao`, porque o `assertUnreachable(erro)` exige
   `never`. É a RES-4 funcionando sozinha — não é preciso canário para isso.
2. **O P8 (`eedb410`) não moveu o `lib/foto.ts`** — naquele commit o arquivo continuou em
   `src/lib/foto.ts` com os 3 `TS2532` vivos, apesar de a mensagem prometer o contrário.
   **Resolvido no `977840b`**: a implementação foi para `entities/frentista/lib/foto.ts` (170
   linhas, `ResultAsync`) e `src/lib/foto.ts` virou ponte legada de 42 linhas; a chave
   `lib/foto.ts|TS2532: 3` saiu do `.catraca/tsc.json`. O que resta da pendência 1 da §6 é
   **trocar o import do `App.tsx`**, não mover o arquivo.
3. **O `test:golden` não cobre o PWA.** Não existe nenhum `*.golden.spec.ts` sob
   `apps/pwa-frentista` — os 3296 testes do golden vivem em `packages/utils` e no `apps/web`.
   A rede de segurança real deste módulo é o `App.test.tsx` + `services/api.test.ts`. Isso não
   dispensa o golden na Fase 4 (a regra é rodar todo gate que o módulo toca), mas explica por
   que ele roda em 463 ms e nunca reprovou por causa do PWA.

---

## 2. O que NÃO pode mudar (o contrato do comportamento)

Nada disto muda em nenhum passo. É o que os testes prendem.

- **(a) O payload do envio, byte a byte.** `valor_conferido = conferido(meiosFromPwaPayments(payments))`
  (`App.tsx:434`); `diferenca_calculada = diferenca(encerrante, conferido)` (`:435`); os 7
  `valor_*` via `parseInt(x.replace(/\D/g,''),10)/100 || 0` (`:426-432`); o encerrante via
  `(parseInt(...)||0)/100` (`:351`). **Copiado literalmente**, sem trocar pelo `centavosParaReais`
  (`packages/utils/src/fechamento.ts:272`, que não é exportado).
- **(b)** `getOrCreateFechamento(1, data, 1)` — posto 1, turno canônico.
- **(c)** O `Fechamento` nasce com `total_vendas null`, `total_recebido 0`, `diferenca null`, e é
  reconsolidado **depois** do insert do filho.
- **(d)** `avisarDono` só dispara com `id`, sem `await`, e **nunca lança** — por decisão explícita:
  perder o aviso é melhor que criar envio em dobro.
- **(e)** Um envio por frentista por dia; confirmação de data diferente de hoje, com rearme depois
  de falha e ao trocar a data; a data é restaurada só se gravada hoje; erro ao carregar envios não
  vira "nenhum envio"; abas válidas com fallback `encerrante`; barreira de frentista (Tanques não tem).
- **(f)** Limpeza do formulário e do frentista depois do sucesso; refresh da foto; rótulos
  Tudo certo / Sobra / Quebra.
- **(g)** `VendasScreen`: `valor_total = preco_venda * quantidade` em **float** (`:82`, `:94`),
  carrinho limitado ao estoque. **Dívida conhecida e continua literal.**
- **(h)** `HistoricoScreen`: `diff = diferenca_calculada || 0`, `isFalta = diff > 0` (`:77-79`).
  Também literal.
- **(i)** Conferência anti-RLS da régua (`entities/tanque/api/tanque-api.ts`, no upsert seguido de releitura por `tanque_id`+`data` e `MEDICAO_BARRADA`), presença sem `visto_em`, recorte de
  meia-noite local das vendas.
- **(j)** **Visual idêntico.**

Os itens (a), (b) e (e) têm teste. Os itens (c), (d), (f), (g) e (i) **não têm**, e ganham teste de
caracterização antes de o código se mover (P7a — feito).

---

## 3. As duas decisões do dono que seguram o lote 2

São as duas amarras que impedem P9 e P11 de andar. Nenhuma das duas é técnica.

### Decisão A — as linhas de dinheiro contra a catraca

Medido com `eslint -f json` na worktree em 24/09: dos **12 `strict-boolean-expressions`** do
`App.tsx` (a catraca registra 12 em `.catraca/eslint.json`; eram 14 antes do lote 1),
**8 estão no parse de centavos do payload** (`:351` e `:426-432`, no formato `parseInt(...)/100 || 0`),
e `HistoricoScreen.tsx:77` é `diferenca_calculada || 0`.

A catraca guarda a dívida **pelo caminho do arquivo** (`catraca.mjs:86`). Mover essas linhas para um
caminho novo cria uma **chave nova**, e a chave nova reprova. Duas saídas:

- **(A) Reescrita equivalente** — `n || 0` vira `Number.isNaN(n) ? 0 : n`. É equivalente para todo
  resultado de `parseInt(dígitos)/100`, que nunca é `-0`, e fica provada pela tabela de
  caracterização do P7a mais o payload exato do `App.test.tsx`. **Só Opus 5.5 ou Fable podem
  escrever isso** — o dono barrou edição de fórmula no DeepSeek (trava `so-fable-na-formula`), e o
  hook **cobre** `App.tsx` e `HistoricoScreen.tsx` desde 22/09 (§7, risco 3 — corrigido).
- **(B) `--aceitar-divida`** no caminho novo, dito no PR. Mais barato, mais sujo.

**Sem a decisão A, o `montarPayload` fica no `App.tsx`** e só a `ui` e o `validarEnvio` saem.

### Decisão B — o destino do `services/api.ts`

`App.test.tsx:19` faz `vi.mock('./services/api')` e `:36` faz `await import('./App')`. O teste do
payload exato está preso a esse par. Se a feature importar a entity direto, o mock **deixa de
interceptar** e o teste bate no Supabase real. Duas saídas:

- **(A) Trocar só a string do caminho do mock**, sem tocar em nenhuma asserção. É a coerente com a
  regra do dono "regra de arquitetura não ganha exceção" (memória `regra-de-arquitetura-nao-ganha-excecao`).
- **(B) Manter `services/api.ts` como fachada permanente** — o que fura o FSD e deixa um elemento
  `legado` vivo para sempre.

**Sem a decisão B, o P11 para antes de apagar `services/`.** Até lá, a gravação chega à feature
**por injeção**: a feature recebe as funções da api por parâmetro e o `App` as passa a partir de
`services/api`, para o mock continuar valendo.

---

## 4. Etapas pendentes em detalhe

### P9 — `features/enviar-fechamento` *(bloqueado pela Decisão A)*

Arquivos: `model/montar-payload.ts`, `model/validar-envio.ts`, `ui/{payment-card,resumo-do-turno,botao-enviar}.tsx`,
`index.ts`, mais o `App.tsx`.

- `montarPayload` é **cópia literal** de `App.tsx:421-437` (o `App.tsx` perdeu 48 linhas no lote 1: `eedb410` desceu de 832 para 784).
- `validarEnvio` devolve `Result` com a união
  `{tipo:'sem_frentista'} | {tipo:'encerrante_zero'} | {tipo:'data_nao_confirmada'} | {tipo:'ja_enviado'}`.
- A gravação **não é importada pela feature** (ver Decisão B).
- A exceção de CCN 35 do oxlint continua até o P11.

**Prova:** `App.test.tsx` sem nenhuma alteração, com as asserções `toHaveBeenCalledWith` do payload;
tabela do P7a idêntica; teste unitário de `validarEnvio` por variante da união; golden antes e depois.

### P10 — `widgets/*` + `features/trocar-foto`

Arquivos: `widgets/{seletor-de-frentista,seletor-de-data,envios-do-dia,barra-inferior,dialogo}/`,
`features/trocar-foto/`, `App.tsx`, e os `components/*` que se movem.

Tira do `AppComponent` o `ModalDeFrentistas`, a `ListaDeEnviosDoDia`, o seletor de data (com o
rearme), a barra inferior e a troca de foto (com o refresh). **JSX e classes Tailwind copiados sem
mudança.** Os `try` do `App.tsx` que saem viram `Result` consumido. Leva zerada, no mesmo commit, a
dívida de `App.tsx:82`, `:111`, `:219` e `:238` — condições **não monetárias**, reescrevíveis com
comparação explícita conferida pelo tipo. Em `:267` o `JSON.parse` do localStorage passa pelo schema
Zod e o que falha volta `null`, como hoje.

**Prova:** `App.test.tsx` sem alteração (barreira, abas, data restaurada, rearme); testes do P7a
verdes; conferência visual por screenshot das 4 abas em viewport de celular, antes e depois.

### P11 — `pages/*`, `app/`, remoção do legado *(bloqueado pela Decisão B)*

Arquivos: `pages/{registro,historico,vendas,tanques}/`, `app/{app.tsx,main.tsx,index.ts}`,
`App.tsx` (vira reexport de `app/` para o `import('./App')` do teste), `index.html:30`,
`frontend/.oxlintrc.json` (sai a exceção de CCN 35), `frontend/eslint.config.mjs:100-108` (sai o
strangler), `.catraca/*.json`, e `screens/`, `components/`, `lib/`, `services/` **apagados**.

- Telas vão para `pages` em kebab-case; a dívida do `HistoricoScreen` (6), do `VendasScreen` (2) e o
  `TS2345` do `TanquesScreen` zeram no mesmo commit do `git mv`.
- `HistoricoScreen.tsx:77` e `:103-115` **são dinheiro** e seguem a Decisão A.
- O float de `VendasScreen.tsx:82/:94` e o `diff > 0` de `:79` ficam **literais** — corrigi-los é
  outra tarefa, com golden.

**Prova:** asserções de payload intactas (o diff do teste mostra no máximo a string do mock, na
opção A); `bun run lint` aprova o App sem a exceção de CCN 35; catraca só descendo; `vite build` e
conferência visual das 4 abas.

### P12 — ligar as travas pendentes, cada uma com canário

Ligar, **cada uma com fixture de canário que reprova**:

- **FSD-4** (slice tem `index.ts`)
- **TS-10** (kebab-case no nome de arquivo; `App.tsx`/`App.test.tsx` como exceção medida ou renomeados,
  conforme o P11)
- **TS-7** (`explicit-function-return-type` nas fronteiras exportadas)
- **TS-5** (`require-await`, **medido antes** de ligar)
- Tetos de **300 linhas por arquivo**, **60 por função** e **CCN 10** escopados no `pwa-frentista`,
  depois de medir que o `src` está dentro.
- O `App.test.tsx` (**589 linhas**, medido em 24/09 — este doc dizia 355, número de antes do lote 1) precisa de **exceção de teste decidida pelo dono** ou fica fora do
  escopo da regra.
- Atualizar a coluna "quem faz cumprir" do `docs/arquitetura/regras.md`.

**Prova:** canário por trava (plantar a violação, ver o vermelho, remover);
`python3 .claude/hooks/testa-hooks.py` verde; catraca só descendo.

---

## 5. Gates da Fase 4

```bash
cd frontend && bun run type-check        # catraca do tsc
cd frontend && bun run lint:eslint       # catraca do ESLint (FSD, Public API, neverthrow)
cd frontend && bun run lint              # oxlint
cd frontend && bun run test              # vitest (é a rede REAL deste módulo)
cd frontend && bun run test:golden       # 3296 pass, 463 ms — não cobre o PWA, mas roda
cd frontend && bun run catraca:atualizar # só quando a dívida desceu; commitar .catraca/ junto
cd backend  && composer gates            # o pre-push roda; o módulo não toca o backend
python3 .claude/hooks/testa-hooks.py     # só no P12
```

Regras de leitura que já produziram verde falso neste repo: **canário sempre** (trava que nunca
reprovou não prova nada); catraca **só desce**; `--aceitar-divida` só com decisão do dono, dita no PR;
em worktree, conferir que `node_modules`, `backend/vendor`, `docs/data` e `.env` existem antes.

---

## 6. Fatia curta aprovada em 24/09

Três pendências que **não pedem decisão do dono**, não mexem no payload e não mexem no parse de
dinheiro. Deliberadamente **não** incluem P9 nem P11.

| # | O que | Onde | Por quê |
|---|---|---|---|
| 1 | `lib/foto.ts` → `entities/frentista/lib/foto.ts`, com `ResultAsync` | `src/lib/foto.ts` (95 linhas, 2 `throw`), `src/App.tsx:276-299` | RES-1 no caminho novo; mata 3 `TS2532` |
| 2 | `POSTO_ID` de `shared/config` nas duas telas | `VendasScreen.tsx:46,:101` (`getProdutos(1)`), `TanquesScreen.tsx:18,:47` | `shared/config` já exporta `POSTO_ID = 1`; as telas o ignoram |
| 3 | Schemas de `volume_fisico` espelhando o `CHECK` | `entities/tanque/model/schema.ts` | o `CHECK` exige `>= 0`; o TS não representa |

**Estado entregue em 24/09 — a fatia fechou pela metade, e não por escolha:**

| # | O que entrou | O que ficou |
|---|---|---|
| 1 | `entities/frentista/lib/foto.ts` com `ResultAsync`, os 4 erros, `mensagemDeFoto` e o teste (9 casos); 3 `TS2532` zerados; `src/lib/foto.ts` virou **ponte legada** que preserva o contrato de `throw` | trocar o import do `App.tsx` por `@frentista/entities/frentista` e consumir o `Result` — **barrado pela trava** |
| 2 | `TanquesScreen.tsx` sem o literal `POSTO_ID` | as duas `api.getProdutos(1)` do `VendasScreen.tsx` — **barrado pela trava** |
| 3 | `medicaoParaGravarSchema` + `.nonnegative()` na leitura + validação antes da rede + 11 testes | nada |

**Quem pode escrever cada uma (medido em 24/09, ver §7 risco 3):** o que sobra dos itens 1 e 2 cai sob
o `so-fable-na-formula` — **só Opus 5.5/Fable**, e com o provedor em DeepSeek **nem o subagente com
`model: 'opus'` passa** (a trava lê o transcript, e o provedor reescreve o alias). Destravar exige
`claude-provedor` no Anthropic e sessão nova. O resto — `entities/**` e `TanquesScreen.tsx` — passa em
qualquer modelo.

**Fora do escopo, explicitamente:** os 8 `n || 0` de dinheiro (Decisão A), o destino de
`services/api.ts` (Decisão B), o float de `VendasScreen:82/:94`, o `diff > 0` de `Historico:79`.

**Armadilha do `CHECK` (lida no `banco/init/01-esquema-base.sql`):** os dois predicados **não são
iguais**, e a diferença importa:

- **INSERT** (`:1789`): `tanque_id IS NOT NULL AND volume_fisico IS NOT NULL AND volume_fisico >= 0
  AND dentro_da_janela_de_escrita(data)`
- **UPDATE** (`:1794`): `tanque_id IS NOT NULL AND volume_fisico >= 0 AND dentro_da_janela_de_edicao(data)`

Ou seja: a **escrita** exige `volume_fisico` **não nulo** e `>= 0`, enquanto o `UPDATE` aceita `NULL`
(em SQL um `CHECK` só reprova quando o predicado é **FALSE**; `NULL >= 0` é `NULL`, não `FALSE`).
A coluna é `numeric(10,2)` (`:290`). Consequências para o schema:

- O **payload de escrita** exige `z.number().nonnegative()` **não nulo** — é o que o INSERT cobra.
- A **leitura** de `volume_fisico` continua `.nullable()`, porque apertá-la mudaria comportamento
  sobre linha legada sem prova de que ela não existe. O que se acrescenta é o `.nonnegative()`.
- O teto de `numeric(10,2)` (`99_999_999.99`) é representável e entra. As **casas decimais** não
  entram: `multipleOf(0.01)` é armadilha de ponto flutuante (`1.15 % 0.01 !== 0`), e conferir
  decimal por formatação seria fingir precisão.
- A **janela** (`dentro_da_janela_de_escrita`) **não** é representada no schema: dependeria de
  "hoje", o que tira do schema a pureza. Fica na policy do banco, onde já está.

---

## 7. Riscos e armadilhas

1. **A amarra da catraca nas linhas de dinheiro** (§3, Decisão A) é o risco principal: é ela que
   bloqueia P9 e P11. Mover exige reescrita equivalente ou `--aceitar-divida`, e a reescrita rege
   para Opus 5.5/Fable.
2. **O teste de payload exato está preso ao caminho** do mock. Por isso a gravação chega à feature
   por injeção, a partir de `services/api`, até o P11.
3. ~~**O hook `so-fable-na-formula.py` não cobre `apps/pwa-frentista`**~~ — **CORRIGIDO em 24/09
   pela medição**: o hook **cobre**, e o comentário dele diz que foi este plano que achou o buraco
   em 22/09. A regex `FORMULA` (`so-fable-na-formula.py:46-49`) casa:
   `src/App\.tsx`, `src/features/enviar-fechamento/model/**`, `src/screens/(Historico|Vendas)Screen\.tsx`
   e `src/pages/(historico|vendas)/**`.

   Consequência prática para esta fatia: **as pendências 1 e 2 saíram do alcance do DeepSeek** — a
   edição do `App.tsx` e a do `VendasScreen.tsx` só podem ser escritas por Opus 5.5 ou Fable.
   O que **não** está coberto e segue livre: `screens/TanquesScreen.tsx`, `entities/**`, `widgets/**`,
   `shared/**` e `pages/{registro,tanques}`. Nota para o P10/P11: a `features/trocar-foto` nasce
   **fora** da trava (`features/enviar-fechamento/model` é o único caminho de feature coberto), e o
   `pages/vendas` nasce dentro.

   **A rota que o hook sugere não funciona com o provedor trocado — medido em 24/09.** O hook manda
   "em subagente/workflow: passe `model: 'opus'`", mas com `claude-provedor` apontado para o DeepSeek
   o alias é reescrito pelo provedor: o transcript do subagente registra
   `deepseek/deepseek-v4.1-flash`, que é o campo que `modelo_de()` lê (`:112-162`). Subagente com
   `model: 'opus'` foi despachado e **negado**, com a mesma mensagem. Ou seja: nestas condições,
   destravar exige **trocar o provedor** (Anthropic) e abrir sessão nova — não basta pedir o modelo
   no `Agent`. A ponte de `src/lib/foto.ts` existe exatamente por isso (§6).
4. **O hook `dinheiro-quantiza-por-emcentavos.py`** casa `frontend/apps/*/src` e pode disparar se o
   `VendasScreen` (float em `:82/:94`) for movido. A regra é **parar e registrar, não contornar**.
5. **Colisão com o PR #128** (`feat/#102-guard-token-atual`, tip `3d4553f`) — agora **medida**: o
   fork dos dois branches é `91593a8` (são irmãos, não empilhados), e o #128 reescreve **a mesma
   linha 6** de `docs/architecture.md` (troca a entrada "19/09 #103 P4a/P4b" do topo por "21/09
   #103 P10/P11" + "20/09 #102"). No `regras.md` os *hunks* dele são `@@ -96,11` (CA-3 e CA-7) e
   `@@ -111,7 +111,38` (insere a família **TEN** antes de `## RES`), e os deste trabalho ficam de
   `@@ -118,48` para baixo — o merge deve sair limpo, mas se for resolvido à mão **as duas metades
   têm de sobreviver** (TEN do #128, RES/TS/PROC daqui). Em `.catraca/*.json` não há colisão: as
   edições do #128 são na região do `apps/web` (eslint `~:92`, tsc `~:35`) e as nossas na do
   `pwa-frentista` (eslint `:12-15`, tsc `:9`).

   **Estado do patch de documentação:** o `doc-cycle-onboard` foi rodado sobre os dois lotes em
   24/09 e devolveu patch para `architecture.md`, `regras.md` e este doc. **Só as correções deste
   doc foram aplicadas** (medidas uma a uma). As de `architecture.md` e `regras.md` seguem
   **não aplicadas**: a linha 6 colide com o #128, e as células de `regras.md` afirmam contagens
   que ninguém reconferiu célula por célula. Aplicar depois do rebase, conferindo cada número.
6. **O golden só roda na worktree** porque `docs/data` é symlink para o checkout principal.
   `docs/data` **não pode entrar no índice do git**.
7. **Não há teste visual.** A prova de "visual idêntico" é screenshot antes e depois, por passo.
8. **O pedido original dizia "os pwa", no plural** — este plano cobre só o `pwa-frentista`. O
   `pwa-dono` não foi auditado.
9. **Dívidas que NÃO entram nesta refatoração** (cada uma tarefa própria, com golden):
   `VendaProduto.valor_total` em float sem `emCentavos` (`VendasScreen.tsx:94`); a segunda cópia do
   parse de centavos contra o `centavosParaReais` privado; a decisão de sinal à mão
   (`HistoricoScreen.tsx:79`).

---

## 8. Referências

- `docs/architecture.md` — mapa vivo do sistema.
- `docs/arquitetura/regras.md` — as 38 regras de arquitetura e quem faz cumprir.
- `CLAUDE.md` §0 (trava da refatoração), §5 (CQRS), §6 (Quality Gates), §7 (hooks).
- `frontend/eslint.config.mjs` — elemento `legado`, regras FSD/RES e o `PUBLIC_API` do `@frentista/`.
- `.claude/skills/refactor-module/` — o workflow de 5 fases.
