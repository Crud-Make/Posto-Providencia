---
name: refatoracoes-do-fechamento-que-nao-entraram
description: O que já falhou ao mexer no fechamento/lucro — revert 0f201ef (08/01/2026), o loop de 3 minutos de 12/08/2026, e os PRs #6/#33/#29 fechados sem merge cujos commits o rewrite de 29/07 levou
metadata:
  type: project
---

**Quatro fracassos registrados, e nenhum deles é "a refatoração era ruim".**

**1. `0f201ef` (08/01/2026) — `Revert "refactor: integra hooks useAutoSave e
useFechamento (#7)"`.** Reverteu só o `TelaFechamentoDiario.tsx` (+90/−56). O
corpo do revert é vazio, e **o original não pode ser lido**: ele aponta para
`5cd4c943aabdb6b7527b1121494a361c39f3aa9a`, que **não resolve** — baixa do
rewrite de 29/07/2026, não erro de hash. Os irmãos dele entraram e ficaram
(`343351b` useLeituras, `6e99d0d` usePagamentos, `f74cd83` useCarregamentoDados,
`cddc32f` utils+types). **Só a dupla `useAutoSave`+`useFechamento` voltou atrás**
— e é justamente a que o saneamento atual encosta.

**2. O loop de 3 minutos de 12/08/2026 — conclusão certa, causa errada.**
- 21:06 `f7fb27e` *"fix(lucro): remove a despesa trimestral, que nunca existiu"*
  — removeu 11 asserções do `lucro-real.golden.spec.ts` com corpo longo e
  convincente ("varredura de toda célula das 12 abas não achou nada").
- 21:09 `7740858` reverteu.
- 21:19 `56fea0e` *"feat(etl): despesa passa a vir do banco…"* achou a verdade:
  a lista **era real** (R$ 195.230,40, 108 lançamentos), só não estava na
  planilha — estava na tabela `Despesa` do Supabase. Renomeada para
  `despesa_lancada`. *"O erro nunca foi o número — foi o nome."*

  **Lição do próprio commit:** *"dado sem procedência escrita é dado que alguém
  vai apagar por engano"*. Antes de declarar que um número de custo/despesa
  "não existe", checar o **banco**, não só a planilha — §6 dá autoridade
  diferente a cada fonte.

**3. PRs #6 e #33 — refatoração da tela de fechamento, fechada sem merge duas
vezes.** Branch `refactor-fechamento-caixa-17092421559033174341`, gerada pelo
bot **Jules**. +1181/−1305 em 10 arquivos: extraía `FechamentoCharts`,
`FechamentoFinanceiro`, `FechamentoFrentistasTable`, `FechamentoLeiturasTable`,
`constants.ts`, `types.ts`, `utils.tsx` de `TelaFechamentoDiario.tsx`.
Aberta em 08/01/2026, ficou **7 meses parada**, fechada em 29/07/2026. Reaberta
como #33 no mesmo dia e fechada 5 minutos depois.
Mesmo padrão em #25/#34 (`fix/#24-restaurar-layout-fechamento`) e #29
(`feature/refactor-final-sprints-4-5`, +435/−2700 em 35 arquivos).

**4. Os HEADs desses PRs não existem mais localmente** (`0c54889`, `5b7d22e`,
`36561041` — nenhum resolve): rewrite de 29/07. **Mas o GitHub ainda serve o
diff**, e é a única via:
```bash
gh pr diff 6   > /tmp/pr6-refactor-fechamento.patch
gh pr diff 29  > /tmp/pr29-sprints-4-5.patch
```
Vale como leitura de "o que já se tentou"; os caminhos são pré-monorepo
(`components/…`, não `apps/web/src/…`).

**How to apply:** ao propor extrair componentes/hooks do fechamento, dizer que
isso já foi tentado (#6) e por que morreu — PR gigante de bot, aberto 7 meses,
sem dono. O modo que **funcionou** nesta base foi commit pequeno com golden
junto (`db8aa5d`, `2a97224`, `0296430`).

Ver [[custo-duas-formulas-quem-nasceu-primeiro]] e
[[aggregator-nasceu-como-legacy-service]].
