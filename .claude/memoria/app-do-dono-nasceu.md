---
name: app-do-dono-nasceu
description: Existe um terceiro app — frontend/apps/pwa-dono, o encerrante por foto — e a aba Encerrante SAIU do PWA do frentista
metadata:
  type: project
---

Desde 16/08/2026 o monorepo tem **três** apps. `frontend/apps/pwa-dono` é o PWA do dono:
uma tela só, fotografar o papel do encerrante e enviar a leitura das bombas. A
aba Encerrante **saiu** do `frontend/apps/pwa-frentista`.

**Por quê:** o encerrante nunca foi do frentista. `Leitura` é a leitura da
*bomba* e não tem coluna de frentista, e o plano original do OCR já dizia
"frontend/apps/web (dono) + frontend/apps/pwa-frentista (frentista)" — o plano está resgatado em
`.claude/docs/ocr-encerrante-plano-original.md`, depois de ter sido apagado e
gitignorado em `plans/`. A aba no app errado era o desvio.

**Como aplicar:**

- Não confunda com o campo `encerrante` do `FechamentoFrentista`, que **continua**
  no app do frentista: aquele é o total em R$ que ele declara do concentrador.
  Duas coisas, mesmo nome.
- O acesso a banco dos dois PWAs mora em `frontend/packages/api-core/src/encerrante.ts`,
  com o cliente Supabase injetado. Não duplique: aquilo escreve
  `Fechamento.total_vendas` e `diferenca`.
- Portas: 3017 é o app do dono. Ver [[portas-servem-arvores-diferentes]].
- Regra de domínio que este app tornou visível: [[encerrante-nao-tem-turno]].

**O que ele ainda NÃO tem**, e importa para o replay: **seletor de data**. O
envio grava sempre em `hojeIso()`. Reconstruir dia passado pelo app não é
possível hoje — e a janela de escrita da RLS (`data >= hoje − 7`) limitaria
mesmo que houvesse.
