---
name: timestamps-leitura-em-utc
description: As 1.230 linhas de Leitura estão gravadas em 00:00 UTC — converter para America/Sao_Paulo joga cada leitura para o dia anterior
metadata: 
  node_type: memory
  type: project
  originSessionId: b0cf8b27-0b49-44da-a82c-3a0c96c8839f
  modified: 2026-08-07T10:42:07.438Z
---

Medido em 07/08/2026: **todas as 1.230 linhas de `Leitura` têm `data` em
`00:00 UTC`**, sem exceção. `2026-01-01 00:00:00+00` é o dia 1º de janeiro.

Converter para `America/Sao_Paulo` (UTC−3) transforma isso em `2025-12-31 21:00`
— **cada leitura escorrega para o dia anterior**, e o 1º de janeiro sai do ano.
Eu caí nessa armadilha e cheguei a reportar ao dono que o banco inteiro estava
deslocado um dia. Estava errado: comparado em UTC, o banco bate com a planilha em
**199 dos 206 dias, ao mililitro**.

Por que isso importa para o código, e não só para consulta ad hoc: o
`package.json` roda as duas suítes com `TZ=America/Sao_Paulo`
(`test` e `test:golden`). Qualquer `toLocaleDateString`, `getDate()` ou
`new Date(...)` sobre `Leitura.data` reproduz o mesmo escorregão dentro do
produto.

**Não conferido:** se algum agregador do painel de fato converte para local. Vale
rastrear onde `Leitura.data` vira dia na UI antes de confiar em número de tela.

Ao consultar por dia/mês, usar sempre `AT TIME ZONE 'UTC'`.
