---
name: lucro-bruto-e-folha-onde-ficam
description: lucro bruto não existe em tabela mas fecha ao centavo como Σlucro_bico + despesa_mensal; folha de pagamento é rubrica com nome de pessoa "= dia" na planilha e categoria 'Folha de Pagamento' no app; agosto do app é cópia da planilha
metadata:
  type: reference
---

Conferido em 06/09/2026 nos dois sqlite (docs/data velho e staging 30/08), nos 8
meses, delta 0,00 em todos.

**Lucro bruto (receita − custo do combustível) não está em coluna nenhuma**, mas
a identidade abaixo fecha ao centavo, o que também prova o mapa bico→produto:

```
Σ resumo_mensal_bico.lucro_bico + despesa_mensal.valor
  = Σ resumo_mensal_bico.venda − Σ (litros_bico × compra_mensal.media_lt do produto)
```

Mapa (por substring do nome do bico): `Bico 04` → `Ds.10.`, `Bico 03` →
`Etanol.`, `Bico 02` → `G,Aditivada.`, `Bico 01/05/06` → `G,Comum.`. É o
método da planilha (média de compra do próprio mês, ver
[[custo-produto-media-do-proprio-mes]]); não é custo por fluxo de estoque.

**Folha de pagamento — onde fica em cada lista** (ver
[[divergencia-despesa-duas-listas]]):

- `despesa_categoria_mensal` (planilha): rubrica é `Nome = NN` (NN parece dia
  de pagamento). `FGTS.`, `Recibo Declaraçao` e `Despesa extras` existem como
  rubrica mas ficam `NULL` em todo mês. `Contador - 05` e `Sistema - 05` não
  são folha. Não há INSS, pró-labore, férias, 13º nem vale. Rubricas com
  sufixo `Pousada` (Mery, Sinho) — não dá para saber pelo dado se é outro
  negócio do dono.
- `despesa_lancada` (app): `categoria IN ('Folha de Pagamento','Encargos
  Sociais')`. Nomes e valores **não batem** com a planilha (ex.: Rosimeire só
  no app; Mery/Sinho só na planilha). **Agosto do app é cópia da planilha**
  (`categoria = descricao`, mesma soma) — não é segunda fonte nesse mês.
- Quem está na escala vem de `frentista_dia_total.frentista` (cabeçalho do
  bloco diário); `Posto - Jorro` não é pessoa. Os nomes da escala e da folha
  divergem em grafia (Filip/Felip, Meiri/Mery?) — não juntar por string.

```sql
SELECT categoria, valor FROM despesa_categoria_mensal
 WHERE mes=? AND valor IS NOT NULL AND categoria<>'Total.';
SELECT descricao, categoria, valor FROM despesa_lancada
 WHERE mes=? AND categoria IN ('Folha de Pagamento','Encargos Sociais');
SELECT frentista, COUNT(DISTINCT dia) FROM frentista_dia_total
 WHERE mes=? AND venda_frentistas IS NOT NULL GROUP BY frentista;
```
