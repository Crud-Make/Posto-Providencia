---
name: superficie-autenticacao-web
description: Onde vive toda a autenticação (Supabase Auth só no painel web, num arquivo só), como recontá-la, e as armadilhas do grep de auth (.auth. em SQL, multilinha em supabase.from)
metadata:
  type: reference
---

**[17/09/2026]** Levantamento para a Issue #102 (trocar Supabase Auth por sessão
Laravel/Sanctum no painel). O que não envelhece é **onde** cada coisa mora e o **comando**;
número nenhum aqui.

## Onde vive (confirmado por grep em 17/09/2026)

- **Todo `supabase.auth.*` do repo cabe num arquivo:** `frontend/apps/web/src/contexts/AuthContext.tsx`.
  Os PWAs (`pwa-frentista`, `pwa-dono`) e `packages/*` não têm nenhuma chamada de auth —
  rodam como `anon` puro, sem token de aparelho. O frentista se "identifica" escolhendo o
  nome numa lista, guardado em `localStorage` (`pwa.frentista`); o dono não se identifica.
- **O hook está separado do contexto:** `contexts/useAuth.ts` (extraído por
  `react-refresh/only-export-components`, igual ao `PostoContext`). Grep por `AuthContext`
  sozinho **perde 3 dos 4 consumidores** — eles importam `useAuth`.
- **Não existe rota protegida.** O gate é um componente único (`PortaDeEntrada` em
  `App.tsx`) que só monta o `<BrowserRouter>` quando `autenticado`; nenhum `ProtectedRoute`,
  nenhum `Navigate` para `/login`.
- **Nenhum código toca no JWT.** Zero ocorrências de `Authorization`/`Bearer`/`access_token`
  no `frontend/` — quem guarda e renova é o próprio supabase-js (`persistSession: true`,
  `flowType: 'pkce'`, em `frontend/apps/web/src/services/supabase.ts`).
- **Auth tem cobertura de teste zero** (`rg -l "AuthProvider|useAuth|TelaLogin" -g '*.test.*'`
  volta vazio).

## Comandos de recontagem

```bash
# 1. toda a superfície de auth do repo (deve caber num arquivo só)
rg -Un --no-heading "\.auth\." -g '!**/node_modules/**' -g '!**/dist/**' . | grep -v "^./banco/\|^./supabase/migrations\|^./docs/"

# 2. consumidores do contexto — SEMPRE pelos dois símbolos
rg -Un "AuthContext|useAuth" -g '!**/dist/**' frontend

# 3. chamadas supabase.<método> por app (o -U é obrigatório: `supabase\n  .from(` é comum)
for a in frontend/apps/web frontend/apps/pwa-frentista frontend/apps/pwa-dono frontend/packages/api-core; do
  echo "## $a (arquivos: $(rg -Ul "supabase\s*\.\s*[a-zA-Z]+" -g '*.ts' -g '*.tsx' -g '!**/dist/**' "$a" | wc -l))"
  rg -U --no-heading -o -r '$1' "supabase\s*\.\s*([a-zA-Z]+)" -g '*.ts' -g '*.tsx' -g '!**/dist/**' "$a" | awk -F: '{print $NF}' | sort | uniq -c | sort -rn
done
```

## Armadilhas confirmadas

- **`rg "\.auth\."` sem filtrar SQL afoga o resultado:** `auth.role()`, `auth.uid()` e
  `auth.users` aparecem às dezenas em `banco/init/*.sql` e `supabase/migrations/`. São RLS,
  não chamada de cliente — mas *são* o risco da #102 (ver abaixo).
- **`rg -o "supabase\.[a-zA-Z]+"` sem `-U` subconta ~6x** no web: a maioria dos serviços
  quebra a linha antes do `.from(`. Mesmo erro de família do `-U` obrigatório da skill.
- **`Usuario` não some com `rg "\.from\('Usuario'"`** — ele entra por *embedded select*
  (`usuario:Usuario(id, nome)`) em `services/api/fechamento.service.ts`, e o nome é
  renderizado em `relatorio-diario/hooks/useRelatorioDiario.ts`. Procurar a tabela só pelo
  `.from()` produz o falso "ninguém lê Usuario".

## O que a #102 esbarra no banco

As policies de RLS distinguem `anon` de `authenticated` via `auth.role()`; sessão Laravel
não produz JWT do Supabase, então **o painel autenticado no Laravel volta a ser `anon` no
Postgres** enquanto ele falar direto com o Supabase. Conferir o tamanho disso:
`rg -c "auth\.role\(\)" banco/init/01-esquema-base.sql`. As únicas policies que usam
`Usuario.auth_user_id = auth.uid()` são as de `PushToken` (caminho morto: o serviço só é
re-exportado pelo barril, sem chamador).

Relacionado: [[superficie-supabase-por-app]], [[grep-por-caminho-perde-import-relativo]],
[[multi-posto-onde-vive-e-onde-esta-cravado]], [[estrutura-dependencias-frontend]].
