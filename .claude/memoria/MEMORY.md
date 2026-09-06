# Memória — Posto Providência

- [📍 COMECE AQUI 06/09 — veredito PROTÓTIPO, 10 PRs de saneamento mergeados](auditoria-03-09-veredito-e-bugs-de-dinheiro.md) — frentistas em produção real, dono não fecha o ciclo; #80–#89 na main (custo de uma fonte só, dia não apurado = NULL, ler-encerrante v11, travas MCP de volta); o que ficou por decisão
- [Deploy manual some no próximo merge](deploy-manual-some-no-proximo-merge.md) — 30/08: foto e push "sumiram" porque o merge do #63 republicou a main; corrigido pelo PR #65; conferir `target: production` antes de chamar de bug
- [📍 30/08 — planilha nova auditada, promoção PENDENTE](planilha-30-08-auditoria-e-promocao-pendente.md) — Supabase já tem jan–ago; ETL adaptado em `fix/etl-planilha-30-08`; docs/data não promovido; 11 asserções de golden esperam decisão (jan 6,48→6,38, julho reescrito, tanque 31/01 sobrescrito)
- [📍 28/08 — zerado, conferido, carga PENDENTE](zerado-28-08-carga-conferida-pendente.md) — banco zerado com backup em /mnt/dados; referência bate com a planilha nos 7 meses; scripts de carga prontos (julho fechamento aborta); dono mandou esperar a auditoria de outra sessão

- [🔴 BANCO ZERADO — replay em curso](banco-zerado-replay-em-curso.md) — desde 14/08 produção transacional está vazia DE PROPÓSITO; backup em /mnt/dados; reconstrução dia a dia pela UI, nada por SQL sem ok do dono
- [Reset do painel apaga em silêncio](reset-do-painel-apaga-em-silencio.md) — roda como anon, RLS engole o erro, app reporta sucesso com zeros; "janela de edição" cobre 1,5 mês, não 7 dias
- [Fix do preço único](fix-preco-litro-historico.md) — branch `fix/preco-litro-historico` (dbb38bb), dia passado deixou de ser avaliado a preço de hoje; falta validação do dono; aggregator e custo carimbado são dívida
- [⚠️ 12 dias nunca fechados](doze-dias-nunca-fechados.md) — OBSOLETO pelo wipe de 14/08, mas o mecanismo (PWA cria pai zerado, só o painel consolida) segue no código

- [📍 COMECE AQUI — validação final, onde parei](validacao-final-onde-parei.md) — 16/08 fim: `test/validacao-final`, 30 commits, 300 vitest + 3204 golden; banco ZERADO com só as leituras de abertura de 31/12 e 16/08; a fila do que fazer está lá, começando por carregar janeiro
- [Salvar travado pelas linhas semeadas](salvar-travado-linhas-semeadas.md) — corrigido E validado 19/08; a branch também ganhou o "salvou, avança"; falta PR/merge; atenção: replay sem aba Financeiro cria 0 Recebimento e zera as taxas do lucro
- [App do dono nasceu](app-do-dono-nasceu.md) — terceiro app: `apps/pwa-dono`, o encerrante por foto; a aba saiu do PWA do frentista; ainda SEM seletor de data
- [Encerrante não tem turno](encerrante-nao-tem-turno.md) — `Leitura` é por dia e por bico; filtrar por `turno_id` já produziu 3 bugs de uma vez
- [Portas servem árvores diferentes](portas-servem-arvores-diferentes.md) — 3015/3016/3017 podem ser worktrees distintas; confira o `cwd` do pid antes de concluir

- [⚠️ Travas do MCP destravadas](travas-mcp-destravadas.md) — PENDENTE e **commitado assim** em 13/08 por decisão do dono: `execute_sql` escreve em produção até alguém repor
- [RLS Fase 1 aplicada](rls-fase1-em-andamento.md) — aplicada em 13/08 e medida; o lado "bloqueado" das 3 policies de DELETE ganhou prova real em 14/08 — ver reset-do-painel
- [Quem tipa o client do Supabase](quem-tipa-o-client-supabase.md) — o `database.types.ts` gerado tem zero importadores; quem vale é um schema escrito à mão
- [Leituras de 26-27/07](leituras-suspeitas-26-27-julho.md) — resolvido à época; as linhas em si saíram no wipe de 14/08
- [Onde está a planilha fonte](planilha-fonte-onde-esta.md) — `~/Downloads`, com hash; `docs/data/` foi perdida e o git não devolve
- [Estado do ETL estágio 2](estado-etl-estagio2.md) — promovido e verde, reproduz docs/data byte a byte (conferido 14/08); o mês 07 aborta a carga de fechamento pelo rótulo `Posto - Jorro`
- [A despesa vem do banco](despesa-vem-do-banco.md) — a `Despesa` do Supabase é a autoridade do rateio, não a planilha (hoje: zerada pelo replay, fonte é o backup)
- [Timestamps de Leitura em UTC](timestamps-leitura-em-utc.md) — converter para horário local escorrega cada leitura um dia para trás
- [Bun fora do PATH](bun-fora-do-path.md) — resolvido em 12/08: bloco movido do `~/.bash_profile` (só login) para o `~/.bashrc`; reinstalar o bun traz de volta
- [O dono prefere que eu execute](dono-prefere-que-eu-execute.md) — propor o caminho em que eu faço, não o bloco de comandos para ele copiar
- [Varredura 19/08 — o que falta no banco](varredura-19-08-o-que-falta-no-banco.md) — PRs #52/#53 mergeados; o unique de FechamentoFrentista está escrito e NÃO aplicado; policy de DELETE já alinhada
- [Custo é por mês, não estoque anterior](custo-e-por-mes-nao-estoque-anterior.md) — a planilha custeia a venda pela compra do MESMO mês; lucro de janeiro NÃO precisa da compra de 2025; custos de jan/2026 para lançar estão lá
- [Replay janeiro — compras e despesas lançadas](replay-janeiro-compras-despesas-lancadas.md) — Compra ids 41-44 e Despesa ids 139-153 (Lista A, R$22.158,46) por SQL; lucro líquido fica negativo até o mês todo entrar (efeito mês-parcial, não é bug)
- [Card Receitas/Despesas lê coluna carimbada](card-receitas-despesas-le-coluna-carimbada.md) — o card soma colunas de lucro que a UI nunca grava; no replay dão 0, então o card é não-confiável; os 308,52 são a falta de caixa (corretos); fonte confiável é a Planilha do Mês
- [Duas fórmulas de custo divergem no mês](duas-formulas-de-custo-divergem-no-mes.md) — leitura validada nos 7 meses (112/112); a escrita usa ponderada e erra até R$ 2.582 no mês, R$ 132,69 no ano; fevereiro quebra o encadeamento na própria planilha
- [Taxa de cartão é despesa do mês](taxa-cartao-e-despesa-do-mes.md) — dono confirmou 26/08; modelo da planilha (lucro.ts) é o certo; o card Receitas/Despesas desconta a taxa duas vezes via `taxas_pagamento`
- [Saneamento roda em worktrees paralelas](saneamento-em-tres-worktrees.md) — partilha por arquivo (não por tarefa); worktree nova não herda docs/data, node_modules nem .env, e as três falham em silêncio
