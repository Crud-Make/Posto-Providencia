---
name: travas-substituem-modelo-caro
description: "21/09 do dono — quem termina a refatoração é o DeepSeek V4, então a qualidade tem de morar na ferramenta, não no modelo; travas faltantes viram prioridade sobre feature"
metadata: 
  node_type: memory
  type: project
  originSessionId: 05f6fde6-e78e-4fb4-ada0-87339211356e
  modified: 2026-09-22T01:26:58.816Z
---

Decisão do dono em 21/09/2026: **quem vai terminar a refatoração é o DeepSeek V4.1**, porque
o Max vence em 23/09 (ver [[assinatura-max-acaba-20-09-troca-openrouter]]). A conclusão dele,
e ela está certa: com todas as regras **implementadas em ferramenta** — mais o grafo do
graphify como porta de entrada — um modelo menor entrega com a mesma qualidade de código.

**Why:** regra que vive em `CLAUDE.md`, em comentário de YAML ou em Design Doc é um recado
para o modelo, e recado é a primeira coisa que um modelo menor ignora. `composer gates` não
fica mais fraco porque quem escreveu o código é DeepSeek — o Deptrac, o PHPStan nível 9, o
PHPMD e a cobertura de 85 % reprovam igual. Isso inverte a prioridade: **ligar a trava que
falta passa a valer mais do que entregar a próxima fatia**, porque cada trava ligada é
qualidade que sobrevive à troca de modelo, e cada fatia entregue sem trava é dívida que o
modelo menor vai ampliar.

**How to apply:** antes de abrir fatia nova, olhar `docs/arquitetura/regras.md` e ligar o que
está ❌ SEM TRAVA ou ⚠️ PARCIAL. As duas pendentes em 21/09: **CA-2** (controller não fala com
`Domain` — a regra está num comentário do `deptrac.yaml` e o Deptrac não distingue Resource de
Controller, então a trava tem de ser Pest Arch encadeada) e **CA-5** (complexidade do
frontend: `oxlint` em 20 com 13 arquivos isentos em 35, enquanto o `CLAUDE.md` §6 manda 10 —
no teto 10 são 70 funções fora, logo é trabalho de catraca, não de virar a chave).
Vale a regra de [[gate-verde-sem-canario-nao-vale]]: trava nova só entra com canário, e a de
[[pest-arch-e-phpstan-mentem-verde]]: `arch()` com lista de namespaces ou com closure NÃO
reprova. Ver também [[regras-tem-de-ser-implementadas]] e [[registro-de-regras-de-arquitetura]].
