---
name: portas-servem-arvores-diferentes
description: 3015, 3016 e 3017 podem servir código de worktrees DIFERENTES — conferir a árvore antes de concluir qualquer coisa de um teste
metadata:
  type: project
---

Com worktrees em uso, cada porta de dev pode estar servindo uma **árvore
diferente**, e o navegador não avisa qual.

Em 16/08/2026 havia três no ar ao mesmo tempo: `3015` = repo principal
(`feat/planilha-digitavel`), `3016` = worktree `pwa-dono` com as correções do
dia, `3017` = o app do dono. Conferir uma correção em 3015 mostraria o bug
intacto e levaria à conclusão de que ela não funcionou.

**Como aplicar:** antes de dar veredito sobre qualquer teste de tela, descubra
de que árvore veio o servidor:

```bash
ss -ltnp | grep -E "301[0-9]"          # acha o pid da porta
readlink /proc/<pid>/cwd               # diz a árvore
```

Duas armadilhas irmãs, da mesma tarde:

- **O `cd` do shell persiste entre comandos.** Um `cd` para o repo principal fez
  as checagens seguintes rodarem lá sem eu perceber, e eu quase reportei que
  `supabase/` não era versionado — era, só não estava onde eu estava olhando.
- **Vite não recarrega mudança em `frontend/packages/`** quando ela está fora da raiz do
  app. Deu `api.diasEmFalta is not a function` com o type-check limpo. Reinicie
  o servidor em vez de duvidar do código.
