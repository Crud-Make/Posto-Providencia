#!/usr/bin/env bash
# Prova de isolamento do ensaio (§3 da skill validar-mvp-dois-postos), pela API, no banco semeado por
# scripts/semeia-ensaio-dois-postos.sh. Sobe o backend numa porta própria (8766) apontado para esse
# banco, confere que cada conta só enxerga o próprio posto, que o que se grava no BR não aparece no
# Jorro, a chave do frentista (cria 1 vez, 409 na 2ª, 404 pelo outro posto) e, no fim, que o retrato
# do Jorro não mudou. Grava no BR (1 frentista na equipe, chave e presença do Bruno): rode num banco
# recém-semeado. O PIN tem limite de 5 tentativas/min por frentista (throttle pin-frentista): entre
# duas rodadas, espere 1 minuto, senão vem 429.
#
# Uso: SENHA_JORRO=... SENHA_BR=... scripts/prova-isolamento-ensaio.sh <porta do Postgres> [pasta do backend]
#      (as senhas são as que o seed imprimiu; a pasta do backend precisa de vendor/ instalado)
set -uo pipefail
PG="${1:?uso: SENHA_JORRO=... SENHA_BR=... scripts/prova-isolamento-ensaio.sh <porta> [backend]}"
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
ENSAIO=$RAIZ
BACK="${2:-$RAIZ/backend}"
SJ="${SENHA_JORRO:?defina SENHA_JORRO (senha de elias.jorro@ensaio.local)}"
SB="${SENHA_BR:?defina SENHA_BR (senha de elias.br@ensaio.local)}"
LOG=$(mktemp)
export PGHOST=127.0.0.1 PGPORT=$PG PGUSER=posto PGPASSWORD=posto PGDATABASE=posto

(cd $BACK && DB_PORT=$PG exec php artisan serve --port=8766 >$LOG 2>&1) &
SERVE=$!
trap 'kill $SERVE 2>/dev/null; pkill -P $SERVE 2>/dev/null' EXIT
for _ in $(seq 60); do curl -s localhost:8766/api/saude >/dev/null && break; sleep 0.25; done

A=http://localhost:8766/api
H=(-H 'Accept: application/json' -H 'Content-Type: application/json')
ok=0; falha=0
confere() { # descrição esperado obtido
  if [[ "$3" == "$2" ]]; then ok=$((ok+1)); echo "  ✅ $1 → $3"; else falha=$((falha+1)); echo "  ❌ $1 → esperado $2, veio $3"; fi
}
cod() { curl -s -o /dev/null -w '%{http_code}' "${H[@]}" "$@"; }
js() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }

ANTES=$(psql -Atq -f $ENSAIO/banco/ensaio/retrato-do-jorro.sql)

echo "1. Login — cada conta vê só o próprio posto"
RJ=$(curl -s "${H[@]}" -X POST $A/login -d "{\"email\":\"elias.jorro@ensaio.local\",\"senha\":\"$SJ\",\"dispositivo\":\"ensaio\"}")
RB=$(curl -s "${H[@]}" -X POST $A/login -d "{\"email\":\"elias.br@ensaio.local\",\"senha\":\"$SB\",\"dispositivo\":\"ensaio\"}")
TJ=$(echo "$RJ" | js 'd["token"]'); TB=$(echo "$RB" | js 'd["token"]')
confere "elias.jorro: postos" "[1]" "$(echo "$RJ" | js '[p["id"] for p in d["usuario"]["postos"]]')"
confere "elias.br: postos" "[2]" "$(echo "$RB" | js '[p["id"] for p in d["usuario"]["postos"]]')"

echo "2. Conta de um posto pedindo o outro → 403"
for rota in bicos equipe tanques/painel "dashboard?data_inicio=2026-09-01&data_fim=2026-09-26" "fechamento?data=2026-09-26" "relatorio-diario?data=2026-09-26"; do
  confere "elias.br  GET /postos/1/$rota" 403 "$(cod -H "Authorization: Bearer $TB" "$A/postos/1/$rota")"
  confere "elias.jorro GET /postos/2/$rota" 403 "$(cod -H "Authorization: Bearer $TJ" "$A/postos/2/$rota")"
done
confere "elias.br  POST /postos/1/compras" 403 "$(cod -H "Authorization: Bearer $TB" -X POST $A/postos/1/compras -d '{}')"
confere "elias.br  POST /postos/1/equipe" 403 "$(cod -H "Authorization: Bearer $TB" -X POST $A/postos/1/equipe -d '{"nome":"X","data_admissao":"2026-09-27","ativo":true}')"

