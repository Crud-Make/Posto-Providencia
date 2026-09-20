---
name: total-vendas-vale-o-encerrante
description: 20/09 — dono decidiu a §7 (d) da #103: o total_vendas que vale é o do ENCERRANTE, não a soma dos envios dos frentistas; destrava P8
metadata:
  type: project
---

**Decisão do dono em 20/09/2026**, resolvendo o item (d) do §7 de
`docs/design/fechamento-diario-api.md`, que estava pendente desde 18/09.

> **O `total_vendas` que vale é o do ENCERRANTE.** Nas palavras dele: *"quem manda é o
> encerrante"*.

**O motivo, e ele é o que importa guardar:** o fechamento recebe **vários envios diferentes, de
frentistas diferentes**, alimentando o mesmo encerrante. Somar os envios seria somar relatos
parciais de várias pessoas sobre o mesmo bico — o total sobra ou falta conforme quem deixou de
enviar. O encerrante é o medidor físico e acumulado do bico: **um número só, independente de
quantas pessoas passaram por ele.** Não tem esse modo de falha.

Isto bate com [[encerrante-nao-tem-turno]]: `Leitura` é por dia e por bico, **não por turno** —
filtrar encerrante por `turno_id` já produziu três bugs de uma vez. O encerrante ser a autoridade
reforça que ele não se divide por turno nem por frentista.

**Consequências:**
- A fatia **P8** (golden das somas do painel × `totaisDoDia`) esperava exatamente a (d) e deixa
  de estar bloqueada por ela.
- P8 continua sendo **mudança de fórmula**: golden antes, tarefa própria, e é trabalho do Fable
  pelo hook `so-fable-na-formula`. Ver [[so-fable-mexe-em-formula]].
- **Ainda pendentes** do §7: (b) Estoque no ressalvamento, (c) `DELETE+INSERT` × `UPSERT` em
  `FechamentoFrentista`, (e) a janela de escrita real, (f) a forma dos contratos. Elas seguem
  travando P10 e P11.

Na mesma conversa ele reafirmou o multi-tenant com a frase que virou o critério do gate:
*"tudo que funciona no 1 funciona no 2 com dados diferentes"*. Ver
[[porque-multitenant-e-o-destino]].
