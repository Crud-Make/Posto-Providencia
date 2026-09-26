---
name: janela-de-escrita-e-estoque-onde-medir
description: A janela de escrita e o desconto de Estoque não moram onde a intuição diz — comandos para reencontrá-los no SQL e no service
metadata:
  type: project
---

Conferido em **20/09/2026**.

**Janela de escrita** não está em código TS nem PHP: é função SQL do esquema,
`dentro_da_janela_de_escrita` / `dentro_da_janela_de_edicao`, e as duas têm o
mesmo corpo (`>= DATE '2025-12-31' AND < CURRENT_DATE + INTERVAL '2 days'`).
Quem a aplica são policies de RLS sobre `Fechamento` e `FechamentoFrentista`.

```bash
cd /home/thygas/Projetos/trabalho/Posto-Providencia
rg -Un --no-heading "dentro_da_janela" banco/init/01-esquema-base.sql
```

**Estoque** é descontado no `bulkCreate`/`create` de
`apps/web/src/services/api/leitura.service.ts`, e o `deleteByDate` do mesmo
arquivo **não devolve**. No backend o mesmo comportamento já existe por evento:
`App\Compartilhado\Eventos\LeiturasDoDiaGravadas` →
`App\Estoque\Application\DescontaLitrosVendidos`, ligado em `AppServiceProvider`.

```bash
cd frontend && rg -Un "quantidade_atual" apps/web/src/services/api/leitura.service.ts
cd /home/thygas/Projetos/trabalho/Posto-Providencia && rg -Un "DescontaLitrosVendidos|LeiturasDoDiaGravadas" backend
```

**Why:** três buscas separadas já procuraram a janela em `useSubmissaoFechamento`
e o desconto de estoque em `estoque.service.ts`; não estão em nenhum dos dois.

**How to apply:** ao planejar escrita do fechamento, medir os dois pelos comandos
acima antes de afirmar prazo ou efeito colateral. Nunca gravar aqui o número de
dias da janela — gravar o comando.

**Estado do Postgres do compose** se mede, não se lembra:

```bash
cd /home/thygas/Projetos/trabalho/Posto-Providencia
docker compose exec -T postgres psql -U posto -d posto -tAc "select 'Leitura',count(*) from \"Leitura\" union all select 'Fechamento',count(*) from \"Fechamento\";"
```

Ver [[gravacao-fechamento-onde-mora]].
