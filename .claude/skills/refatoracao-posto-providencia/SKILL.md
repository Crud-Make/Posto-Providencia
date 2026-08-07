---
name: refatoracao-posto-providencia
description: Use esta skill sempre que for propor, avaliar ou planejar uma refatoração de código no monorepo do Posto Providência — arquivos grandes demais, lógica duplicada, componente misturando fetch/cálculo/view, ou qualquer pedido do tipo "isso tá certo?", "como organizar isso melhor", "vale a pena refatorar X". Ela define o vocabulário de diagnóstico (seam, leverage, locality, deletion test), a escala de confiança (Strong / Worth exploring / Speculative), e a regra mais importante do processo: refatoração estrutural (organização) e mudança de fórmula (cálculo de dinheiro) são categorias separadas e NUNCA devem ser misturadas na mesma tarefa sem golden master. Consulte também fechamento-posto-providencia e etl-planilha-posto-providencia para regras de domínio financeiro.
---

# Refactoring — Posto Providência

> **Language:** these instructions are in English; **all output to the owner is
> in Brazilian Portuguese (pt-BR)**, as is all code, comment, commit and UI text
> (CLAUDE.md §0.1). Domain nouns stay in Portuguese — `valor_conferido`,
> `diferenca`, `fechamento`, `frentista`, `bico`. The diagnostic vocabulary
> below (seam, leverage, locality, deletion test) stays in English on purpose:
> those are the terms the owner already uses.

## Central rule: organising ≠ correcting

Every refactor falls into one of two categories, and the category decides the
process:

1. **Structural (organisation/maintenance)** — moving code around, separating
   responsibilities, extracting a component/hook, without changing any output or
   formula. Done criterion: clean type-check + displayed values identical to
   before.
2. **Domain (formula/money calculation)** — any change touching
   `valor_conferido`, `diferenca`, `projectedProfit`, `totalizers`, lucro,
   custo, metas, or any business arithmetic. Requires a golden master (a test
   against real data, see `fechamento-posto-providencia`) BEFORE the task counts
   as done — never after.

**Never mix the two in the same task.** If a structural refactor exposes an
untested formula (e.g. promoting `projectedProfit` into `packages/utils` for
reuse), it automatically becomes category 2 and needs a golden master before
merge — even if the original intent was only to organise.

When the request is ambiguous ("let's tidy up this component"), ask or confirm
explicitly: "is this only moving code around, or are we changing/exposing a
formula too?" — the answer changes the entire process.

## Diagnostic vocabulary

When investigating a file/module as a refactor candidate, describe the problem
using these terms (do not invent others):

- **Seam**: a testable separation point between parts of the code. No seam = you
  cannot test one part without assembling/running the others.
- **Leverage**: how many places a change affects. High leverage = one fix
  resolves N call sites (a good reason to extract).
- **Locality**: where a likely future change will need to happen. Low locality =
  changing one business rule today requires touching several files.
- **Deletion test**: ask "if I delete this code, what breaks and where will the
  logic reappear?". If the answer is "it will be rewritten somewhere else", that
  is a sign the code already deserves to become a shared module.
- **Deep vs. shallow module**: a deep module has a small interface hiding a
  large implementation (good). A shallow module has interface ≈ implementation —
  the abstraction is not worth it.
- **Leak**: when a responsibility (fetching, calculation, formatting) leaks into
  a layer that should not carry it (e.g. a profit formula inside a React
  component).

## Confidence scale for candidates

Classify every refactor candidate into one of these three, and order the work by
confidence, not by appetite:

- **Strong**: follows a pattern already validated in production in the same
  domain (it has "siblings" that already did the same extraction), low risk,
  immediate and clear gain.
- **Worth exploring**: real gain, but larger scope, more affected files, or
  dependent on confirming something (e.g. two similar-looking visual adapters
  that may or may not be the same concept).
- **Speculative**: a hypothetical unification or abstraction — only one instance
  exists today; do not force generalisation before a second real case appears.

Do not promote a "Worth exploring" candidate to "Strong" out of impatience; and
do not block a "Strong" one while waiting to decide the others.

## Step-by-step process

1. **Diagnose** the file/module using the vocabulary above — name the specific
   leak, do not just say "it is messy".
2. **Find the "siblings"** — modules in the same domain that already went
   through the same kind of refactor. Copying a validated shape is always
   Strong; inventing a new shape is Worth exploring at best.
3. **Split candidates by category** (structural vs. domain) before ordering by
   priority.
4. **Order**: Strong structural first (lowest risk, immediate gain) → Worth
   exploring structural → any domain candidate only after the golden master is
   written → Speculative gets recorded but does not become a task until a second
   real case exists.
5. **Scope per PR**: one hook/component extraction = one PR. Swapping formatters
   or consolidating duplicated logic that touches 10+ files is always a separate
   PR — never a side-quest inside a smaller refactor.
6. **Done criterion**:
   - Structural: clean type-check, identical output/render, file measurably
     smaller.
   - Domain: golden master passing before the merge, not after.

## Mistakes to avoid (observed in real sessions)

- Moving a money formula into a new hook/module believing it was "just
  reorganised", when in fact the formula only changed address without being
  tested (with no golden master, the financial risk remains).
- Unifying two similar-looking visual components (e.g. two "stat cards") just
  because they look duplicated — if they represent different concepts, or only
  one instance of each exists, that is Speculative, not Strong.
- Mixing a small structural refactor with a large scope change (e.g. swapping a
  local formatter for a canonical one that affects 13 files) in the same task.
- Writing the golden master AFTER moving the formula instead of before — the
  order matters because the test exists to prove the extraction did not change
  the number, not merely that the number "looks right" today.

## Related references

- `fechamento-posto-providencia` — golden master rules, the `valor_conferido`/
  `diferenca` formulas, where the tests live.
- `etl-planilha-posto-providencia` — extraction and import rules from the
  `.xlsx`. It is about how data ENTERS the database, not about the formula: when
  the question is "which calculation is correct", the source is
  `fechamento-posto-providencia`; when it is "what was this number in reality",
  it is the `planilha` agent.
- The monorepo's `CLAUDE.md` — general structural rules (FSD, domain calculation
  in `packages/utils`, naming conventions). This skill assumes those rules but
  does not replace them; in case of conflict, the repo's `CLAUDE.md` decides.
