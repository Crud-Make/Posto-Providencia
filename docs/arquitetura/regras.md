# Registro de Regras de Arquitetura

> **Fonte das regras de arquitetura:** notebook **"Arquitetura de software"** no NotebookLM
> (36 fontes — FSD, Clean Architecture/DDD, Result Pattern, typescript-eslint com type
> information). **Fonte das regras de domínio:** a planilha real do posto e a skill
> `fechamento-posto-providencia`.
>
> **Medido em 17/09/2026; FSD, RES, TS e PROC-5 remedidos em 19/09/2026** (branch
> `refactor/pwa-frentista-fsd`). Toda coluna "Trava" deste arquivo foi verificada rodando a
> ferramenta, não lendo documentação. Onde a coluna cita `arquivo:linha`, é a linha na branch
> de 19/09.

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
| ⚠️ **PARCIAL** | a trava existe mas só bloqueia num caminho (só CI, ou só local), ou só num app |
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
5. **Pendência não é exceção.** Quando uma trava cobre um app e não o outro, a tabela diz
   "pendente do app X", com o passo que a liga. Regra de arquitetura não ganha exceção
   (decisão do dono, 18/09/2026): o código se adapta à regra, nunca o contrário.

## Os três caminhos de entrada (19/09/2026)

Toda trava de conteúdo do frontend passa pela **catraca** (`frontend/scripts/catraca.mjs`):
o erro que já existia está congelado em `frontend/.catraca/{tsc,eslint}.json`, erro NOVO
reprova, e a lista só desce (`bun run catraca:atualizar` recusa dívida nova sem
`--aceitar-divida`, que é decisão do dono dita no PR).

| Caminho | O que roda | Onde |
|---|---|---|
| `pre-commit` (só quando há `.ts/.tsx` no índice) | oxlint; ESLint type-aware pela catraca **só nos arquivos do índice**; **tsc pela catraca, monorepo inteiro** (desde 19/09, decisão do dono) | `scripts/hooks/pre-commit:70,79,86` |
| `pre-push` | oxlint; **ESLint type-aware, passada completa, pela catraca** (desde 19/09); tsc pela catraca; vitest; golden | `scripts/hooks/pre-push:97,105,108,111,116-117` |
| CI (`build`) | oxlint; ESLint passada completa; tsc; vitest; build do `apps/web`; **build do `apps/pwa-frentista`** (desde 19/09) | `.github/workflows/ci.yml:34,37,40,44,47,52-54` |

Custo medido em 19/09/2026, sozinho na máquina do dono: `bun run type-check` 64 s,
`bun run lint:eslint` 88 s (o comentário dos hooks registra 23 s e 65 s, medidos mais
cedo no mesmo dia; o número varia com a carga). Os canários do pwa rodam em 31 s.

**O que ainda não fecha:** o hook instalado em `.git/hooks` é cópia manual (memória
`worktree-nao-herda-dependencias`): mudar `scripts/hooks/*` não muda o que roda até o dono
reinstalar (`scripts/instala-hooks.sh`). A prova de ponta a ponta do `pre-push` com ESLint
é o primeiro push desta branch — a saída tem de listar o gate "ESLint (catraca)". O golden
continua fora do CI (DOM-1).

---

## DOM — Domínio: dinheiro

A régua de aceite do sistema: **se o cálculo e o envio batem com o Laravel, o sistema está OK.**
Estas regras existem para proteger essa igualdade.

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| DOM-1 | Nenhuma fórmula de dinheiro muda sem golden master rodando | `bun run test:golden` | `scripts/hooks/pre-push:116-117` | ⚠️ PARCIAL — **o CI não roda o golden** (depende de `docs/data/`, gitignored; `.github/workflows/ci.yml:94-95` diz o porquê). A trava existe só na máquina do dono |
| DOM-2 | Cálculo de domínio mora em `frontend/packages/utils` | — | — | ❌ SEM TRAVA — 8 módulos de fórmula vivem fora hoje, 3 sem golden. No pwa-frentista, ver a lista abaixo |
| DOM-3 | Saída de fórmula é quantizada por `emCentavos` | — | — | ❌ SEM TRAVA — `Math.round(x*100)/100` reescrito à mão em 5 lugares |
| DOM-4 | `diferenca = concentrador − conferido` | golden | `packages/utils/*.golden.spec.ts` | ✅ ATIVA |
| DOM-5 | Regra de negócio vem da skill `fechamento-posto-providencia`, não de intuição | — | — | ❌ SEM TRAVA — por natureza; é regra de processo humano |
| DOM-6 | Taxa de cartão é despesa do mês, nunca deduzida por transação | — | — | ❌ SEM TRAVA — violada em 3 sítios (`usePagamentos.ts:163,173`, `useFechamento.ts:157`) |

