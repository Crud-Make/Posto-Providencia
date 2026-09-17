---
name: anon-e-o-painel
description: Quem fala com o banco como anon e quem fala como authenticated — o painel exige login desde 19/08/2026 (modo visitante removido); os dois PWAs seguem anon por decisão do dono
metadata:
  type: project
---

**Quem é `anon` e quem é `authenticated` hoje** (conferido no código em 17/09/2026):

- `apps/web` (painel): **exige login** — `AuthContext.tsx` só tem `signInWithPassword`, e
  `App.tsx` abre a porta só com sessão. Fala como **`authenticated`**.
- `apps/pwa-frentista` e `apps/pwa-dono`: **sem autenticação nenhuma** (zero `signIn`,
  zero `getSession`). Falam como **`anon`**, com a mesma anon key.

**Correção de memória anterior (16/08/2026):** o painel teve um `modoVisitante`
("Continuar sem entrar") entre 16/08 e **19/08/2026**, quando foi removido — CHANGELOG
"O modo visitante sai — sem senha não há meia-entrada". Motivo registrado: como `anon` a
RLS devolvia lista vazia **sem erro** em `Fornecedor`/`Compra` e o painel mostrava número
incompleto sem avisar. Toda memória/relatório que diga "o painel fala como anon" está
desatualizada desde então.

**Why:** a pergunta "revogar `anon` derruba o quê?" mudou de resposta. Antes derrubava o
painel inteiro; hoje derruba **os dois PWAs** (envio do frentista, régua de tanque,
encerrante por foto, inscrição push). O painel só cai se o que for revogado for de
`authenticated` — ou se a policy for `TO anon` sem par para `authenticated` (caso real:
`InscricaoPush` INSERT é só `TO anon`; `fechamento_frentista_delete_janela_edicao`,
`recebimento_delete_janela_edicao` e `despesa_delete_janela_edicao` são só `TO anon` — o
painel logado **não** passa por elas, passa pelas policies `auth.role()='authenticated'`
quando existem).

**How to apply:**
- Separar sempre a recomendação em: privilégio que ninguém usa (tirar já) × o que o PWA
  consome como `anon` × o que o painel consome como `authenticated`.
- Escrita que os PWAs **realmente** usam como anon (grep `.from(` em 17/09/2026):
  `FechamentoFrentista`, `Fechamento`, `HistoricoTanque`, `VendaProduto`, `Frentista`,
  `PresencaFrentista`, `InscricaoPush`, e via `packages/api-core`: `Leitura`, `Bico`.
- Conferir o consumo com `grep -rhoE "\.from\(['\"]TABELA['\"]\)" apps packages` antes de
  afirmar que algo é inútil. Tabela citada só em `types/database/generated.ts` não é uso.
- A proposta de PIN/senha no PWA do frentista já foi decidida contra pelo dono — não relitigar.

App novo com a mesma chave **não amplia privilégio de banco**: [[app-novo-nao-amplia-privilegio]].
Redações de política que enganam nessa avaliação: [[politicas-que-nao-seguram-nada]].
Caminho de escrita que já existiu fora das políticas: [[views-auto-atualizaveis-furam-rls]].
