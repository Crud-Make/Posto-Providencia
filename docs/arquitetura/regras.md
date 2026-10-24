# Registro de Regras de Arquitetura

> **Fonte das regras de arquitetura:** notebook **"Arquitetura de software"** no NotebookLM
> (36 fontes — FSD, Clean Architecture/DDD, Result Pattern, typescript-eslint com type
> information). **Fonte das regras de domínio:** a planilha real do posto e a skill
> `fechamento-posto-providencia`.
>
> **Medido em 17/09/2026.** Toda coluna "Trava" deste arquivo foi verificada rodando a
> ferramenta, não lendo documentação.

---

## Por que este arquivo existe

Em 17/09/2026 mediu-se o seguinte no repositório:

- O gate de complexidade do frontend estava configurado num arquivo **não versionado**.
  Passava verde no CI porque **nunca rodou** — o CI clonava um repo sem o arquivo.
- O `deptrac.yaml` ganhou `Http → Domain` com a restrição real ("escrita passa por
  Application") escrita **num comentário de YAML**, que nenhuma ferramenta lê.
- O `CLAUDE.md` 4.0 **removeu** as regras de frontend que o 3.3 tinha (FSD, `enum`, `any`,
  dinheiro em `packages/utils`). O código continuou obedecendo — por hábito, não por trava.

O modo de falha é sempre o mesmo e é pior que não ter regra nenhuma: **o verde do CI é
indistinguível entre "o gate aprovou" e "o gate não existe"**.

Este arquivo existe para que nenhuma regra volte a ser invisível. A coluna que importa
não é a regra — é **quem a faz cumprir**.

## Legenda de estado

| | significado |
|---|---|
| ✅ **ATIVA** | a trava existe, roda, e bloqueia em todo caminho de entrada |
| ⚠️ **PARCIAL** | a trava existe mas só bloqueia num caminho (só CI, ou só local) |
| ❌ **SEM TRAVA** | é texto. Nada impede a violação de entrar |
| 🔜 **DECIDIDA** | ferramenta escolhida e registrada aqui, ainda não instalada |

## Como uma regra entra neste arquivo

1. Toda regra tem **ID**, **uma frase verificável** e uma **origem** citável.
2. Toda regra declara sua trava, **ou fica marcada ❌ SEM TRAVA**. Não existe estado
   intermediário silencioso — regra sem dono é dívida visível, não regra.
3. Regra mecanizável que fica ❌ por mais de um ciclo vira issue.
4. **Toda trava precisa de um canário**: um caso que a viola de propósito e que deve
   fazer a trava falhar. O padrão já existe em `.claude/hooks/testa-hooks.py`. Gate que
   nunca foi visto reprovando não conta como ativo.

---

## DOM — Domínio: dinheiro

A régua de aceite do sistema: **se o cálculo e o envio batem com o Laravel, o sistema está OK.**
Estas regras existem para proteger essa igualdade.

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| DOM-1 | Nenhuma fórmula de dinheiro muda sem golden master rodando | `bun run test:golden` | `scripts/hooks/pre-push` | ⚠️ PARCIAL — **o CI não roda o golden** (depende de `docs/data/`, gitignored). A trava existe só na máquina do dono |
| DOM-2 | Cálculo de domínio mora em `frontend/packages/utils` | — | — | ❌ SEM TRAVA — 8 módulos de fórmula vivem fora hoje, 3 sem golden |
| DOM-3 | Saída de fórmula é quantizada por `emCentavos` | — | — | ❌ SEM TRAVA — `Math.round(x*100)/100` reescrito à mão em 5 lugares |
| DOM-4 | `diferenca = concentrador − conferido` | golden | `packages/utils/*.golden.spec.ts` | ✅ ATIVA |
| DOM-5 | Regra de negócio vem da skill `fechamento-posto-providencia`, não de intuição | — | — | ❌ SEM TRAVA — por natureza; é regra de processo humano |
| DOM-6 | Taxa de cartão é despesa do mês, nunca deduzida por transação | — | — | ❌ SEM TRAVA — violada em 3 sítios (`usePagamentos.ts:163,173`, `useFechamento.ts:157`) |

> **DOM-1 é a regra mais importante do repositório e a mais frágil.** Ela não roda no CI.
> Tornar o golden executável no CI (fixture mínima versionada, sem dado real do posto)
> é o único item desta tabela que protege dinheiro em todo caminho de entrada.

## FSD — Feature-Sliced Design (frontend)

Origem: *Feature-Sliced Design and good frontend architecture* (codecentric), *Clean
Architecture in Frontend* (FSD), *10 TypeScript Best Practices for Scalable Apps*.

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| FSD-1 | Camadas em ordem estrita: `app → pages → widgets → features → entities → shared`. Import só desce, nunca sobe | `eslint-plugin-boundaries` (`boundaries/element-types`) | — | 🔜 DECIDIDA — plugin não instalado. Hoje há **1** violação em 345 arquivos (`shared/ui/PostoSelector.tsx:3` importa `contexts/`) |
| FSD-2 | Slices da mesma camada não se importam | `boundaries/element-types` | — | 🔜 DECIDIDA — hoje: 0 violações |
| FSD-3 | Slice só exporta pelo `index.ts`; import de caminho interno de outro slice é proibido | `boundaries/entry-point` | — | 🔜 DECIDIDA — hoje: 0 violações |
| FSD-4 | Estrutura física dos slices (todo slice tem `index.ts`) | `steiger` (CLI) | — | 🔜 DECIDIDA |
| FSD-5 | Os 3 apps (`web`, `pwa-frentista`, `pwa-dono`) não se importam | — | — | ❌ SEM TRAVA — hoje: 0 violações reais |
| FSD-6 | Import por alias `@/`, não relativo profundo (`../../../`) | — | — | ❌ SEM TRAVA — 198 linhas com 3+ níveis; o alias existe e só 8 de 345 arquivos o usam |

> **Dívida declarada, não bagunça:** `apps/web` tem **307 arquivos no mundo legado**
> (`components/`, `services/`, `types/`, `utils/`, `contexts/`) contra **36 no mundo FSD**
> (`widgets/`, `shared/`, `pages/`). A migração é **strangler, nunca big-bang** — regra
> que existia no `CLAUDE.md` 3.3 e sumiu no 4.0. `git mv` em massa destrói o `git blame`
> de que a auditoria de dado real depende. **Travar FSD-1..4 só nas pastas FSD** e deixar
> o legado fora do escopo do linter é o caminho; o legado migra fatia a fatia.

## CA — Clean Architecture e camadas

Origem: *domain-driven-hexagon* (Sairyss), *Clean architecture with TypeScript: DDD, Onion*
(Bazaglia), *clean-domain-driven*, Design Doc `docs/design/fase-a-laravel.md §2`.

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| CA-1 | Backend: `Http → Application → Domain → Compartilhado`. Camada interna nunca conhece a externa | `deptrac` via `composer gates` | `backend/deptrac.yaml` | ✅ ATIVA — roda no CI em todo PR |
| CA-2 | Controller não fala com `Domain`; escrita passa por `Application` | — | — | ❌ SEM TRAVA — **a regra está num comentário do `deptrac.yaml`**. O PR #111 abriu `Http → Domain` para Resources tiparem model, e o Deptrac não distingue Resource de Controller |
| CA-3 | Tipagem sem escape: PHPStan nível 6, sem baseline, `ignoreErrors: []` | `phpstan` via `composer gates` | `backend/phpstan.neon` | ✅ ATIVA |
| CA-4 | Complexidade ciclomática no backend ≤ 10 | `phpmd` via `composer gates` | `backend/phpmd.xml` | ✅ ATIVA |
| CA-5 | Complexidade ciclomática no frontend ≤ 10 (= Q-1; o mesmo teto do PHPMD, CA-4) | `complexity` do ESLint sob a catraca de medida | `frontend/eslint.config.mjs:180`, `.catraca/eslint.json` | ✅ ATIVA desde 19/09 — hook `trava-ts.py`, `pre-commit`, `pre-push` e CI. Saiu do oxlint (teto 20 + 13 isentos a 35, 5 já podres). Dívida congelada com o valor: 67 funções em 53 arquivos (66 em produção + 1 golden; maior 34); função nova acima de 10 reprova, congelada que cresce reprova. Canários: `__canarios__/complexidade-11.fixture.ts`, catraca real em `travas.test.ts`, `testa-pre-commit.sh` (casos `ccn-novo-indice`, `ccn-congelada-cresce-indice`) |
| CA-6 | Domínio TS isolado, sem dependência externa | `dependency-cruiser` | — | 🔜 DECIDIDA — não há camada de domínio TS formal hoje; a canônica é `packages/utils` |
| CA-7 | Backend: módulos só se falam por `Application`; o `Domain` de um módulo nunca importa o `Domain` de outro, e ciclo entre módulos reprova o PR. **Sem exceção** (dono, 18/09/2026) | Pest Arch, uma regra encadeada por módulo | `backend/tests/Arch/ArquiteturaTest.php` | 🔜 DECIDIDA — a trava nasce na branch `refactor/cadastro-sem-ciclo`, que desfaz o ciclo `Cadastro ↔ Pessoas`. Violação conhecida: `Pessoas\Domain\Usuario` e `UsuarioPosto` importam `Cadastro\Domain\Posto`; sai quando `Posto` for para `App\Compartilhado` |

> **CA-2 é a regra que este registro existe para não deixar morrer.** A correção é quebrar
> `Http` em dois no Deptrac: `HttpControllers` (sem acesso a `Domain`) e `HttpBorda`
> (`Resources` + `Middleware`, com acesso). A regra sai do comentário e entra no ruleset.

> **CA-7 não cabe no Deptrac.** O `deptrac.yaml` junta o `Domain` de todos os módulos numa
> camada só, então `Cadastro\Domain → Pessoas\Domain` é "Domain → Domain" e passa com 0
> violações. Foi assim que o ciclo de 18/09 entrou sem nenhum gate reprovar. A trava é o Pest
> Arch, na forma encadeada (`arch()->expect('App\Cadastro')->not->toUse(...)`), com um
> namespace por regra. A forma com lista ou com closure passa verde com a violação presente.
> Canário: a própria violação `Pessoas → Cadastro`, enquanto existir.

## RES — Result Pattern

Origem: *Result Pattern: Ditch try/catch in TypeScript*, `neverthrow`, `typescript-result`,
*Result pattern in TypeScript — when your errors stop being a surprise* (LeanMind).

**Nenhuma destas regras está adotada hoje.** Entram no registro como decisão de arquitetura
a implementar, não como dívida medida.

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| RES-1 | Falha de negócio previsível retorna `Result<T,E>`; `throw` fica só para erro de infraestrutura irrecuperável | — | — | 🔜 DECIDIDA |
| RES-2 | `Result` retornado precisa ser consumido (`.match()`, `.unwrapOr()` ou `._unsafeUnwrap()`) | `eslint-plugin-neverthrow` (`neverthrow/must-use-result`) | — | 🔜 DECIDIDA |
| RES-3 | Sem `try/catch` como controle de fluxo nas camadas de aplicação e apresentação | — | — | 🔜 DECIDIDA |
| RES-4 | União de erro tratada exaustivamente (o compilador acusa caso falte um) | `noImplicitReturns` + `assertUnreachable` | `tsconfig.json` | 🔜 DECIDIDA |

> **Biblioteca a escolher** entre `neverthrow` (tem plugin de lint próprio, que é o que
> dá dente à RES-2) e `typescript-result`. A decisão precisa de "ok" do dono: adotar
> Result Pattern muda a assinatura de toda função de domínio, e **nenhuma função de
> dinheiro pode mudar de assinatura sem golden verde antes e depois** (DOM-1).

## TS — typescript-eslint com type information

Origem: *Linting with Type Information* (typescript-eslint), *Arquitetura e Boas Práticas
Avançadas em TypeScript*, e os guias de flat config do notebook.

**O type-aware linting não está ligado.** `frontend/eslint.config.mjs` não tem
`projectService` nem `strictTypeChecked` — o que significa que **toda regra abaixo que
exige tipo está inoperante hoje**, não por desligada, mas por falta do parser.

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| TS-1 | Type-aware ligado: `parserOptions: { projectService: true, tsconfigRootDir }` | `typescript-eslint` | `frontend/eslint.config.mjs` | 🔜 DECIDIDA — pré-requisito de TS-2..5 |
| TS-2 | Toda Promise tratada (`no-floating-promises`) | `typescript-eslint` (exige tipo) | — | 🔜 DECIDIDA |
| TS-3 | `await` só sobre thenable (`await-thenable`) | `typescript-eslint` (exige tipo) | — | 🔜 DECIDIDA |
| TS-4 | Sem booleano implícito (`strict-boolean-expressions`) | `typescript-eslint` (exige tipo) | — | 🔜 DECIDIDA |
| TS-5 | `async` sem `await` é erro (`require-await`) | `typescript-eslint` (exige tipo) | — | 🔜 DECIDIDA |
| TS-6 | `any` proibido | `@typescript-eslint/no-explicit-any` | `frontend/eslint.config.mjs:81` | ✅ ATIVA — **quem faz cumprir:** hook `trava-ts.py` (ao editar), `scripts/hooks/pre-commit` (índice), `scripts/hooks/pre-push` (cada commit, desde 19/09) e CI, todos pela catraca do ESLint. Hoje: 0 `any` em produção, 7 em teste congelados em `.catraca/eslint.json` (o `--no-inline-config` faz o `disable` não contar) |
| TS-7 | Retorno explícito na fronteira de módulo | `explicit-function-return-type` | — | ❌ SEM TRAVA |
| TS-8 | `enum` do TS proibido (usar union de literais) | — | — | ❌ SEM TRAVA — hoje: 0 `enum`. É disciplina, não gate |
| TS-9 | Data de calendário nunca por `toISOString().split()` | `no-restricted-syntax` | `frontend/eslint.config.mjs:98-106` | ✅ ATIVA — **quem faz cumprir:** hook `trava-ts.py`, `scripts/hooks/pre-commit`, `scripts/hooks/pre-push` (desde 19/09) e CI, pela catraca do ESLint |
| TS-10 | kebab-case em arquivo e pasta | — | — | ❌ SEM TRAVA — 187 de 435 fora do padrão. Dívida aceita; `git mv` em massa colide com o strangler |

> **A assimetria oxlint × eslint foi fechada em 19/09/2026.** Até então `pre-push` rodava só
> oxlint, type-check, vitest e golden; as regras de *conteúdo* (`any`, `toISOString` e as
> type-aware) só valiam no CI. Agora `scripts/hooks/pre-push` roda `bun run lint:eslint` (a
> catraca do ESLint) logo depois do oxlint, e `scripts/hooks/pre-commit` acorda também quando o
> índice só tem config de trava (`eslint.config.mjs`, `.catraca/*.json`, `scripts/catraca.mjs`,
> `tsconfig.json`, `.oxlintrc.json`) — antes um commit só disso saía com exit 0 sem rodar nada.
> Canários: `testa-pre-push.sh` (caso `eslint`: `any` em `.ts` novo com oxlint e tsc verdes tem
> de barrar) e `testa-pre-commit.sh` (casos `config-trava-indice-suja` e `config-trava-tsconfig-de-app`
> — a regex casa **todos** os `tsconfig*.json` de `frontend/`, o `.oxlintrc.json` e o `eslint.config.mjs`).
>
> **Onde "✅ ATIVA" vale a partir de quando.** Os hooks de `scripts/hooks/` são a FONTE; o que roda é a
> cópia em `.git/hooks`, instalada por `scripts/instala-hooks.sh`. Enquanto o dono não reinstalar, o
> `pre-commit` e o `pre-push` da máquina continuam na versão anterior a 19/09 (sem o ESLint no push, sem
> acordar para config de trava). **O CI vale já** a partir do merge; o hook local, só depois da reinstalação.
> O hook do Claude (`trava-ts.py`) chama a catraca da árvore, então vale já para o que o Claude edita.

## Q — Qualidade de código: tetos (aprovadas pelo dono em 19/09/2026)

Origem: auditoria de saúde da `fase-a` em `40abfee` e o `CLAUDE.md` §6 (CCN ≤ 10). Recontagem na base
`91593a8` (com o #126). Convenção de contagem, a única que reproduz os números: arquivo em linha **física**;
função em linha **útil** (sem branco nem comentário). Teste, spec e canário ficam **fora** dos tetos de tamanho
(Q-2, Q-3) e **dentro** do de complexidade (Q-1). `types/database/generated.ts` e `database.types.ts`
(gerados) ficam fora de tudo.

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| Q-1 | Complexidade ciclomática ≤ 10, frontend e backend | front: `complexity` do ESLint sob catraca de medida · back: PHPMD (CA-4) | `frontend/eslint.config.mjs:180` · `backend/phpmd.xml` | ✅ ATIVA — front desde 19/09 (PR-3; = CA-5): hook `trava-ts.py`, `pre-commit`, `pre-push`, CI. Congelado: 67 funções/53 arquivos. Back: já ativa, 0 violações |
| Q-2 | Arquivo ≤ 300 linhas (físicas), front e back | front: `max-lines` do ESLint sob catraca de medida · back: PHPMD `ExcessiveClassLength` + `TamanhoDeArquivoTest` | `frontend/eslint.config.mjs:198` | front ✅ ATIVA desde 19/09 (PR-3), mesmos 4 caminhos; congelado: 26 arquivos (maior 899, `use-planilha-do-banco.ts`). Back 🔜 DECIDIDA — **prevista no PR-4** (hoje 0 violações: maior arquivo 178 linhas) |
| Q-3 | Função/componente ≤ 60 linhas (úteis), front e back | front: `max-lines-per-function` do ESLint sob catraca de medida · back: PHPMD `ExcessiveMethodLength` | `frontend/eslint.config.mjs:199` | front ✅ ATIVA desde 19/09 (PR-3), mesmos 4 caminhos; congelado: 161 funções/134 arquivos (maior 467). Back 🔜 DECIDIDA — **prevista no PR-4** (hoje 0 violações: maior método 32 linhas) |
| Q-4 | Isenção de regra tem prazo e sai quando o arquivo volta ao teto | — | `frontend/scripts/catraca.mjs` | ⚠️ PARCIAL — as 13 isenções do oxlint sumiram (PR-3); a catraca **avisa** quando a dívida baixou ("rode `catraca:atualizar`", `catraca.mjs:328`) mas não reprova a lista defasada, e não há prazo. Sem PR previsto |

> **Canários de Q-1..Q-3** (PROC-5), em `frontend/apps/web/src/__canarios__/travas.test.ts`: função de CCN 11
> acusada e de CCN 10 não; função de 61 linhas úteis acusada e de 60 úteis (73 físicas) não; arquivo gerado de
> 301 linhas (300 de comentário) acusado e de 300 não; `.test.ts` de 301 linhas com função de 61 linhas e CCN 11
> acusado **só** por `complexity`; e a **catraca real**: `scripts/catraca.mjs eslint <arquivo novo com CCN 11>`
> sai 1, função congelada em [11] medindo 12 sai 1 e em [12] sai 0. No `pre-commit`: `testa-pre-commit.sh`
> casos `ccn-novo-indice` e `ccn-congelada-cresce-indice` (`analisarValor` de `formatters.ts`, [12] → [13]).

## D, M, E, R — Dependências, dinheiro, erros, repetição (aprovadas pelo dono em 19/09/2026)

Estado **real** em 19/09, PR-3 do pacote de travas. "Prevista no PR-N" cita o plano aprovado do pacote
(`chore/travas-de-qualidade`); até o PR entrar, a regra é texto.

| ID | Regra | Falha que originou | Trava | Estado |
|---|---|---|---|---|
| D-1 | Nenhum ciclo de import (arquivo e pasta) | 2 ciclos de pasta | `import-x/no-cycle` sob catraca | 🔜 DECIDIDA — **prevista no PR-7** (devDep nova `eslint-plugin-import-x`; 0 ciclos de arquivo medidos em 374 arquivos/886 arestas) |
| D-2 | Legado (`components/*`) também respeita Public API: sem import lateral nem profundo entre slices | 8 laterais + ~15 profundos sem trava | `boundaries/dependencies` com elemento `legado` sob catraca | 🔜 DECIDIDA — **prevista no PR-7** |
| D-3 | FSD não depende do legado; `shared` não conhece estado de app | 14 arestas FSD→legado | `boundaries` sob catraca | ❌ SEM TRAVA — fora do pacote atual; `boundaries/dependencies` (FSD-1/2) só vê camadas FSD |
| D-4 | Banco só pela camada de services/API; tela, hook e widget nunca chamam o cliente | 14 arquivos fora da camada (3 widgets) | `no-restricted-imports` sob catraca | ❌ SEM TRAVA — fora do pacote atual |
| D-5 | Backend: rota, middleware e factory não criam dependência entre módulos; ninguém usa `App\Models` | 4 pontos cegos dos gates | Deptrac (`./database/factories` em `paths`) + Pest Arch + `RotasTest` | 🔜 DECIDIDA — **prevista nos PR-5 (factories, `App\Models`) e PR-6 (`DefinePostoAtual` → `Compartilhado\Middleware`, `RotasTest`)** |
| D-6 | Controller não fala com `Domain` (CA-2 sai do comentário) | regra só em comentário do `deptrac.yaml` | Deptrac com `Http` dividido em `HttpControladores`/`HttpBorda` | ⚠️ PARCIAL — o Pest Arch já proíbe controller de usar `App\Models` e `Domain` (`ArquiteturaTest.php:149-151`); o Deptrac ainda não distingue Resource de Controller — **previsto no PR-5** |
| M-1 | Conversão reais↔centavos só por `packages/utils`, nunca inline | máscara ×8 no PWA, 3 `Math.round(x*100)/100` | `no-restricted-syntax` sob catraca | ❌ SEM TRAVA — fora do pacote atual (= DOM-3) |
| M-2 | Taxa de cartão é despesa do mês; desconto por transação na tela é só conferência | `totalTaxas` duplicado e contraditório | golden (só o Fable edita fórmula) | ❌ SEM TRAVA — (= DOM-6) fatia futura com Fable e golden; 3 sítios violam |
| E-1 | Sem `throw` em `packages/utils` e `*.api.ts`: regra de negócio devolve `Result` | 78 `throw` × neverthrow em 4 arquivos | `no-restricted-syntax` (`ThrowStatement`) escopado, sob catraca | 🔜 DECIDIDA — **prevista no PR-8** (dívida hoje 0 nos dois escopos; `api-core` fica fora, borda OCR/HTTP) |
| E-2 | Nenhuma promise solta; zerar primeiro a tela de dinheiro | 69 (16 no fechamento diário) | `no-floating-promises` sob catraca | ⚠️ PARCIAL — a trava está ATIVA para código novo desde 18/09 (TS-2); os 69 congelados não foram zerados, e zerar o fechamento diário é fatia própria |
| R-1 | Código idêntico entre apps vai para pacote | `ReloadPrompt` e `lib/supabase` idênticos nas 2 PWAs | revisão | ❌ SEM TRAVA — por decisão: não há trava mecânica boa; vale na revisão |

## P — Processo (aprovadas pelo dono em 19/09/2026)

| ID | Regra | Falha que originou | Trava | Estado |
|---|---|---|---|---|
| P-1 | Comando negado não se repete com outra descrição ou forma | executor contornou o classificador (19/09) | regra no workflow `refatora-modulo` | ⚠️ PARCIAL — regra escrita no workflow; hook não vê a reescrita |
| P-2 | Nenhum desvio de hook de git (`core.hooksPath`, `--no-verify`, `commit -n`, `commit-tree` para gravar em ref) | subagente pulou o pre-commit (18/09) | `protege-git.py` | 🔜 DECIDIDA — **prevista no PR dos 6 hooks (#127)**. Nota: `testa-pre-push.sh` e `testa-pre-commit.sh` usam `commit-tree` para criar commits SOLTOS de canário (sem ref, nenhum hook a pular) — não é desvio |
| P-3 | Dependência sempre instalada, nunca symlink de `vendor`/`node_modules` | vendor em symlink fez o gate mentir verde | `protege-dependencias.py` | 🔜 DECIDIDA — **prevista no #127**; o `pre-commit` já instala no snapshot do índice (nunca linka) desde 18/09 |
| P-4 | `add` e `commit` conferidos de verdade; CHANGELOG a cada entrega | #120 sem CHANGELOG | `checklist-commit.py` | ⚠️ PARCIAL — o hook existe em `.claude/settings.json`; a exigência de CHANGELOG é **prevista no #127** |
| P-5 | Plano e doc que citam decisão do dono citam a fonte, e a revisão confere | orquestrador escreveu o contrário da DECISÃO A 2× | revisão adversarial | ❌ SEM TRAVA — por natureza (processo humano) |
| P-6 | Gate de pre-push testa o commit, não a árvore | pre-push mentia verde | `scripts/hooks/pre-push` (#113) + `testa-pre-push.sh` | ✅ ATIVA — cada commit do push em worktree temporária com dependências instaladas; canário `testa-pre-push.sh`. Vale na máquina só depois de reinstalar `.git/hooks` |

## PROC — Processo

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| PROC-1 | Nunca commitar na `main`; branch por issue | `.claude/hooks/` | `.claude/hooks/` | ⚠️ PARCIAL — só dentro do Claude Code |
| PROC-2 | Nenhum merge ou push sem "ok" explícito do dono | `.claude/hooks/` | `.claude/hooks/` | ⚠️ PARCIAL — só dentro do Claude Code |
| PROC-3 | `docs/data/` nunca é versionado | `.gitignore` + `.vercelignore` | `.gitignore:35,73` | ⚠️ PARCIAL — o padrão é `docs/data/` **com barra final**, que não casa com symlink |
| PROC-4 | Módulo não começa sem Design Doc em `docs/design/` | — | — | ❌ SEM TRAVA |
| PROC-5 | Toda trava tem canário que prova que ela reprova | `testa-hooks.py` (só para hooks) | `.claude/hooks/testa-hooks.py` | ⚠️ PARCIAL — **os Quality Gates não têm canário** |

---

## Ordem de implementação

Critério: primeiro o que protege dinheiro, depois o que fecha caminho de entrada aberto,
por último o que acrescenta regra nova.

1. **DOM-1 no CI.** O golden é a única coisa que separa este sistema de um que erra dinheiro
   em silêncio, e hoje ele só roda na máquina do dono.
2. ~~**Fechar a assimetria oxlint × eslint** (TS-6, TS-9 e futuras type-aware passam a valer
   no `pre-push`). Não custa regra nova — só faz valer as que já existem.~~ **Feito em
   19/09/2026** (`pre-push` roda `lint:eslint`; ver nota em TS).
3. **CA-2:** quebrar `Http` em dois no `deptrac.yaml`. Devolve o dente que o #111 tirou.
4. **PROC-5:** canário para cada Quality Gate. Sem isso nenhum ✅ desta tabela é confiável.
5. **FSD-1..4** via `eslint-plugin-boundaries`, escopado **só às pastas FSD**.
6. **TS-1..5:** ligar type-aware linting.
7. **RES-1..4:** Result Pattern — depende de decisão do dono e não pode tocar função de
   dinheiro sem golden.

## O que este arquivo não decide

- **Qual biblioteca de Result** (RES). Precisa de "ok" do dono.
- ~~**Se o teto de CCN é 10 (§6 do `CLAUDE.md`) ou 20 (`.oxlintrc.json`)**.~~ **Resolvido em
  19/09/2026:** é 10 (Q-1/CA-5); o 20 saiu do `.oxlintrc.json` junto com as isenções.
- **Mover pasta do legado para FSD.** Fora de escopo por decisão: destrói `git blame`
  durante a auditoria de dado real.
