---
name: tetos-de-tamanho-ja-existiam
description: max-lines 900 no oxlint e ExcessiveMethodLength/ClassLength no PHPMD já existem desde 17/09 — o pedido de 19/09 dizia que o backend só tinha CCN
metadata:
  type: project
---

Os tetos de tamanho não são novos; o que o pacote de 19/09/2026 (worktree pp-travas-qualidade) faz é APERTAR.

- `frontend/.oxlintrc.json:11` `eslint/max-lines 900` e `complexity 20` nasceram juntos em `04fe282` (17/09/2026). O corpo diz "Entra em 20, não em 10: com 10 o gate nasceria vermelho em 69 funções… Catraca: 20 → 15 → 10". O plano de descer já existia.
- `ad4ca5d` (18/09/2026, #116) prova que o max-lines já reprovava: App.tsx do PWA chegou a 914 linhas e foi dividido, sem subir o limite.
- `backend/phpmd.xml:20-21` tem ExcessiveMethodLength e ExcessiveClassLength com os limites padrão do PHPMD (100/1000) desde `cc51ffb` (17/09/2026, #96). Apertar para 60/300 é trocar a propriedade, não incluir regra nova.
- `deptrac.yaml:50` `Http → Domain` entrou em `2517d2c` (17/09/2026, #97). O registro (regras.md:98) atribui ao "PR #111". O hash que vale é 2517d2c.

**Why:** a tarefa computada de 19/09 afirmava "hoje só CyclomaticComplexity 10" no backend, e o plano teria duplicado regra existente.
**How to apply:** antes de planejar trava "nova", rode `git grep` no ref alvo. Veja também [[regras-md-nao-acompanhou-as-travas]].
