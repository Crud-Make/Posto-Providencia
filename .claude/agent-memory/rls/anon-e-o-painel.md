---
name: anon-e-o-painel
description: Os três apps falam com o banco como anon; o login do painel (16/08/2026) é opcional por causa do modo visitante, então o caminho anon nunca fecha sozinho
metadata:
  type: project
---

**Três** apps usam a mesma `anon key`: `apps/web`, `apps/pwa-frentista` e `apps/pwa-dono`
(este último criado em 16/08/2026). Nenhum deles obriga login.

**O painel ganhou login em 16/08/2026** (`apps/web/src/contexts/AuthContext.tsx`,
`components/login/`) — mas com `modoVisitante`, uma saída explícita que segue falando como
`anon`. Correção da memória anterior, que dizia "não há login em funcionamento": há, e mesmo
assim **o caminho anon continua aberto e é o caminho padrão**. Enquanto o modo visitante
existir, revogar `anon` derruba o painel do mesmo jeito.

**Why:** toda recomendação de `REVOKE ... FROM anon` é, ao mesmo tempo, correção de exposição e
quebra de tela. A decisão é do dono, mas precisa ser informada — e a proposta de PIN/senha no PWA
já foi decidida contra, não relitigar.

**How to apply:**
- Separar sempre, na recomendação, o que é **remoção de privilégio que ninguém usa** (aplicável
  já, sem custo) do que é **fechar o que a tela consome** (só com login antes).
- O login abre um caminho **mais** privilegiado, não menos: em `Fechamento` o `authenticated`
  tem `DELETE USING (true)` — sem janela nenhuma —, enquanto o `anon` não tem policy de DELETE.
  Logar remove a trava de janela para apagar fechamento.
- Grants inúteis que dá para tirar sem quebrar nada, porque o app só lê: `INSERT/UPDATE/DELETE`
  do anon nas tabelas de cadastro (`Bico`, `Bomba`, `Combustivel`, `Tanque`, `Posto`, `Turno`,
  `FormaPagamento`, `Maquininha`, `Estoque`).
- Escrita que os apps **realmente** usam como anon: `Leitura`, `Fechamento`, `FechamentoFrentista`,
  `Recebimento`, `Despesa`, `NotaFrentista`, `PresencaFrentista`, `VendaProduto`, `Frentista`.
- Conferir o consumo com `grep -rhoE "\.from\(['\"]TABELA['\"]\)" apps packages` antes de afirmar
  que algo é inútil. Tabela citada só em `types/database/generated.ts` não é uso.

App novo com a mesma chave **não amplia privilégio de banco**: [[app-novo-nao-amplia-privilegio]].
Redações de política que enganam nessa avaliação: [[politicas-que-nao-seguram-nada]].
Caminho de escrita que já existiu fora das políticas: [[views-auto-atualizaveis-furam-rls]].
