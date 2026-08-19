# Memória — Posto Providência

- [🔴 BANCO ZERADO — replay em curso](banco-zerado-replay-em-curso.md) — desde 14/08 produção transacional está vazia DE PROPÓSITO; backup em /mnt/dados; reconstrução dia a dia pela UI, nada por SQL sem ok do dono
- [Reset do painel apaga em silêncio](reset-do-painel-apaga-em-silencio.md) — roda como anon, RLS engole o erro, app reporta sucesso com zeros; "janela de edição" cobre 1,5 mês, não 7 dias
- [Fix do preço único](fix-preco-litro-historico.md) — branch `fix/preco-litro-historico` (dbb38bb), dia passado deixou de ser avaliado a preço de hoje; falta validação do dono; aggregator e custo carimbado são dívida
- [⚠️ 12 dias nunca fechados](doze-dias-nunca-fechados.md) — OBSOLETO pelo wipe de 14/08, mas o mecanismo (PWA cria pai zerado, só o painel consolida) segue no código

- [📍 COMECE AQUI — validação final, onde parei](validacao-final-onde-parei.md) — 16/08 fim: `test/validacao-final`, 30 commits, 300 vitest + 3204 golden; banco ZERADO com só as leituras de abertura de 31/12 e 16/08; a fila do que fazer está lá, começando por carregar janeiro
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
