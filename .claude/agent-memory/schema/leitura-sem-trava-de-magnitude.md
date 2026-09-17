---
name: leitura-sem-trava-de-magnitude
description: A tabela Leitura não tem CHECK nem UNIQUE — encerrante mil vezes menor entra calado; a query de continuidade da cadeia é o detector
metadata:
  type: project
---

`public."Leitura"` tem **apenas FKs e a PK** — nenhum `CHECK`, nenhum `UNIQUE (bico_id, data)`.
Logo o banco aceita encerrante em ordem de grandeza errada (bug de parse `/1000`) e aceita
dois registros para o mesmo bico no mesmo dia. `leitura_inicial`/`leitura_final`/`litros_vendidos`
são `numeric(15,3)`; `preco_litro` `numeric(10,2)`; `valor_total` `numeric(15,2)`.

**Why:** em 16/08/2026 apareceu um bug de parse confirmado em
`frontend/apps/web/src/components/leituras-diarias/hooks/useLeiturasDiarias.ts` (`.replace('.','')` sem `/g`,
só o primeiro ponto de milhar sai) que grava o encerrante do bico 01 mil vezes menor. Sem trava no
banco, a única defesa é detecção depois do fato — e a pergunta "isso já contaminou produção?"
volta a cada regressão de parse.

**How to apply:** o detector NÃO é olhar min/max por bico (bicos 5 e 6 vivem legitimamente na casa
dos milhares e dão falso positivo). É a **continuidade da cadeia diária**: o encerrante inicial de um
dia tem de ser igual ao final do dia anterior no mesmo bico. Uma linha contaminada quebra a cadeia em
duas linhas, sempre.

```sql
-- 0 quebras = nenhuma linha com magnitude corrompida
WITH enc AS (
  SELECT bico_id, (data AT TIME ZONE 'UTC')::date AS dia,
         leitura_inicial, leitura_final, litros_vendidos,
         LAG(leitura_final) OVER (PARTITION BY bico_id ORDER BY data) AS final_anterior,
         (leitura_final - leitura_inicial) AS delta
  FROM public."Leitura"
)
SELECT COUNT(*) FILTER (WHERE final_anterior IS NOT NULL AND leitura_inicial <> final_anterior) AS quebras_de_cadeia,
       COUNT(*) FILTER (WHERE leitura_final < leitura_inicial)                                  AS final_menor_que_inicial,
       COUNT(*) FILTER (WHERE ROUND(litros_vendidos,3) <> ROUND(delta,3))                       AS litros_divergentes_do_delta,
       COUNT(*) AS total
FROM enc;
```

Reconfirmar a ausência de travas:

```sql
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public' AND rel.relname = 'Leitura';
```

Ver também [[como-saber-se-leitura-veio-da-ui-ou-de-carga]].
