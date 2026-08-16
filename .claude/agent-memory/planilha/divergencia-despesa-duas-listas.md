---
name: divergencia-despesa-duas-listas
description: despesa_categoria_mensal (lista da planilha) e despesa_lancada (lista do app) discordam no total e na contagem; qual é a autoridade do rateio
metadata:
  type: project
---

Há **duas** listas de despesa no `posto_jorro_2026.sqlite` e elas **não batem**,
nem no total nem no número de itens, em nenhum dos meses conferidos:

- `despesa_categoria_mensal` — a lista **da planilha**. Uma linha por rubrica,
  com muitos `valor IS NULL` (rubrica prevista e não gasta) e **uma linha
  `'Total.'` que é o total, não uma despesa**. Somar sem excluir `'Total.'`
  dobra o mês.
- `despesa_lancada` — a lista **do app**, com `data`, `descricao`, `categoria`
  normalizada e `status`. Todas as linhas do mês caem no último dia
  (`AAAA-MM-último`), então `data` não serve para série temporal.
- `despesa_mensal` — uma linha por mês, e o valor **reproduz o `'Total.'` da
  planilha**, não a soma da `despesa_lancada`.

**Why:** a planilha e o app foram alimentados separadamente; a `despesa_lancada`
tem rubricas que a planilha não tem e vice-versa. Qual é autoritativa **não é
decisão minha** — e a memória de sessão `.claude/memoria/despesa-vem-do-banco.md`
diz que para o rateio vale a tabela `Despesa` do **Supabase**, que é uma terceira
fonte, hoje zerada pelo replay.

**How to apply:** ao responder despesa, devolver **as duas** com contagem e nome
da tabela (regra 4), e dizer que `despesa_mensal` segue a planilha. Quando a
pergunta for **custo operacional por litro**, avisar que o divisor muda conforme
a lista escolhida — é fórmula de dinheiro, o dono decide.

Queries (16/08/2026):

```sql
SELECT COUNT(*), SUM(valor) FROM despesa_categoria_mensal
 WHERE ano=? AND mes=? AND categoria <> 'Total.';
SELECT COUNT(*), SUM(valor) FROM despesa_lancada WHERE ano=? AND mes=?;
SELECT valor FROM despesa_mensal WHERE ano=? AND mes=?;
```