> **DOM-1 é a regra mais importante do repositório e a mais frágil.** Ela não roda no CI.
> Tornar o golden executável no CI (fixture mínima versionada, sem dado real do posto)
> é o único item desta tabela que protege dinheiro em todo caminho de entrada.

### DOM-2/DOM-3 no `apps/pwa-frentista` — registradas em 19/09/2026, **sem correção**

Copiadas literais na refatoração FSD do pwa (só estrutura; nenhuma fórmula mudou). Corrigir
qualquer uma é tarefa própria, com golden, só pelo Fable (hook `so-fable-na-formula.py`).

| Onde (19/09) | O que | Duplica |
|---|---|---|
| `apps/pwa-frentista/src/App.tsx:399,426,474-480` | parse de centavos à mão (`parseInt(x.replace(/\D/g, ''), 10) / 100 \|\| 0`) para o encerrante e os 7 meios do payload | `centavosParaReais` em `packages/utils/src/fechamento.ts:272` (que `meiosFromPwaPayments` já usa para o `valor_conferido` do mesmo payload) |
| `apps/pwa-frentista/src/screens/VendasScreen.tsx:82,94` | `preco_venda * quantidade` em float, sem `emCentavos` | DOM-3 |
| `apps/pwa-frentista/src/screens/HistoricoScreen.tsx:77-79` | `diff > 0` reescrito à mão para decidir falta/sobra | `isFalta` em `packages/utils/src/fechamento.ts:75` |
| `apps/pwa-frentista/src/services/api.ts:165-177` | `getEnviosDoDia` reescreve a consulta de envios do dia | `criarAcessoEnvios().listarDoDia` em `packages/api-core/src/envios.ts:36-50` (que também seleciona `Frentista(foto)`) — dedup é mudança de consulta, tarefa própria |

O cinto que impede o payload de mudar por acidente enquanto o `App.tsx` migra é
`apps/pwa-frentista/src/App.test.tsx` ("payload exato do envio", 19/09): afirma o objeto
inteiro passado a `submitFrentistaClosing` e os argumentos de `getOrCreateFechamento`.

## FSD — Feature-Sliced Design (frontend)

Origem: *Feature-Sliced Design and good frontend architecture* (codecentric), *Clean
Architecture in Frontend* (FSD), *10 TypeScript Best Practices for Scalable Apps*.

