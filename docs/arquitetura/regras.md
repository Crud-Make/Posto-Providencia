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
| CA-3 | Tipagem sem escape: PHPStan **nível 9**, sem baseline, `ignoreErrors: []` | `phpstan` via `composer gates` | `backend/phpstan.neon:8` | ✅ ATIVA — o nível subiu de 6 para 9 entre 17/09 e 20/09 (o cabeçalho do `phpstan.neon` registra: 0 erros no 6, 8 e 9; o 10 dá 1) |
| CA-4 | Complexidade ciclomática no backend ≤ 10 | `phpmd` via `composer gates` | `backend/phpmd.xml` | ✅ ATIVA |
| CA-5 | Complexidade ciclomática no frontend ≤ 20 | `oxlint` | `frontend/.oxlintrc.json` | ⚠️ PARCIAL — **13 arquivos isentos em 35**. O teto do `CLAUDE.md` §6 é 10; no teto 10 há 70 funções fora |
| CA-6 | Domínio TS isolado, sem dependência externa | `dependency-cruiser` | — | 🔜 DECIDIDA — não há camada de domínio TS formal hoje; a canônica é `packages/utils` |
| CA-7 | Backend: módulos só se falam por `Application`; o `Domain` de um módulo nunca importa o `Domain` de outro, e ciclo entre módulos reprova o PR. **Sem exceção** (dono, 18/09/2026) | Pest Arch, uma regra encadeada por módulo | `backend/tests/Arch/ArquiteturaTest.php` | ✅ ATIVA desde 18/09 — a branch `refactor/cadastro-sem-ciclo` foi mergeada (`879bf3b`), `Posto` está em `App\Compartilhado\Posto` e a trava vive em `backend/tests/Arch/ArquiteturaTest.php` na forma encadeada, uma regra por módulo. A violação `Pessoas\Domain → Cadastro\Domain` deixou de existir |

> **CA-2 é a regra que este registro existe para não deixar morrer.** A correção é quebrar
> `Http` em dois no Deptrac: `HttpControllers` (sem acesso a `Domain`) e `HttpBorda`
> (`Resources` + `Middleware`, com acesso). A regra sai do comentário e entra no ruleset.

> **CA-7 não cabe no Deptrac.** O `deptrac.yaml` junta o `Domain` de todos os módulos numa
> camada só, então `Cadastro\Domain → Pessoas\Domain` é "Domain → Domain" e passa com 0
> violações. Foi assim que o ciclo de 18/09 entrou sem nenhum gate reprovar. A trava é o Pest
> Arch, na forma encadeada (`arch()->expect('App\Cadastro')->not->toUse(...)`), com um
> namespace por regra. A forma com lista ou com closure passa verde com a violação presente.
> Canário (18/09, quando a violação ainda existia): `Pessoas → Cadastro` deixava a regra vermelha
> apontando os dois arquivos. Desfeito o ciclo, verde. O canário vivo hoje é a mutação descrita no
> cabeçalho de `backend/tests/Arch/ArquiteturaTest.php`, não a violação — que não existe mais.

## TEN — Escopo de tenant (multi-tenant)

Origem: decisão do dono de 20/09/2026 (`docs/architecture.md` §2) e `docs/design/fase-a-laravel.md`
DECISÃO 5, onde a regra já estava **em prosa, sem ID e sem executor**, desde 17/09.

O gate roda dentro do `composer gates` (Pest), que o `pre-push` e o CI executam. O CI carrega
`banco/init/01-esquema-base.sql` antes de rodar, então o `information_schema` que o teste consulta é o
**esquema real**, não uma lista escrita à mão.

