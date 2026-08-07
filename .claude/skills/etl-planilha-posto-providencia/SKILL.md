---
name: etl-planilha-posto-providencia
description: >-
  Regras obrigatórias pra extrair dado da planilha real do Posto Providência
  (.xlsx) e importar pro banco (Supabase/Postgres) sem perder ou corromper
  dado. Use SEMPRE que for escrever ou rodar um script de importação/ETL a
  partir de um .xlsx do posto, ou que for atualizar uma importação já feita
  quando uma planilha nova chegar (ex.: "atualizado.xlsx"). Encoda 3 bugs
  reais já descobertos e corrigidos numa extração real desta planilha — não
  são hipotéticos, já aconteceram. Nunca importe direto pro banco de
  produção sem passar pelos 2 estágios abaixo.
---

# etl-planilha-posto-providencia

> **Language:** these instructions are in English; **all output to the owner is
> in Brazilian Portuguese (pt-BR)**, as is all code, comment, commit and UI text
> (CLAUDE.md §0.1). Domain nouns and spreadsheet labels stay in Portuguese —
> they are the literal strings this ETL matches on: `Caixa Dia`, `Produtos`,
> `POSTO JORRO 2026`, `frentista`, `bico`, `encerrante`, `Inicial`,
> `Fechamento`, `dado_incompleto`. Never translate them.

This spreadsheet is hand-made (see the `fechamento-posto-providencia` skill for
the domain's naming and formulas; to look up an already-extracted value, use the
`planilha` agent) — the layout changes between months, it has real data gaps,
and it has more than one table for "the same thing" which can disagree. An
import script that assumes a fixed structure **will** produce wrong numbers
silently.

Golden rule: **never trust what you extracted until you validate it against an
independent total.**

## The 2 mandatory stages

**Stage 1 — Raw staging.** Extract into a neutral format (JSON/CSV), faithful to
the spreadsheet, without interpreting or mapping to the system schema yet.
Preserve every value exactly as it is, including `None`/blanks — a blank does
not become zero, and does not become an omission.

**Stage 2 — Validated mapping.** Only after checking stage 1, map to the real
table names of the system. Every imported month must reconcile against an
independent total (the monthly summary sheet `POSTO JORRO 2026`, which already
carries litres/sales/profit per month) before it counts as correct. If it does
not reconcile, **stop at that month and investigate** — do not move on to the
next month assuming "it must be just this one".

Never migrate everything at once. Month by month, confirming each one before
advancing.

## The 3 real bugs already found (these are not hypotheticals)

### 1. Never use a fixed row offset to find the end of a day block

Each day's block (`Caixa Dia NN Posto Jorro.`) has a variable size — it changes
per month and per day. If you search for a label (e.g. `"Produtos"`) inside a
fixed window (`start_row` to `start_row+40`), and the day **has no data** (a day
that has not happened yet, or was never filled in), the search **leaks into the
next block** and reads another day's data — or worse, the monthly consolidation
block (`Caixa Dia 01 a 31`) — as if it belonged to that day.

**Mandatory fix**: find ALL the `Caixa Dia` labels in the sheet first, in order,
and use the position of the NEXT label as the search boundary for the current
day. Never a fixed number of rows.

```python
labels = [(row, label) for row, label in todas_as_linhas_com_label]
labels.append((ultima_linha+1, "__FIM__"))
for i in range(len(labels)-1):
    inicio, fim = labels[i][0], labels[i+1][0]   # never go past `fim`
```

### 2. `Litros = Fechamento − Inicial` without checking both exist yields garbage, not a visible error

When a bico's `Inicial` OR `Fechamento` encerrante is missing on a given day, the
spreadsheet computes the subtraction treating the missing side as zero —
producing an absurd number (in this real spreadsheet it reached **−3.4 million
litres in a single day**). It raises no error and visibly breaks nothing — a
monstrous number just enters your aggregate and destroys any sum or average that
passes through it.

**Mandatory fix**: before computing litres, check that `inicial is not None and
fechamento is not None`. If either is missing, **mark the day as
`dado_incompleto` and store `litros = null`** — never let the subtraction run
with one side absent. Record the reason (which bico, which field was missing) so
it becomes a manual-correction item later, not a silent bug in the database.

### 3. A day slot beyond the month's real calendar is not an "empty day" — it may hold garbage

Every monthly sheet has slots up to day 31, even in shorter months (February,
30-day months). A slot beyond the real calendar:
- Is usually empty — fine, ignore it.
- But sometimes holds the whole month's consolidation "leaked" into it (real
  finding: February, with only 28 days, had the WHOLE MONTH's total stored in
  the "day 31" slot, doubling the sum if you did not know about it).

**Mandatory fix**: compute the month's real number of days
(`calendar.monthrange(ano, mes)`) and **ignore any day slot beyond that
number**, even if it appears to have data inside.

## Per-month import checklist

- [ ] Day blocks bounded by the next real label, never a fixed offset
- [ ] Litres/values computed only when both sides (inicial/fechamento) exist;
      the day marked incomplete when they do not
- [ ] Slots beyond the month's real calendar (`calendar.monthrange`) ignored
- [ ] The `Caixa Dia NN a NN` block (consolidation) excluded — never treated as
      a day
- [ ] Frentista names and payment methods read from EACH block's header, never
      hardcoded by column position (it changes per month — see the
      `fechamento-posto-providencia` skill)
- [ ] The imported month's total litres/sales reconcile with the monthly summary
      sheet (`POSTO JORRO 2026`) — if they do not, stop and investigate before
      moving on
- [ ] If the spreadsheet has more than one table for "the same expense/value",
      confirmed with the owner which is the source of truth before choosing
      (real finding: two monthly expense tables disagreed by up to 4x)
- [ ] The original spreadsheet (`.xlsx`) preserved in `docs/data/` **on disk and
      outside git**, never discarded after the import. `docs/data/` has been in
      `.gitignore` since the real-data incident of 29/07/2026 (CLAUDE.md §6): it
      is a local auditable source, and committing it reopens the incident. The
      original `.xlsx` is never edited either
- [ ] Script is idempotent — it can be re-run when an updated spreadsheet
      arrives, without duplicating or corrupting what was already imported

## Sign that something is wrong

If an aggregate total (litres, sales, expenses) has a magnitude far larger
(orders of magnitude) than other months/days — **it is not an exceptional month,
it is an extraction bug or a data gap**. Stop and investigate the exact origin
(which bico, which day, which cell) before moving on.