A trava é o `eslint-plugin-boundaries` (instalado; `frontend/eslint.config.mjs:7`), com as
camadas declaradas por app em `boundaries/elements` (`eslint.config.mjs:93-109`: web em
`:94-99`, pwa-frentista em `:103-108`) e as policies em `boundaries/dependencies`
(`:171-183`). Só arquivo **dentro** de `app/`, `pages/*`, `widgets/*`, `features/*`,
`entities/*` e `shared` é elemento; o legado do strangler (`components/`, `services/`,
`utils/`, `lib/`, `screens/`…) fica fora da regra até migrar. Roda nos três caminhos, pela
catraca, com **0 dívida congelada** de `boundaries/*` e de `no-restricted-imports`
(`frontend/.catraca/eslint.json` não tem nenhuma chave dessas regras).

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| FSD-1 | Camadas em ordem estrita: `app → pages → widgets → features → entities → shared`. Import só desce, nunca sobe | `boundaries/dependencies` | `eslint.config.mjs:171-183`; canários `apps/web/src/__canarios__/travas.test.ts:66-68` e `apps/pwa-frentista/src/__canarios__/travas.test.ts:61-63` | ✅ ATIVA — web e pwa-frentista, nas pastas FSD. `pwa-dono` sem camadas declaradas (não tem pasta FSD) |
| FSD-2 | Slices da mesma camada não se importam | `boundaries/dependencies` | idem; canários web `:70-72`, pwa `:65-67` | ✅ ATIVA — web e pwa-frentista |
| FSD-3 | Slice só exporta pelo `index.ts`; import de caminho interno de outro slice é proibido | `no-restricted-imports` com a regex `PUBLIC_API` (não o `boundaries/entry-point` que se cogitou em 17/09) | `eslint.config.mjs:15-18` (regex) e `:187` (web) / `:209` (pwa); canários web `:74-80`, pwa `:69-71` e `:98-104` | ✅ ATIVA — cobre `@pages/x/…`, `@/pages/x/…`, `@frentista/pages/x/…`, `../pages/x/…` e, desde 19/09, `./pages/x/…` feito da raiz do `src` (brecha por onde `App.tsx` importaria) |
| FSD-4 | Estrutura física dos slices (todo slice tem `index.ts`) | — | — | ❌ SEM TRAVA — `steiger` não instalado e não há plugin local (`grep posto/ eslint.config.mjs` vazio). **Pendente dos passos 7–12 da refatoração do pwa** (regra local `posto/slice-tem-index`); no web, pendência declarada |
| FSD-5 | Os 3 apps (`web`, `pwa-frentista`, `pwa-dono`) não se importam, nem usam alias um do outro | `no-restricted-imports` (`^@/`, `^@(app\|pages\|widgets\|features\|entities\|shared)/`, `apps/(web\|pwa-dono)/`) | `eslint.config.mjs:202-230`; canário pwa `:73-83` | ⚠️ PARCIAL — ativa **só no pwa-frentista** (0 ocorrências na entrada, 0 dívida). Web e pwa-dono: pendente |
| FSD-6 | Import pelo **alias do app** (`@/` no web, `@frentista/` no pwa-frentista), não relativo profundo (`../../`) | `no-restricted-imports` (`^(\.\./){2,}`) + alias | `eslint.config.mjs:223`; alias em `frontend/tsconfig.json:63-68`, `frontend/vitest.config.ts:24`, `apps/pwa-frentista/vite.config.ts` e `tsconfig.app.json`; canário pwa `:85-87` | ⚠️ PARCIAL — ativa **só no pwa-frentista** (0 ocorrências de `../../` na entrada). Web: sem trava (198 linhas com 3+ níveis em 17/09, não remedido) |

> **Por que `@frentista/` e não `@/` no pwa (decisão ratificada pelo dono, 19/09):** no
> monorepo, `@/` já é `apps/web/src` (`frontend/tsconfig.json`, `vitest.config.ts:19`,
> ESLint). Um `@/` no pwa compilava no Vite (que apontava para o `src` do pwa) e era
> conferido contra o web no `tsc` e no vitest — o mesmo import significava duas coisas.
> Não é exceção à FSD-6: é o mesmo mecanismo (alias) com o prefixo do app. Canário:
> `apps/pwa-frentista/src/__canarios__/travas.test.ts:46-53`; a prova negativa (um
> `@/lib/tipos` no pwa reprova o `type-check` com TS2307) foi rodada à mão em 19/09.

> **Dívida declarada, não bagunça:** `apps/web` tem **307 arquivos no mundo legado**
> (`components/`, `services/`, `types/`, `utils/`, `contexts/`) contra **36 no mundo FSD**
> (`widgets/`, `shared/`, `pages/`), medido em 17/09. O `apps/pwa-frentista` começou a
> migrar em 19/09: `shared/api/supabase.ts` e `shared/ui/reload-prompt.tsx` (2 arquivos,
> com a dívida deles zerada no mesmo passo — catraca do pwa de 34 para 29); `App.tsx`,
> `screens/`, `services/`, `lib/` e `components/` seguem no legado. A migração é
> **strangler, nunca big-bang** — regra que existia no `CLAUDE.md` 3.3 e sumiu no 4.0.
> `git mv` em massa destrói o `git blame` de que a auditoria de dado real depende.

## CA — Clean Architecture e camadas

