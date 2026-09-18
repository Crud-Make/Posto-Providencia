---
name: refactor-module
description: Roteiro de refatoração arquitetural de UM módulo do Posto Providência — Laravel 13 modular (App\<Modulo>\{Http,Application,Domain}) no backend e React 19 + TypeScript em FSD no frontend — com mapeamento nos 5 níveis de zoom antes de editar, Result Pattern via NeverThrow e fechamento obrigatório pelos quality gates reais (composer gates, catraca de tsc/ESLint, golden). Use ao refatorar controller gordo, mover validação para FormRequest, extrair regra de cálculo para Value Object, migrar código legado de components/ services/ utils/ para um slice FSD, trocar throw/try-catch de regra de negócio por Result, ou quando aparecer "refatora o módulo X", "limpa esse controller", "passa isso pro FSD", "tira esse throw". Para decidir SE vale refatorar, use refatoracao-posto-providencia; se a refatoração encosta em fórmula de dinheiro, pare e vá para fechamento-posto-providencia.
---

# Refatoração Arquitetural & Quality Gates

Orienta a refatoração de um módulo no Claude Code, garantindo conformidade com a arquitetura
do repositório (Laravel 13 modular + FSD em TypeScript), tratamento determinístico de erros via
NeverThrow e o cumprimento integral dos quality gates automatizados.

**Regra que vale antes de tudo (vem de `refatoracao-posto-providencia`):** refatoração
estrutural e mudança de fórmula de dinheiro **não se misturam** na mesma tarefa. Se o módulo
calcula `valor_conferido`, `diferenca`, custo, lucro ou taxa, o golden master tem de rodar
verde antes e depois, sem ajuste no teste.

---

## 🔍 Fase 1: Mapeamento nos 5 Níveis de Zoom (antes de editar)

Antes de alterar qualquer linha, escreva (na conversa, curto) o módulo em cada nível:

1. **Contexto** — conexões externas: APIs (Gemini/OCR, push), filas, eventos, realtime,
   Supabase legado ainda em uso. Quem chama o módulo e quem ele chama.
2. **Arquitetura** — camada onde o código mora hoje e onde deveria morar:
   - backend: `Http` → `Application` → `Domain` → `Compartilhado` (Deptrac, `backend/deptrac.yaml`);
   - frontend: `app` → `pages` → `widgets` → `features` → `entities` → `shared`
     (`eslint-plugin-boundaries`, `frontend/eslint.config.mjs`). `components/`, `services/`,
     `utils/` em `apps/web/src` são **legado do strangler**: fora das regras até migrarem.
3. **Componentes** — o que cada peça deve ser: Controller, classe de Application
   (Command/Query/Action), FormRequest, DTO, Value Object, Resource, slice FSD.
4. **Comportamento** — regras de cálculo, invariantes do domínio, fluxos assíncronos. Liste o
   que **não pode mudar**; é isso que o teste vai prender.
5. **Contratos** — assinaturas explícitas de entrada e saída de cada fronteira nova.

Raio de impacto: use o agente `grafo` ("quem usa Y") e o `historico` ("alguém já mexeu nisso?")
antes de mover arquivo com importadores.

---

## 🐘 Fase 2: Diretrizes do Backend (Laravel 13 / PHP 8.4)

O layout é **modular** (Design Doc `docs/design/fase-a-laravel.md` §2):
`App\<Modulo>\{Http, Application, Domain}` + `App\Compartilhado`. **Não existe `App\Actions`** —
uma classe ali fica fora de todas as camadas do Deptrac e escapa da trava.

