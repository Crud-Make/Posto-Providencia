---
name: deploy-manual-some-no-proximo-merge
description: "Deploy pela CLI/script de branch não mergeada dura só até o próximo merge na main — a integração Git da Vercel republica a main nos 3 projetos e \"some\" a feature"
metadata: 
  node_type: memory
  type: project
  originSessionId: 18a712e9-5676-4ad5-a6bd-a9e3bf0c66ce
  modified: 2026-08-30T16:27:21.481Z
---

Em 30/08/2026 a foto do frentista e o Web Push do dono "sumiram" de produção. Nada quebrou:
`scripts/deploy-vercel.sh --prod` publicou a `feat/push-fechamento-dono` às 18:00 e o merge do
PR #63 na `main` às 18:20 fez a Vercel republicar a `main` (que não tinha a branch) em `pwa`,
`pwa-dono` e `posto-providencia`. Resolvido pelo PR #65 (mergeado 30/08, `c573f9b`).

**Why:** a integração GitHub→Vercel trata todo push na `main` como produção; o deploy manual não
"trava" nada.

**How to apply:** "feature sumiu do host" → primeiro `git branch --contains <commit>` para ver se
está na `main`, depois `list_deployments` do projeto (team `team_upqRo75tSm2qtK7kPuAAqU8c`, ids no
script) para ver qual commit está em `target: production`. Deploy manual serve para o dono testar;
para ficar, é PR. Ver [[portas-servem-arvores-diferentes]] para o equivalente local.
