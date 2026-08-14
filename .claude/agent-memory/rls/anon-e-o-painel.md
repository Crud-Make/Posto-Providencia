---
name: anon-e-o-painel
description: O painel web e o PWA falam com o banco como anon, sem login — revogar anon é correção de segurança que derruba o produto
metadata:
  type: project
---

Os dois apps (`apps/web` e `apps/pwa-frentista`) usam a `anon key`. Não há login em
funcionamento — o do painel foi removido em 29/07/2026 por ser código inalcançável, e o PWA
do frentista **não tem autenticação por decisão explícita do dono**.

**Why:** toda recomendação de `REVOKE ... FROM anon` é, ao mesmo tempo, correção de exposição e
quebra de tela. A decisão é do dono, mas precisa ser informada — e a proposta de PIN/senha no PWA
já foi decidida contra, não relitigar.

**How to apply:**
- Separar sempre, na recomendação, o que é **remoção de privilégio que ninguém usa** (aplicável
  já, sem custo) do que é **fechar o que a tela consome** (só com login antes).
- Grants inúteis que dá para tirar sem quebrar nada, porque o app só lê: `INSERT/UPDATE/DELETE`
  do anon nas tabelas de cadastro (`Bico`, `Bomba`, `Combustivel`, `Tanque`, `Posto`, `Turno`,
  `FormaPagamento`, `Maquininha`, `Estoque`).
- Escrita que o app **realmente** usa como anon: `Leitura`, `Fechamento`, `FechamentoFrentista`,
  `Recebimento`, `Despesa`, `NotaFrentista`, `PresencaFrentista`, `Frentista` (cadastro pelo painel).
  Fechar qualquer uma dessas derruba fluxo de fechamento ou de despesa.
- Conferir o consumo com `grep -rhoE "\.from\(['\"]TABELA['\"]\)" apps packages` antes de afirmar
  que algo é inútil. Tabela citada só em `types/database/generated.ts` não é uso.

Redações de política que enganam nessa avaliação: [[politicas-que-nao-seguram-nada]].
Caminho de escrita que existe fora das políticas: [[views-auto-atualizaveis-furam-rls]].
