# Memória — Posto Providência

- [⚠️ 12 dias nunca fechados](doze-dias-nunca-fechados.md) — `status = ABERTO` desde 26/07, somem do lucro (view devolve 201 de 213); fechar é operação do dono pelo painel, nunca por SQL

- [⚠️ Travas do MCP destravadas](travas-mcp-destravadas.md) — PENDENTE e **commitado assim** em 13/08 por decisão do dono: `execute_sql` escreve em produção até alguém repor
- [RLS Fase 1 aplicada](rls-fase1-em-andamento.md) — aplicada em 13/08 e medida; o lado "bloqueado" das 3 policies de DELETE segue sem prova de comportamento
- [Quem tipa o client do Supabase](quem-tipa-o-client-supabase.md) — o `database.types.ts` gerado tem zero importadores; quem vale é um schema escrito à mão
- [Leituras de 26-27/07](leituras-suspeitas-26-27-julho.md) — resolvido: o 27 é dado de teste com prova na `AuditoriaDados`; o 26 é real e parcial
- [Onde está a planilha fonte](planilha-fonte-onde-esta.md) — `~/Downloads`, com hash; `docs/data/` foi perdida e o git não devolve
- [Estado do ETL estágio 2](estado-etl-estagio2.md) — promovido e verde, mas o mês 07 aborta a carga de fechamento pelo rótulo `Posto - Jorro`
- [A despesa vem do banco](despesa-vem-do-banco.md) — a `Despesa` do Supabase é a autoridade do rateio, não a planilha
- [Timestamps de Leitura em UTC](timestamps-leitura-em-utc.md) — converter para horário local escorrega cada leitura um dia para trás
- [Bun fora do PATH](bun-fora-do-path.md) — resolvido em 12/08: bloco movido do `~/.bash_profile` (só login) para o `~/.bashrc`; reinstalar o bun traz de volta
- [O dono prefere que eu execute](dono-prefere-que-eu-execute.md) — propor o caminho em que eu faço, não o bloco de comandos para ele copiar
