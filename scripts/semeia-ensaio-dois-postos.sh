#!/usr/bin/env bash
# Semeia o ensaio do MVP com dois postos (skill validar-mvp-dois-postos): Posto BR com 24 bicos,
# contas do ensaio e PINs. Roda banco/ensaio/posto-br.sql SÓ no Postgres local de um container
# `posto-pg-*` ou `posto-postgres` — recusa qualquer outra porta, e nunca fala com o Supabase.
#
# Uso: scripts/semeia-ensaio-dois-postos.sh <porta>   (ex.: 5469; a da worktree: scripts/banco-da-worktree.sh)
# Imprime UMA vez as senhas e PINs gerados; guarde para o ensaio. Rodar de novo não refaz nada.
set -euo pipefail

PORTA="${1:?uso: scripts/semeia-ensaio-dois-postos.sh <porta do Postgres local>}"
[[ "$PORTA" =~ ^[0-9]+$ ]] || { echo "porta inválida: $PORTA" >&2; exit 1; }

if ! docker ps --format '{{.Names}} {{.Ports}}' | grep -qE "^posto-(pg-[^ ]+|postgres) (127\.0\.0\.1|0\.0\.0\.0):${PORTA}->5432/"; then
    echo "Recusado: a porta $PORTA não é de um container posto-pg-* / posto-postgres local. O ensaio não roda em outro banco." >&2
    exit 1
fi

export PGHOST=127.0.0.1 PGPORT="$PORTA" PGUSER="${PGUSER:-posto}" PGDATABASE="${PGDATABASE:-posto}"
export PGPASSWORD="${PGPASSWORD:-posto}"

if [[ "$(psql -Atc "SELECT EXISTS (SELECT 1 FROM \"Posto\" WHERE nome = 'Posto BR')")" == "t" ]]; then
    echo "Posto BR já existe no banco da porta $PORTA — nada feito. Para refazer, recrie o volume do compose."
    exit 0
fi

hash() { php -r 'echo password_hash($argv[1], PASSWORD_BCRYPT, ["cost" => 12]);' "$1"; }
senha() { openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 14; }
pin() { printf '%06d' "$(( $(od -An -N4 -tu4 /dev/urandom) % 1000000 ))"; }

SENHA_DONO=$(senha); SENHA_ELIAS=$(senha); SENHA_SO_BR=$(senha)
declare -A PIN
for r in B1 B2 B3 J1 J2; do PIN[$r]=$(pin); done

DIR=$(cd "$(dirname "$0")/.." && pwd)
psql -v ON_ERROR_STOP=1 -q \
    -v h_dono="$(hash "$SENHA_DONO")" -v h_elias="$(hash "$SENHA_ELIAS")" -v h_so_br="$(hash "$SENHA_SO_BR")" \
    -v h_pin_b1="$(hash "${PIN[B1]}")" -v h_pin_b2="$(hash "${PIN[B2]}")" -v h_pin_b3="$(hash "${PIN[B3]}")" \
    -v h_pin_j1="$(hash "${PIN[J1]}")" -v h_pin_j2="$(hash "${PIN[J2]}")" \
    -f "$DIR/banco/ensaio/posto-br.sql"

cat <<EOF

=== Credenciais do ensaio (banco local na porta $PORTA) — não vão para o git ===
ADMIN(s) listados acima  senha: $SENHA_DONO
postoprovidenciaa@gmail.com (Elias, Jorro + BR)  senha: $SENHA_ELIAS
gerente.br@ensaio.local (só BR)  senha: $SENHA_SO_BR
PINs (rótulo → frentista na lista FRENTISTAS_COM_PIN acima):
  B1 ${PIN[B1]}   B2 ${PIN[B2]}   B3 ${PIN[B3]}   J1 ${PIN[J1]}   J2 ${PIN[J2]}
EOF