* **Skinny Controllers** — controller com 3–5 linhas por método, delegando para uma classe
  invocável em `App\<Modulo>\Application\` (ex.: `App\Fechamento\Application\FechaCaixaDoTurno`).
  O controller não toca model nem `Domain` para escrever (Pest Arch reprova).
* **Form Requests** — nada de `$request->validate()`, `Request` cru, `validator()` ou
  `request()` no controller; a validação vai para `App\<Modulo>\Http\Requests\*Request`.
* **Isolamento de Domínio** — regra de cálculo densa e invariante em Value Object imutável ou
  entidade pura em `Domain`, usando PHP 8.4 (`public private(set)`, property hooks). Dinheiro é
  decimal (`Compartilhado`), nunca `float`.
* **Model Strictness** — o `AppServiceProvider` já liga `preventLazyLoading`,
  `preventAccessingMissingAttributes` e `preventSilentlyDiscardingAttributes` **fora de
  produção** (em produção ficam desligadas de propósito); o `TravasDoEloquentTest` é o canário.
  Então quem pega o N+1 é o teste, não o usuário: toda Query nova precisa de teste que a
  exercite. Carregue com `with()`/`select()` explícitos; refatoração que "precisa" desligar a
  trava está errada.
* **Limpeza de Debug** — sem `dd()`, `dump()`, `ray()`, `var_dump()`, `print_r()` e sem `env()`
  fora de `config/`. O Pest Arch e o hook `trava-php.py` reprovam.
* `declare(strict_types=1);` em todo arquivo de `app/`. Enum sempre string-backed.

---

## ⚛️ Fase 3: Diretrizes do Frontend (React 19 / TypeScript)

* **Feature-Sliced Design** — hierarquia estrita `app` → `pages` → `widgets` → `features` →
  `entities` → `shared`. Camada inferior nunca importa superior; slice nunca importa slice
  vizinho da mesma camada.
* **Public API Pattern** — de fora, só pelo `index.ts` do slice. `@features/x/model/y` é
  import profundo e o `no-restricted-imports` reprova.
* **NeverThrow / Result Pattern** — regra de negócio não usa `throw` nem `try/catch`: devolve
  `Result<T, E>` (ou `ResultAsync<T, E>`) do `neverthrow`, com `E` como união discriminada de
  erros de domínio (`{ tipo: 'turno_fechado' } | { tipo: 'leitura_menor_que_anterior'; ... }`).
  `try/catch` fica só na borda que conversa com o mundo (fetch, SDK) e ali vira
  `ResultAsync.fromPromise(...)`. Todo `Result` tem de ser consumido
  (`neverthrow/must-use-result`).
* **Fronteiras tipadas** — sem `any`; dado externo entra como `unknown` e passa por schema
  **Zod** (`z.infer` dá o tipo). Função exportada, hook público e DTO têm tipo de entrada e de
  retorno explícitos; inferência só por dentro.
* **Compilador estrito** — `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` ligados:
  trate `arr[i]` como `T | undefined`, não atribua `undefined` a `prop?:`. Nada de `!` para
  calar o compilador; nada de `enum` do TS (use união de literais ou `as const`) — esta última
  só os PWAs cobram (`erasableSyntaxOnly` no tsconfig deles); **no `apps/web` nenhum gate
  cobra hoje**, quem segura é a revisão.
* **Promise** — nenhuma promise solta (`no-floating-promises`); condição booleana explícita
  (`strict-boolean-expressions`).

---

## 🚦 Fase 4: Quality Gates (a refatoração só termina aqui)

Rodar **todos** que o módulo toca, ler a saída, e só então declarar pronto:

| Lado | Comando | O que trava |
|---|---|---|
| backend | `cd backend && composer gates` | Pint, PHPStan 9, PHPMD (CCN ≤ 10), Deptrac, Pest + cobertura ≥ 85% |
| backend | `vendor/bin/pest tests/Arch` | higiene, strict_types, forma do controller, enums |
| frontend | `cd frontend && bun run type-check` | catraca do `tsc` — erro novo reprova |
| frontend | `bun run lint:eslint` | catraca do ESLint (FSD, Public API, neverthrow, promises) |
| frontend | `bun run lint` e `bun run test` | oxlint e vitest |
| dinheiro | `bun run test:golden` | golden master — **nunca** ajustar o teste para passar |

Regras de leitura dos gates (cada uma já deu verde falso aqui):

* **PHPStan dentro do agente sai em JSON** — conte pelo campo `errors`, nunca com `grep`.
* **Pest Arch só vale na forma encadeada** `arch('…')->expect('Ns')->…`, com **um namespace por
  regra**. Forma com closure ou `expect([lista de namespaces])` passa verde com a violação.
* **Trava nova entra com canário**: plante a violação, veja vermelho, remova. Gate que nunca
  reprovou não prova nada.
* **Catraca só desce**: se a refatoração zerou erros de um arquivo, rode
  `bun run catraca:atualizar` e commite o `.catraca/` junto. `--aceitar-divida` só com decisão
  do dono, dita no PR.
* Em worktree, confira antes que `node_modules`, `backend/vendor`, `docs/data` e `.env` existem —
  sem eles os gates falham em silêncio ou barram tudo.

---

## ✅ Fase 5: Fechamento

1. Diff revisado: só estrutura mudou (ou, se mudou fórmula, foi tarefa separada com golden).
2. Gates da Fase 4 verdes, com a saída lida — não suposta.
3. Documentação: rode o agente `doc-cycle-onboard` e aplique o patch em `docs/architecture.md` /
   Design Doc do módulo quando a estrutura mudou.
4. Commit em pt-BR descrevendo o **porquê**; hooks (`pre-commit`, `pre-push`) nunca pulados
   com `--no-verify`.