Origem: *domain-driven-hexagon* (Sairyss), *Clean architecture with TypeScript: DDD, Onion*
(Bazaglia), *clean-domain-driven*, Design Doc `docs/design/fase-a-laravel.md §2`.

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| CA-1 | Backend: `Http → Application → Domain → Compartilhado`. Camada interna nunca conhece a externa | `deptrac` via `composer gates` | `backend/deptrac.yaml` | ✅ ATIVA — roda no CI em todo PR |
| CA-2 | Controller não fala com `Domain`; escrita passa por `Application` | — | — | ❌ SEM TRAVA — **a regra está num comentário do `deptrac.yaml`**. O PR #111 abriu `Http → Domain` para Resources tiparem model, e o Deptrac não distingue Resource de Controller |
| CA-3 | Tipagem sem escape: PHPStan nível 6, sem baseline, `ignoreErrors: []` | `phpstan` via `composer gates` | `backend/phpstan.neon` | ✅ ATIVA |
| CA-4 | Complexidade ciclomática no backend ≤ 10 | `phpmd` via `composer gates` | `backend/phpmd.xml` | ✅ ATIVA |
| CA-5 | Complexidade ciclomática no frontend ≤ 20 | `oxlint` | `frontend/.oxlintrc.json` | ⚠️ PARCIAL — **13 arquivos isentos em 35**. O teto do `CLAUDE.md` §6 é 10; no teto 10 há 70 funções fora |
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

