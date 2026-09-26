---
name: fuso-local-nao-batia-com-producao
description: 20/09 — produção (Supabase) é UTC e o Postgres do compose era America/Sao_Paulo; o MESMO SQL dava número diferente, perdendo um dia inteiro. Fixado em config/database.php
metadata:
  type: project
---

**Medido em 20/09/2026**, nos dois bancos:

| | fuso da sessão |
|---|---|
| Supabase de produção | **UTC** (`current_setting('TimeZone')`) |
| Postgres do compose | **America/Sao_Paulo** (herdava do host) |

E isso não era detalhe: o **mesmo SQL** devolvia número diferente nos dois. Recorte de janeiro
de 2026, posto 1:

- jeito certo (UTC): **186 leituras**, 46.843,062 L, **R$ 290.062,94**
- sob fuso local: 180 leituras, R$ 280.632,60 — **some o dia 01/01 inteiro**, os 6 bicos,
  R$ 9.430,34 de receita; no `lucro_liquido`, R$ 1.329,95 a menos

**Por que importa mesmo com produção correta:** qualquer validação, backtest ou replay rodado no
banco LOCAL daria divergência contra a planilha — e a divergência seria do ambiente, não do
cálculo. Caçar esse fantasma custa um dia.

**Corrigido:** `backend/config/database.php` fixa `'timezone' => env('DB_TIMEZONE', 'UTC')` na
conexão pgsql. A conexão da aplicação passa a ser determinística, independente da máquina.

**As duas armadilhas que sobram, e elas são de escrita:**

1. **O cast `datetime` do Eloquent formata SEM offset.** `Model::create(['data' => '2026-09-20
   00:00:00'])` grava o instante conforme o fuso da sessão. Teste de recorte de dia que confie em
   factory mede outra coisa. Para fixar instante num teste:
   `DB::table($t)->where('id',$id)->update(['data' => '2026-09-20 00:00:00+00'])`, fora do cast.
   `database/factories/LeituraFactory.php` tem esse defeito (só em teste, nada em `app/` escreve).
2. **Ligar Carbon sem offset numa query** faz o mesmo estrago na leitura. Em
   `LeiturasDoDia`/`SessoesDoDia` o valor vai com `format('Y-m-d H:i:sP')`. `DadosDoPeriodo`
   resolve por outro caminho, igualmente imune: normaliza a COLUNA com `(data AT TIME ZONE
   'UTC')::date`.

**Defeito latente que sobra:** a RPC legada `get_dashboard_proprietario`
(`banco/init/01-esquema-base.sql:1158-1159`) compara `timestamptz` com parâmetro `date` sem
offset. **Não erra em produção porque lá é UTC** (medido), mas erra no banco local e morre sozinha
quando o dashboard migrar para `/api/postos/{posto}/dashboard` — o Laravel já acerta.

Ver [[timestamps-leitura-em-utc]] e [[progresso-fase-a-20-09]].
