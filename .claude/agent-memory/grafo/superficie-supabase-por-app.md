---
name: superficie-supabase-por-app
description: Script que mede a superfície de acesso ao Supabase (from/rpc/invoke/realtime/auth/storage) por app; armadilha do rg -g sem aspas; onde vive cada tipo de acoplamento
metadata:
  type: reference
---

**[17/09/2026]** Levantamento para o mapa arquitetural (decisão Laravel+Postgres). O que
não envelhece é o **script**, não o número — recontar sempre.

**Armadilha que custou duas rodadas:** `rg -g *.ts` SEM aspas é expandido pelo bash para
`vitest.config.ts` e todo padrão vira "No such file or directory". Quotar sempre:
`rg -g '*.ts' -g '*.tsx' -g '!*.test.*' -g '!*.spec.*'`. Numa variável `$G` não funciona
(word splitting); usar função shell `R() { rg -g '*.ts' ... "$@"; }` ou script no scratchpad.

```bash
R() { rg -g '*.ts' -g '*.tsx' -g '!*.test.*' -g '!*.spec.*' -g '!**/dist/**' "$@"; }
# tabelas por app (contagem de chamadas .from)
for a in apps/web apps/pwa-frentista apps/pwa-dono packages/api-core supabase/functions; do
  echo "-- $a"; R -o "\.from\(\s*['\"]([A-Za-z_]+)['\"]" -r '$1' $a | awk -F: '{print $NF}' | sort | uniq -c | sort -rn; done
R -n -o "\.rpc\(\s*['\"]([A-Za-z_]+)['\"]" -r '$1' apps packages           # RPCs chamadas
R -n -o "functions\.invoke\(\s*['\"]([a-z_-]+)['\"]" -r '$1' apps packages   # Edge Functions
R -n "\.channel\(|postgres_changes" apps packages                            # realtime
R -o "\.auth\.\w+" apps packages | sort | uniq -c                            # auth
R -n "\.storage\.|storage\.from" apps packages                               # storage (vazio em 17/09)
```

**Onde cada acoplamento vive (confirmado por grep em 17/09/2026):**
- Único `createClient` do web: `apps/web/src/services/supabase.ts` (`flowType: 'pkce'`).
  PWAs têm o seu em `apps/pwa-*/src/lib/supabase.ts`; `packages/api-core` recebe o client
  injetado (`criarAcessoEncerrante(supabase)`).
- `auth.*` só em `apps/web/src/contexts/AuthContext.tsx`; PWAs rodam como `anon`.
- Realtime só no web: `fechamento-diario/index.tsx` (FechamentoFrentista, Leitura),
  `useCarregamentoDados.ts` (Fechamento), `frentistas/hooks/useFrentistas.ts` (Frentista).
- Push: `apps/pwa-dono/src/lib/push.ts` grava `InscricaoPush`; `supabase/functions/notifica-dono`
  lê com `SERVICE_ROLE_KEY` e assina VAPID. Disparo: `apps/pwa-frentista/src/services/api.ts` (`avisarDono`).
- RPC `get_frentistas_with_email` é chamada (`frentista.service.ts`) e **não tem definição em
  `supabase/migrations/`**; `get_encerrantes_mensal` (legado) está definida e sem chamador.

Relacionado: [[grep-por-caminho-perde-import-relativo]], [[multi-posto-onde-vive-e-onde-esta-cravado]].
