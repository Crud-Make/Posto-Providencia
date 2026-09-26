---
name: fechamento-posto-providencia
description: >-
  Fonte de verdade do domínio de fechamento de caixa do Posto Providência
  (monorepo Bun, frontend/apps/web + frontend/apps/pwa-frentista + frontend/packages/utils, Supabase).
  Use SEMPRE que houver dúvida sobre regra de negócio, cálculo, nomenclatura
  ou estrutura do fechamento ("como calcula X?", "de onde vem esse
  valor/nome", "qual é a fórmula certa"), ao mexer em qualquer lugar que
  calcule `valor_conferido`/`diferenca` (PWA, hooks do web, services,
  aggregator), ou ao mexer no módulo canônico frontend/packages/utils/src/fechamento.ts
  e nos arquivos de frontend/apps/ que o consomem. Em conflito entre intuição e
  o dado real de janeiro (docs/data/janeiro_referencia.sqlite), o dado real
  decide. Toda fórmula aplicada exige teste golden master correspondente
  antes de a tarefa ser considerada pronta — e NUNCA consolide as
  implementações duplicadas sem antes ter o teste rodando contra todas elas.
---

> **Só o Fable 5 mexe em regra de cálculo (decisão do dono, 18/09/2026).** Editar
> `frontend/packages/utils/src/*.ts`, o `aggregator.service.ts` ou um golden/regressão de
> dinheiro com outro modelo é barrado pelo hook `.claude/hooks/so-fable-na-formula.py`.
> Sessão principal: `/model fable`. Subagente/workflow: `model: 'fable'`. Ler é livre.

# fechamento-posto-providencia — domain + safe-refactoring rule

> **Language:** these instructions are in English; **all output to the owner is
> in Brazilian Portuguese (pt-BR)**, as is all code, comment, commit and UI text
> (CLAUDE.md §0.1). Domain nouns stay in Portuguese because they are the real
> identifiers in the code, the database and the spreadsheet: `fechamento`,
> `frentista`, `bico`, `encerrante`, `concentrador`, `valor_conferido`,
> `diferenca`, `baratao`. Never translate them.

Posto Providência is a real fuel-station management system (owner's own use,
real data). Its core is the **daily cash closing** (`fechamento de caixa`):
reconciling what each `frentista` collected per payment method against what the
`bicos` (pump nozzles, via their `encerrante` readings) indicate, producing
`diferenca` (sobra/falta) and `valor_conferido`.

## Consolidation status — done

`valor_conferido`/`diferenca` was once **duplicated across ~6 implementations**
scattered over `frontend/apps/pwa-frentista`, `frontend/apps/web` hooks, services and the
aggregator. Today the calculation is single, in
`frontend/packages/utils/src/fechamento.ts`. Dead code removed:
`frontend/packages/utils/src/calculators.ts` and `dates.ts` no longer exist.

The **last two places** that summed buckets by hand were closed on 02/08/2026 —
`aggregator.service.ts` and
`components/frentistas/hooks/useHistoricoFrentista.ts` now read
`diferenca_calculada` (the canonical difference stored when the fechamento is
submitted) instead of recomputing. Before that they omitted moedas/baratão and
flagged `'Divergente'` on correct sessions. **Both files carry a comment
explaining the decision — do not "fix" them back into manual sums.**

> Consumer count verified on 06/08/2026: **12 production files under `frontend/apps/`**
> import the canonical module, plus **3 test files**. (Counting the
> `frontend/packages/utils/src/index.ts` barrel that re-exports it, 13 production files
> repo-wide.) This number ages with every feature — recount with the command in
> `.claude/agents/grafo.md`, and do not trust this line on its own. Filtering by
> symbol is mandatory: `@posto/utils` is a barrel over 8 modules, and there is
> an unrelated `frontend/apps/web/src/types/fechamento.ts` that inflates a naive count by
> more than 2x.

**The rule that outlives the consolidation:** this codebase's recurring failure
mode is a NEW copy of the formula being born inside a hook or a service. If you
find one, **never consolidate before you have a test; never write the test after
consolidating.** Mandatory order:

1. Write a golden master test against `docs/data/janeiro_referencia.sqlite`
   exercising **each existing implementation** (as far as you can isolate them
   without rewriting anything yet) over the same January days.
2. Where they all match the reference → that is the correct behaviour, confirmed
   by real data.
3. Where they disagree with each other → **stop and confirm with the owner**
   which one is right before choosing — one of them may be a bug, do not assume.
4. Only then point everyone at `frontend/packages/utils/src/fechamento.ts`, swapping call
   sites **one at a time** and running the same golden master after each swap —
   never in bulk.

## Calculation architecture

The fechamento calculation runs **on the front-end**, not in the backend/Edge
Function. The logic must be **pure and I/O-free** so it can be tested in
isolation:

```
frontend/packages/utils/src/fechamento.ts    ← pure functions. The real API today:
                                        cartao(), conferido(), diferenca(),
                                        isFalta(), isSobra(), breakdown(),
                                        meiosFromFechamentoRow(),
                                        meiosFromPwaPayments().
                                        No fetch, no Supabase client,
                                        no side effects.
frontend/packages/utils/src/fechamento.test.ts         ← vitest, unit
frontend/packages/utils/src/fechamento.golden.spec.ts  ← bun:test against real data
```

⚠️ **There is no `valorConferido()` and no `litros()`** — the name of the
7-bucket sum is **`conferido()`**. Check the signature in the file before
writing the call.

**The two runners do not mix** (CLAUDE.md §7): the unit `.test.ts` files are
vitest and run under `bun run test`; the golden `.golden.spec.ts` files are
`bun:test` and run under `bun run test:golden`. **Never plain `bun test`** — it
sweeps the whole repo, tries to execute the vitest files and produces failures
that are not bugs.

Components in `frontend/apps/web` and `frontend/apps/pwa-frentista` **call** these functions —
they never reimplement the formula locally. A formula inside a component, hook
or service is debt: flag it before replicating it.

## Golden master with bun:sqlite

`docs/data/janeiro_referencia.sqlite` is the source of truth validated against
real January data. Use `bun:sqlite` (built in, no new dependency) to read the
expected values inside the test:

```ts
import { Database } from "bun:sqlite";
import { test, expect } from "bun:test";
import { conferido, diferenca } from "./fechamento";

const db = new Database("docs/data/janeiro_referencia.sqlite", { readonly: true });

// adjust the query to the reference sqlite's real schema
const dias = db.query("SELECT * FROM fechamentos_janeiro").all();

for (const dia of dias) {
  test(`diferenca bate com referência — dia ${dia.data}`, () => {
    expect(diferenca(dia.total_concentrador, dia.total_conferido))
      .toBe(dia.diferenca_esperada);
  });
}
```

If the reference sqlite's schema differs from what the query above assumes,
**check the file's real structure before writing the test** — do not guess
column names.

## Canonical fechamento formula

- The **total declared** by the frentistas is declaratory and stays **separate**
  from the **valor conferido** (what actually landed in the till).
- **Electronic receipts already make up the valor conferido — do not add them
  again.**
- `diferenca = total_concentrador − total_conferido` (in that order — **FALTA is
  positive, SOBRA is negative**). Confirmed empirically against real January
  data (days 1–3): when conferido exceeds concentrador, there is surplus cash in
  the till (negative difference); when conferido is lower, cash is missing
  (positive difference). `isFalta = diferenca > 0` is the correct
  implementation.
- Per bico: `litros = encerrante_final − encerrante_inicial`;
  `valor = litros × preço_litro`. A day's opening encerrante is the previous
  day's closing encerrante on the same bico.
- **Glossary:** `bico` = fuelling point; `concentrador` = electronic reading
  from the pumps (the "official" sale); `frentista` = the attendant;
  `encerrante` = the bico's cumulative meter reading.
- **Composition of the valor conferido — empirically confirmed** against
  `janeiro_referencia.sqlite` (136 of 142 rows match exactly, half-centavo
  tolerance): `conferido = pix + credito + debito + moeda + notas + baratao +
  dinheiro`. It includes moedas, baratão and nota a prazo — it is not just
  cash + card + pix.
- **Known exception — the 31st of each month**: 6 rows where the total is ≈1.8×
  the expected sum. They appear to be monthly consolidation rows, not daily
  fechamentos. **They stay out of the golden master for now** — do not model
  them as a bug in the normal day; investigate separately before including them
  in the test.

If any of these names or formulas shows up differently in the current code,
**the real January data decides, not intuition** — investigate the divergence
before "fixing" either side.

## Numbers: mind the float

Money and litres should not be added/subtracted as raw fractional `number` in
JS — floating-point rounding is the most common cause of a `diferenca` that is
"almost right but does not match". **Tested against all 142 January days: float
caused no practical error at this scale (136/136 exact within half a centavo)**
— but scale to integers (centavos, millilitres) before operating anyway, and
only scale back for display. This is not about today's bug, it is about the bug
that shows up when volume or precision changes.

## "Encerrante" OCR spike (branch `ocr`) — related context

The `ler-encerrante` Edge Function uses Gemini Vision as a stateless proxy to
read the printed encerrante slip: it is a report covering all 6 bicos at once,
in fixed order 1→6 — **one photo = 6 positional readings**, not a reading of an
individual display. Backend deployed; still missing the PWA UI and a real sample
photo to tune the prompt. This feeds the same `encerrante_inicial`/
`encerrante_final` used in the litres formula above — when integrating, validate
the read value against that same formula and, if possible, against the same
golden master.

## Checklist before closing any task in this area

- [ ] I checked the formula against `janeiro_referencia.sqlite` (or this skill),
      instead of assuming from intuition
- [ ] The logic lives in `frontend/packages/utils`, pure, I/O-free — not duplicated in
      PWA/web/service/aggregator
- [ ] I wrote a `bun:test` golden master (`*.golden.spec.ts`) comparing against
      January (where applicable), and ran it with `bun run test:golden` — never
      plain `bun test`
- [ ] If I found a new copy of the formula and I am consolidating: I ran the
      test BEFORE and AFTER swapping each call site, never swapped in bulk
- [ ] Tests use scaled/integer values wherever money or litres are involved, not
      raw fractional `number`
- [ ] Domain text and names are in pt-BR, consistent with the vocabulary above