**Biblioteca decidida: `neverthrow`** (`frontend/package.json:32`; declarada também em
`apps/pwa-frentista/package.json` desde 19/09, junto com `zod`, para o build da Vercel não
depender de hoisting). O plugin `@bufferings/eslint-plugin-neverthrow` é o que dá dente à
RES-2. A forma: regra de negócio devolve `Result<T, E>`/`ResultAsync<T, E>` com `E` como
união discriminada; `try/catch` só na borda (`shared/api`), virando
`ResultAsync.fromPromise(...)` — o mesmo desenho de `apps/web/src/services/api/base.ts`.

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| RES-1 | Falha de negócio previsível retorna `Result<T,E>`; `throw` fica só para a borda | `no-restricted-syntax` (`ThrowStatement`) | `eslint.config.mjs:238-257` (files `:239-242`, selector `:248`); canário pwa `:112-114` e `:126-128` (shared/ui) | ⚠️ PARCIAL — ativa **só no pwa-frentista**, em `pages/`, `widgets/`, `features/`, `entities/`, `shared/lib/` e `shared/ui/` (`.ts` e `.tsx`); `shared/api` é a borda e fica fora de propósito. Entrou com 0 dívida (as camadas ainda estão vazias). Legado do pwa fora do escopo até migrar: `services/api.ts` tem 15 `throw new Error` — **pendente dos passos 7–12**. Web: pendente |
| RES-2 | `Result` retornado precisa ser consumido (`.match()`, `.unwrapOr()` ou `._unsafeUnwrap()`) | `neverthrow/must-use-result` | `eslint.config.mjs:188` (apps/** e packages/**); canário `apps/web/src/__canarios__/travas.test.ts:44-57` | ✅ ATIVA nos três caminhos — no pwa-frentista ainda **por vacuidade**: nenhum `Result` real existe lá até o passo 7 |
| RES-3 | Sem `try/catch` como controle de fluxo nas camadas de aplicação e apresentação | `no-restricted-syntax` (`TryStatement`) | `eslint.config.mjs:252`; canário pwa `:116-118` e `:130-132` (shared/ui) | ⚠️ PARCIAL — mesmo escopo da RES-1. Legado do pwa: `App.tsx` (9 `try {`), `VendasScreen.tsx` (1), `TanquesScreen.tsx` (1), `lib/use-convite-instalacao.ts` (2) — pendente dos passos 7–12. Web: pendente |
| RES-4 | União de erro tratada exaustivamente (o compilador acusa caso falte um) | `noImplicitReturns` + `assertUnreachable` | `frontend/tsconfig.json:22`; tsc pela catraca em `pre-commit:86`, `pre-push:108`, `ci.yml:40` | ⚠️ PARCIAL — `noImplicitReturns` ligado e conferido nos três caminhos desde 19/09; o helper `assertUnreachable` **não existe** ainda em `apps/` nem `packages/` (nasce com a primeira união de erro real, passo 7) |

## TS — typescript-eslint com type information

Origem: *Linting with Type Information* (typescript-eslint), *Arquitetura e Boas Práticas
Avançadas em TypeScript*, e os guias de flat config do notebook.

**O type-aware linting está ligado desde 18/09** (`projectService: true`,
`frontend/eslint.config.mjs:85-87`), com `strict` no `tsconfig`. As regras que exigem tipo
funcionam e rodam pela catraca nos três caminhos; a dívida de cada uma está congelada em
`frontend/.catraca/eslint.json` (contagem de 19/09 entre parênteses).

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| TS-1 | Type-aware ligado: `parserOptions: { projectService: true, tsconfigRootDir }` | `typescript-eslint` | `eslint.config.mjs:85-87` | ✅ ATIVA — os canários de TS-2/TS-4 só acusam com tipo; se o parser cair, eles caem |
| TS-2 | Toda Promise tratada (`no-floating-promises`) | `typescript-eslint` | `eslint.config.mjs:167`; canário web `:86-88` | ✅ ATIVA pela catraca (69 congelados) |
| TS-3 | `await` só sobre thenable (`await-thenable`) | `typescript-eslint` | `eslint.config.mjs:156` | ⚠️ PARCIAL — ligada, 0 dívida, mas **sem canário** (PROC-5) |
| TS-4 | Sem booleano implícito (`strict-boolean-expressions`, `allowNumber: false`) | `typescript-eslint` | `eslint.config.mjs:165`; canário web `:90-92` | ✅ ATIVA pela catraca (539 congelados) |
| TS-5 | `async` sem `await` é erro (`require-await`) | `typescript-eslint` | — | ❌ SEM TRAVA — não está na config (`eslint.config.mjs:152-155` registra 25 erros medidos em 18/09, sem escopo). **Pendente do passo 12 do pwa** (remedir e ligar escopada); web pendente |
| TS-6 | `any` proibido | `@typescript-eslint/no-explicit-any` | `eslint.config.mjs:128`; canário web `:95-122` (prova que `eslint-disable` não esconde da catraca) | ✅ ATIVA nos três caminhos desde 19/09 (antes: só no CI). 7 congelados. Prova negativa de 19/09: um `const x: any` plantado no pwa reprovou `bun run lint:eslint` |
| TS-7 | Retorno explícito na fronteira de módulo | `explicit-function-return-type` | — | ❌ SEM TRAVA — não está na config. **Pendente dos passos 7–12** (entra só nas fronteiras: `entities/*/api`, `shared/api`, `features/*/model`); web pendente |
| TS-8 | `enum` do TS proibido (usar union de literais ou `as const`) | `no-restricted-syntax` (`TSEnumDeclaration`) | `eslint.config.mjs:42` (em `SINTAXE_PROIBIDA`, aplicada em `:137` a apps/** e packages/**); canário pwa `:93-95` | ✅ ATIVA — 0 `enum` no repo em 19/09, entrou com 0 dívida |
| TS-9 | Data de calendário nunca por `toISOString().split()` | `no-restricted-syntax` | `eslint.config.mjs:23-37` | ⚠️ PARCIAL — nos três caminhos desde 19/09 (2 congelados), mas **sem canário** (PROC-5) |
| TS-10 | kebab-case em arquivo e pasta | — | — | ❌ SEM TRAVA — 187 de 435 fora do padrão em 17/09. **Pendente dos passos 7–12** (regra local `posto/kebab-case-arquivo`, só no pwa); no web, `git mv` em massa colide com o strangler |

> **A assimetria oxlint × eslint foi fechada em 19/09/2026.** Até então `pre-commit` e
> `pre-push` rodavam só o oxlint (sintaxe) e o CI era a primeira passada do ESLint
> (conteúdo: `any`, `toISOString`, type-aware, FSD, neverthrow). Agora: `pre-commit` roda
> a catraca do ESLint nos arquivos do índice e o `tsc` inteiro; `pre-push` roda a catraca
> do ESLint completa. Ver "Os três caminhos de entrada". O que falta é a reinstalação do
> hook pelo dono e a prova no primeiro push.

## PROC — Processo

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| PROC-1 | Nunca commitar na `main`; branch por issue | `.claude/hooks/` | `.claude/hooks/` | ⚠️ PARCIAL — só dentro do Claude Code |
| PROC-2 | Nenhum merge ou push sem "ok" explícito do dono | `.claude/hooks/` | `.claude/hooks/` | ⚠️ PARCIAL — só dentro do Claude Code |
| PROC-3 | `docs/data/` nunca é versionado | `.gitignore` + `.vercelignore` | `.gitignore:35,73` | ⚠️ PARCIAL — o padrão é `docs/data/` **com barra final**, que não casa com symlink |
| PROC-4 | Módulo não começa sem Design Doc em `docs/design/` | — | — | ❌ SEM TRAVA |
| PROC-5 | Toda trava tem canário que prova que ela reprova | `testa-hooks.py` (hooks); `apps/web/src/__canarios__/travas.test.ts` (web, 18/09); `apps/pwa-frentista/src/__canarios__/travas.test.ts` (pwa, 19/09, 15 testes) | os canários são `*.test.ts` e rodam com o vitest em `pre-push:111` e `ci.yml:44`; os fixtures ficam em `ignores` do ESLint (`eslint.config.mjs:60,63,67`) e só o teste os linta, com `--no-ignore` | ⚠️ PARCIAL — **com canário:** FSD-1/2/3/5/6, RES-1/2/3, TS-2/4/6/8, flags estritas do `tsconfig` (`travas.test.ts:124-146`) e a própria catraca (`:148-173`). **Sem canário:** TS-3, TS-9, oxlint/CCN (CA-5), golden (DOM-1) |

## `apps/pwa-frentista` — regra → trava → arquivo → antes/depois (19/09/2026)

Fatia mínima da refatoração FSD do pwa (passos 0–6 do plano aprovado pelo dono em 19/09).
Toda trava entrou **escopada ao pwa, com 0 dívida no escopo** e com canário vermelho→verde
em `apps/pwa-frentista/src/__canarios__/travas.test.ts`. A célula "depois" só diz "ativa"
quando há um teste nesse arquivo que reprova a violação.

| Regra | Trava | Arquivo | Antes (18/09) | Depois (19/09) |
|---|---|---|---|---|
| FSD-1/FSD-2 | `boundaries/dependencies` | `eslint.config.mjs:103-108` (elementos do pwa) | sem cobertura (só o web tinha elementos) | ativa — canário `:61-67` |
| FSD-3 | regex `PUBLIC_API` | `eslint.config.mjs:15-18`, `:209` | parcial (não cobria `@frentista/` nem `./pages/x/y` da raiz do `src`) | ativa — canários `:69-71`, `:98-104` |
| FSD-4 | `posto/slice-tem-index` | — | sem trava | **pendente** (passos 7–12) |
| FSD-5 | `no-restricted-imports` | `eslint.config.mjs:210-221` | sem trava | ativa — canário `:73-83` |
| FSD-6 | `no-restricted-imports` `^(\.\./){2,}` + alias `@frentista/` | `eslint.config.mjs:223`; `tsconfig.json:63-68`; `vitest.config.ts:24`; `apps/pwa-frentista/vite.config.ts`; `tsconfig.app.json` | sem trava; `@/` significava web nos gates e pwa no Vite | ativa — canários `:46-53`, `:85-87`; texto da regra passa a dizer "alias do app" |
| RES-1/RES-3 | `no-restricted-syntax` `ThrowStatement`/`TryStatement` | `eslint.config.mjs:238-257` | sem trava | ativa em `pages/widgets/features/entities/shared-lib/shared-ui` (borda `shared/api` fora, dita) — canários `:112-118` e `:126-132` |
| RES-2 | `neverthrow/must-use-result` | `eslint.config.mjs:188` | ativa por vacuidade | ativa por vacuidade — ganha `Result` real no passo 7 |
| RES-4 | `noImplicitReturns` + `assertUnreachable` | `tsconfig.json:22`; `pre-commit:86` | parcial (tsc só no pre-push e CI) | parcial — tsc nos três caminhos; `assertUnreachable` **pendente** (passo 7) |
| TS-1/2/3/4/6/9 | type-aware + catraca | `eslint.config.mjs:85-87,128,156,165,167,23-37` | ativas só no CI (pre-push sem ESLint) | ativas nos três caminhos — `pre-push:105`, `pre-commit:79` |
| TS-5 | `require-await` | — | desligada | **pendente** (passo 12: remedir e ligar no pwa) |
| TS-7 | `explicit-function-return-type` | — | desligada | **pendente** (passos 7–12, só nas fronteiras) |
| TS-8 | `no-restricted-syntax` `TSEnumDeclaration` | `eslint.config.mjs:42,137` | sem trava | ativa — canário `:93-95` |
| TS-10 | `posto/kebab-case-arquivo` | — | sem trava | **pendente** (passos 7–12); os 2 arquivos migrados já nascem kebab (`reload-prompt.tsx`, `supabase.ts`) |
| PROC-5 | canários do pwa | `apps/pwa-frentista/src/__canarios__/travas.test.ts` | só o web tinha | 13 testes, rodam no `bun run test` |
| Caminhos de entrada | ESLint no pre-push; tsc no pre-commit; build do pwa no CI; `neverthrow`/`zod` no `package.json` do pwa | `pre-push:105`; `pre-commit:86`; `ci.yml:52-54`; `apps/pwa-frentista/package.json` | nenhuma regra de conteúdo barrava commit/push local; o build do pwa não rodava em gate nenhum | fechados na árvore versionada; **prova de ponta a ponta do hook pendente** (reinstalar + primeiro push) |
| Catraca do pwa | `frontend/.catraca/eslint.json` | — | 34 (32 strict-boolean + 2 no-floating-promises); tsc 5 | **29** (`lib/supabase.ts` e `components/ReloadPrompt.tsx` zerados ao migrar para `shared/`); tsc 5, sem chave nova |

O que os passos 7–12 ainda não fizeram (Result no `services/api.ts`, telas em `pages/`,
`App.tsx` em `app/` + `features/enviar-fechamento`) fica **pendente**, nunca como exceção.

---

## Ordem de implementação

Critério: primeiro o que protege dinheiro, depois o que fecha caminho de entrada aberto,
por último o que acrescenta regra nova.

1. **DOM-1 no CI.** O golden é a única coisa que separa este sistema de um que erra dinheiro
   em silêncio, e hoje ele só roda na máquina do dono. **Ainda aberto.**
2. ~~**Fechar a assimetria oxlint × eslint**~~ — feito em 19/09 na árvore versionada
   (`pre-push:105`, `pre-commit:79,86`); falta o dono reinstalar o hook e o primeiro push provar.
3. **CA-2:** quebrar `Http` em dois no `deptrac.yaml`. Devolve o dente que o #111 tirou.
4. **PROC-5:** canário para cada Quality Gate. Feito para as travas de lint (web 18/09, pwa
   19/09) e para as flags do `tsconfig`; faltam TS-3, TS-9, oxlint/CCN e golden.
5. ~~**FSD-1..3** via `eslint-plugin-boundaries`, escopado **só às pastas FSD**~~ — feito
   (web 18/09, pwa-frentista 19/09). **FSD-4** segue sem trava; FSD-5/6 só no pwa.
6. ~~**TS-1..4:** ligar type-aware linting~~ — feito em 18/09, pela catraca. **TS-5, TS-7 e
   TS-10** seguem pendentes (passos 7–12 do pwa).
7. **RES-1..4:** Result Pattern — `neverthrow` decidido; travas ligadas no pwa (vazias até o
   passo 7). Não pode tocar função de dinheiro sem golden.

## O que este arquivo não decide

- **Se o teto de CCN é 10 (§6 do `CLAUDE.md`) ou 20 (`.oxlintrc.json`)**. Os dois números
  estão escritos no repositório e se contradizem.
- **Mover pasta do legado para FSD em massa.** Fora de escopo por decisão: destrói
  `git blame` durante a auditoria de dado real. A migração é fatia a fatia, com a dívida do
  arquivo zerada no mesmo commit (a catraca conta por `arquivo|regra` e um `git mv` sem
  correção vira erro novo).