echo "3. Cada conta no próprio posto"
confere "BR tem 24 bicos" 24 "$(curl -s "${H[@]}" -H "Authorization: Bearer $TB" $A/postos/2/bicos | js 'len(d["data"])')"
confere "Jorro tem 6 bicos" 6 "$(curl -s "${H[@]}" -H "Authorization: Bearer $TJ" $A/postos/1/bicos | js 'len(d["data"])')"

echo "4. Escrita no BR não aparece no Jorro"
confere "elias.br cadastra frentista no BR" 201 "$(cod -H "Authorization: Bearer $TB" -X POST $A/postos/2/equipe -d '{"nome":"Diego (BR, ensaio)","data_admissao":"2026-09-27","ativo":true}')"
confere "Diego aparece no BR" True "$(curl -s "${H[@]}" -H "Authorization: Bearer $TB" $A/postos/2/equipe | js 'any("Diego" in f["nome"] for f in d["data"])')"
confere "Diego NÃO aparece no Jorro" False "$(curl -s "${H[@]}" -H "Authorization: Bearer $TJ" $A/postos/1/equipe | js 'any("Diego" in f["nome"] for f in d["data"])')"

echo "5. PWA — chave do frentista"
ESC=$(curl -s "${H[@]}" $A/postos/2/frentistas/escolha)
B1=$(echo "$ESC" | js '[f["id"] for f in d["data"] if f["nome"].startswith("Bruno")][0]')
confere "Bruno (BR) aparece sem chave" False "$(echo "$ESC" | js '[f["tem_chave"] for f in d["data"] if f["id"]=='"$B1"'][0]')"
confere "Bruno NÃO aparece na escolha do Jorro" False "$(curl -s "${H[@]}" $A/postos/1/frentistas/escolha | js 'any(f["id"]=='"$B1"' for f in d["data"])')"
confere "Bruno cria a chave pelo Jorro" 404 "$(cod -X POST $A/postos/1/frentistas/primeiro-acesso -d "{\"frentista_id\":$B1,\"pin\":\"4821\",\"pin_confirmacao\":\"4821\"}")"
confere "Bruno cria a chave no BR" 201 "$(cod -X POST $A/postos/2/frentistas/primeiro-acesso -d "{\"frentista_id\":$B1,\"pin\":\"4821\",\"pin_confirmacao\":\"4821\"}")"
confere "Bruno cria de novo (outra chave)" 409 "$(cod -X POST $A/postos/2/frentistas/primeiro-acesso -d "{\"frentista_id\":$B1,\"pin\":\"9999\",\"pin_confirmacao\":\"9999\"}")"
ENT=$(curl -s -w '\n%{http_code}' "${H[@]}" -X POST $A/postos/2/frentistas/entrar -d "{\"frentista_id\":$B1,\"pin\":\"4821\"}")
confere "chave antiga continua valendo" 200 "$(echo "$ENT" | tail -1)"
TA=$(echo "$ENT" | head -1 | js 'd["token"]')
confere "chave do Bruno não entra no Jorro" 401 "$(cod -X POST $A/postos/1/frentistas/entrar -d "{\"frentista_id\":$B1,\"pin\":\"4821\"}")"
confere "sessão do Bruno tem token" True "$([[ ${#TA} -gt 20 ]] && echo True || echo False)"
RECUSA=$(cod -H "Authorization: Bearer $TA" -X POST $A/postos/1/presenca -d '{}')
[[ "$RECUSA" =~ ^40[134]$ && ${#TA} -gt 20 ]] && RECUSA=recusado  # sem token, a recusa não prova nada
confere "sessão do Bruno marca presença no Jorro" recusado "$RECUSA"
PRES=$(cod -H "Authorization: Bearer $TA" -X POST $A/postos/2/presenca -d '{}')
[[ "$PRES" =~ ^20[0-9]$ ]] && PRES=2xx
confere "sessão do Bruno marca presença no BR" 2xx "$PRES"

echo "6. Banco"
confere "AcessoFrentista gravado só no BR (só o Bruno)" "2|1" "$(psql -Atc 'SELECT f.posto_id, count(*) FROM "AcessoFrentista" a JOIN "Frentista" f ON f.id = a.frentista_id GROUP BY 1')"
DEPOIS=$(psql -Atq -f $ENSAIO/banco/ensaio/retrato-do-jorro.sql)
if [[ "$ANTES" == "$DEPOIS" ]]; then confere "retrato do Jorro idêntico" sim sim; else confere "retrato do Jorro idêntico" sim não; diff <(echo "$ANTES") <(echo "$DEPOIS"); fi

echo; echo "RESULTADO: $ok ok, $falha falha(s)"
[[ $falha -eq 0 ]]