| ID | Regra | Trava | Onde | Estado |
|---|---|---|---|---|
| TEN-1 | Model em tabela com coluna `posto_id` usa o trait `PertenceAoPosto`; a lista de tabelas vem do `information_schema`, nunca de lista escrita à mão | Pest, `it('todo model em tabela com posto_id usa PertenceAoPosto')` | `backend/tests/Feature/Arquitetura/EscopoDeTenantTest.php` | ✅ ATIVA — canário conferido em 20/09: tirar o trait de `Cadastro\Domain\Bico` deixa o gate vermelho apontando o model |
| TEN-2 | Exceção a TEN-1 só com motivo escrito (mais de 40 caracteres), apontando model real em tabela escopada | mesmo arquivo | idem | ✅ ATIVA — canário: exceção sem motivo reprova. Exceção registrada: **1**, `UsuarioPosto` (é a tabela que decide o acesso; escopá-la pelo posto atual seria circular) |
| TEN-3 | Model em tabela **sem** `posto_id` declara COMO é escopado: tenant-raiz, filho de escopado, ou atravessa tenants | mesmo arquivo | idem | ✅ ATIVA — 4 declarados: `Posto`, `Usuario`, `Recebimento`, `App\Models\User` |
| TEN-4 | Toda tabela de domínio tem `posto_id NOT NULL` com FK | — | — | ❌ SEM TRAVA — medido em 17/09: 31 de 45 têm a coluna, só 4 como `NOT NULL`, 4 sem FK; `AuditoriaDados` e `InscricaoPush` não têm a coluna. TEN-1 cobre o lado PHP; o lado do **esquema** segue sem gate |
| TEN-5 | Unique de tabela escopada inclui `posto_id` | Pest, `it('🔴 BLOQUEIO DE MULTI-TENANT: dois postos não podem ter estoque do mesmo combustível')` | `backend/tests/Feature/Estoque/DescontaLitrosVendidosTest.php` | ⚠️ **VIOLADA, e agora PROVADA** — medido no catálogo em 20/09. Cinco uniques de tabela escopada **não** incluem `posto_id`, e cada um impede dois postos de coexistir: **`Fechamento (data, turno_id)`** — o pior, dois postos não podem fechar o MESMO DIA, e `turno_id` é sempre 1 —, `Estoque (combustivel_id)`, `Configuracao (chave)`, `Fornecedor (cnpj)` e `Frentista (cpf)`. Os outros quatro uniques de tabela escopada estão OK, porque o pai já é escopado: `Bico (bomba_id, numero)`, `Escala (frentista_id, data)`, `FechamentoFrentista (fechamento_id, frentista_id)`, `Leitura (bico_id, data)`. **Multi-tenant é impossível hoje sem migration** — não é melhoria, é bloqueio. O teste AFIRMA a limitação e fica vermelho quando ela cair |

> **Por que TEN é família própria:** Deptrac, PHPStan 9, PHPMD e Pest Arch passam **verdes** num model
> que esqueça o trait — nenhum deles tem o conceito de tenant. Com um posto só isso é invisível; em
> multi-tenant é o dado de um cliente na tela de outro.

> **TEN-4 e TEN-5 são a metade que falta.** TEN-1..3 protegem o **código**; o **esquema** segue aberto.
> Enquanto forem ❌, ligar dois postos no mesmo banco quebra por unique antes de quebrar por escopo. São
> as duas primeiras tarefas do Design Doc de multi-tenant (`docs/design/multi-tenant.md`).

> **Dívida declarada por TEN-3:** `App\Models\User` é sobra do instalador — sem `$table`, sem uso, e a
> tabela `users` não existe no catálogo de produção. Passava invisível por **todos** os gates até 20/09.
> Apagar é tarefa aberta.

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
| TS-6 | `any` proibido | `@typescript-eslint/no-explicit-any` | `frontend/eslint.config.mjs:45` | ⚠️ PARCIAL — **só no CI**. Hoje: 0 `any` em produção, 7 em teste com `disable` explícito |
| TS-7 | Retorno explícito na fronteira de módulo | `explicit-function-return-type` | — | ❌ SEM TRAVA |
| TS-8 | `enum` do TS proibido (usar union de literais) | — | — | ❌ SEM TRAVA — hoje: 0 `enum`. É disciplina, não gate |
| TS-9 | Data de calendário nunca por `toISOString().split()` | `no-restricted-syntax` | `frontend/eslint.config.mjs:68-80` | ⚠️ PARCIAL — só no CI |
| TS-10 | kebab-case em arquivo e pasta | — | — | ❌ SEM TRAVA — 187 de 435 fora do padrão. Dívida aceita; `git mv` em massa colide com o strangler |

> **A assimetria que anula metade das travas:** `pre-commit` e `pre-push` rodam **oxlint**;
> o CI roda **oxlint + eslint**. As regras de *forma* (complexidade) estão no oxlint; as de
> *conteúdo* (`any`, `toISOString`, e todas as type-aware) estão no eslint. **Quem commita
> e dá push localmente não é barrado por nenhuma regra de conteúdo.** Fechar essa assimetria
> vale mais que acrescentar qualquer regra nova.

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
2. **Fechar a assimetria oxlint × eslint** (TS-6, TS-9 e futuras type-aware passam a valer
   no `pre-push`). Não custa regra nova — só faz valer as que já existem.
3. **CA-2:** quebrar `Http` em dois no `deptrac.yaml`. Devolve o dente que o #111 tirou.
4. **PROC-5:** canário para cada Quality Gate. Sem isso nenhum ✅ desta tabela é confiável.
5. **FSD-1..4** via `eslint-plugin-boundaries`, escopado **só às pastas FSD**.
6. **TS-1..5:** ligar type-aware linting.
7. **RES-1..4:** Result Pattern — depende de decisão do dono e não pode tocar função de
   dinheiro sem golden.

## O que este arquivo não decide

- **Qual biblioteca de Result** (RES). Precisa de "ok" do dono.
- **Se o teto de CCN é 10 (§6 do `CLAUDE.md`) ou 20 (`.oxlintrc.json`)**. Os dois números
  estão escritos no repositório e se contradizem.
- **Mover pasta do legado para FSD.** Fora de escopo por decisão: destrói `git blame`
  durante a auditoria de dado real.
