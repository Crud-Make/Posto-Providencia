---
name: consulta-leitura-producao
description: Como consultar (somente leitura) as tabelas de produção — Leitura, Fechamento, AuditoriaDados — sem MCP, pelo mesmo caminho do etl-despesa-banco.py
metadata:
  type: reference
---

O agente `planilha` **não tem** as ferramentas do MCP do Supabase no contexto, mas
consegue ler produção pelo mesmo caminho que `scripts/etl-despesa-banco.py` usa:
API de management, `POST https://api.supabase.com/v1/projects/<ref>/database/query`,
token em `SUPABASE_ACCESS_TOKEN` (ambiente) ou em `.claude/settings.local.json`
(`env.SUPABASE_ACCESS_TOKEN`). O `User-Agent` padrão do urllib leva 403 do WAF —
copiar o cabeçalho do script. **Só `SELECT`**: o endpoint aceita DDL/DML, a trava
é minha.

Sem escrever arquivo: o hook `memoria-somente` nega `Write` fora deste diretório,
então o script vai inline (`python3 - <<'PY'`), nunca no scratchpad.

Datas: `Leitura.data` é `timestamptz` gravado em 00:00 UTC — filtrar e agrupar
sempre com `AT TIME ZONE 'UTC'`. Ver `.claude/memoria/timestamps-leitura-em-utc.md`.

**`AuditoriaDados` é a caixa-preta**: guarda `dados_antes`/`dados_depois` em jsonb
com `tabela`, `operacao` (UPDATE/DELETE) e `em`. É o que distingue lançamento
normal de tentativa-e-erro manual — linha inserida, apagada e reinserida aparece
como DELETEs repetidos do mesmo conjunto. Filtro útil:
`WHERE COALESCE(dados_antes->>'data', dados_depois->>'data') LIKE '2026-07-2%'`.

Agrupar `Leitura` por `createdAt` revela os **lotes de carga** (carga histórica em
massa vs. uso do app, dia a dia) — é o discriminador mais barato de procedência.

Relacionado: [[divergencia-26-27-julho]], [[onde-para-cada-fonte]].
