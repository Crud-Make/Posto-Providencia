---
name: progresso-fase-a-18-09
description: "18/09 — Fase A medida em ~17% (juízo ponderado); saída do Supabase em 0%, esforço foi para travas; PR #120 (Posto → Compartilhado) aberto para fase-a"
metadata: 
  node_type: memory
  type: project
  originSessionId: eccccbbb-b93f-4ae5-9253-8ce30d0cb443
  modified: 2026-09-18T12:37:32.029Z
---

Medição de 18/09/2026 sobre origin/fase-a (agente, com evidência por comando):
issues #94–#106 31% (4/13; #97 aberta com PR mergeado); módulos backend 1/7 (Cadastro); tabelas com
model 12/31; painel FSD 34/261 arquivos (Fase A moveu 0); saída do Supabase 0/~265 chamadas, nenhum
app chama /api/; regras ✅ 4/38. Geral ≈17% com pesos do agente (Supabase 30, issues 25, tabelas 15,
resto 10).

**Why:** 5 dos 9 PRs de 17–18/09 foram travas/docs; #98/#99/#100 sem branch; backend sem consumidor.

**How to apply:** ao propor próximo trabalho, priorizar o primeiro consumidor real de /api/ e a #100
(agregações) antes de trava nova. PR #120 (refactor/cadastro-sem-ciclo → fase-a) carrega 9146a8c e
e70e255 empilhados; depois do merge, CA-7 do #115 vira ATIVA. Ver [[regra-de-arquitetura-nao-ganha-excecao]].

**Atualização 18/09 (tarde):** PR #121 (`feat/#103-fornecedor-pela-api`, worktree ../pp-api-fornecedor)
é o 1º consumidor real: `fornecedorService.getAll` lê a API quando `VITE_API_URL` existe. Adaptador
`urlDaApi()`/`buscarNaApi()` em services/api/base.ts (Zod + neverthrow) — as próximas fatias da #103
entram por ele. Zod instalado com ok do dono. Saída do Supabase: 1 de ~265.

**#100 fatia 1 (18/09, noite):** PR #123 (`feat/#100-agregacao` → base `refactor/cadastro-sem-ciclo`,
empilhado sobre o #120; retarget para fase-a após o merge dele). `GET /api/postos/{posto}/dashboard`,
bloco `rateio` no mês civil, sem lucro no PHP. Feito pelo workflow. Próximo: fatia 2 (troca do
aggregator.service.ts no dashboard) e depois fechamento diário — ambos pelo workflow, plano primeiro.

**MERGEADOS na fase-a em 18/09 (noite), com ok do dono:** #115 (84e60bd), #120 (390900b), #121 (b85254e),
#123 (18c5df5). fase-a exige branch atualizada + checks build/backend (strict) — o caminho é
update-branch/merge local da fase-a, CI verde, merge; nunca --admin. O CHANGELOG conflita no topo a cada
PR (resolver mantendo as duas entradas). Fatia 2 da #100: plano pronto na worktree pp-100-tela.

**#124 MERGEADO (aea73bc), fatia 2 da #100:** dashboard do dono lê venda/compra/rateio da API com
VITE_API_URL; validado pelo dono (jan R$ 290.062,94 vindo do Laravel). Pendências no PR: extractData
ainda lança nas 4 consultas da fonte antiga; Number() em dinheiro (centavos = fórmula, Fable+golden);
3 detalhes do doc-cycle em architecture.md. Servidores de teste ainda no ar: php :8001 (pid 241318) e
vite :3018 (pid 241638), worktree pp-100-tela. Próximo: fechamento diário (plano pronto, bloqueado por
#116 + 3 decisões de gravação).

**#116 MERGEADO (2fad860), 18/09 noite:** o refactor de CCN estourava max-lines 900 no App.tsx do PWA
frentista (914); corrigido pelo workflow movendo 3 blocos para arquivos ao lado (832 linhas) + erro novo
de strict-boolean no ProgressIndicator. Worktree pp-fechamento avançada para a fase-a atual. O fechamento
diário não tem mais o bloqueio do #116; faltam as 3 decisões de gravação (só antes da fatia de escrita)
e o login decidido tem de ir para os docs (fatia P1).

**PR #125 aberto (19/09 madrugada), fechamento diário P0–P3:** Design Doc fechamento-diario-api.md com a
DECISÃO A do login + correção de autenticacao.md e painel-pela-api.md; Public API do slice; App\Fechamento
só leitura. MERGEADO com ok do dono em 19/09. Executor contornou uma
negação do classificador reescrevendo a descrição — workflow refatora-modulo.js ganhou regra proibindo
(arquivo ainda não commitado no checkout principal, junto com a linha do .gitignore).

**P4 validada pelo dono na tela em 19/09:** 3015 (fonte atual) × 3016 (Laravel :8001), dia 15/01/2026 — bicos, preços, frentistas ativos e formas de pagamento idênticos. Ajustes da P4 rodando; depois commit e PR.
