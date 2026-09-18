---
name: vercel-root-directory-nao-mexer-antes-do-merge
description: Produção da Vercel está no ar (deploy de 06/09); as vermelhas são preview; o Root Directory NÃO pode mudar antes de a fase-a entrar na main
metadata: 
  node_type: memory
  type: project
  originSessionId: 45288561-cd0d-4a4e-bc5a-11c2e3c97c50
  modified: 2026-09-18T00:47:52.380Z
---

Medido em 17/09/2026 na API da Vercel (team `team_upqRo75tSm2qtK7kPuAAqU8c`):

**Produção nunca caiu.** Os 3 sites respondem HTTP 200, servindo o deploy `READY` de **06/09/2026
20:06** (`main` @ `6662b24`). Todo deploy em `ERROR` desde a #95 tem `target: null` — é **preview** de
branch de trabalho. Build quebrado na Vercel não derruba o deploy vivo, só não promove o novo. A
produção está **congelada**, não quebrada.

**`rootDirectory` real dos 3 projetos** (nenhum alterado desde 06/09, `updatedAt` prova):

| projeto | rootDirectory | serve |
|---|---|---|
| `posto-providencia` | `None` (raiz) | `main` |
| `pwa` | `apps/pwa-frentista` | `main` |
| `pwa-dono` | `apps/pwa-dono` | `main` |

Na `fase-a` seriam `frontend`, `frontend/apps/pwa-frentista`, `frontend/apps/pwa-dono`.

**Why:** `rootDirectory` é do projeto, não da branch. `main` (produção) tem o layout antigo e
`fase-a` tem tudo sob `frontend/` — as duas configurações não podem estar certas ao mesmo tempo.
Trocar cedo deixa a preview verde e tira da `main` a capacidade de deployar produção: bug do Elias
não espera cutover. Preview vermelha é ruído; `main` não deployável é risco de dinheiro real.

**How to apply:** não mexer no Root Directory até a `fase-a` entrar na `main`. A troca é o passo 6
do §2 de `docs/design/cutover.md`, bloco indivisível com o merge (5) e o deploy de confirmação (7);
rollback derruba os dois juntos. Uma versão anterior do doc afirmava "corrigido em 17/09 por outra
sessão" — era **falso**, corrigido com a medição. Se alguém disser que a Vercel foi consertada,
conferir `rootDirectory` na API antes de acreditar. Ver [[deploy-manual-some-no-proximo-merge]].
