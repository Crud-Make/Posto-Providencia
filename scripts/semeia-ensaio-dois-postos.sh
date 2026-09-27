#!/usr/bin/env bash
# Semeia o ensaio do MVP com dois postos (skill validar-mvp-dois-postos): Posto BR com 24 bicos,
# uma conta de gerente por posto e 3 frentistas SEM chave (cada um cadastra a sua no PWA). Roda
# banco/ensaio/posto-br.sql SÓ no Postgres local de um container
# `posto-pg-*` ou `posto-postgres` — recusa qualquer outra porta, e nunca fala com o Supabase.
#
# Uso: scripts/semeia-ensaio-dois-postos.sh <porta>   (ex.: 5469; a da worktree: scripts/banco-da-worktree.sh)
# O Jorro não muda: tira o retrato dele (banco/ensaio/retrato-do-jorro.sql) antes e depois do seed e
# aborta se diferir. Imprime UMA vez as senhas geradas; guarde para o ensaio. Rodar de novo não
# refaz nada.
set -euo pipefail

PORTA="${1:?uso: scripts/semeia-ensaio-dois-postos.sh <porta do Postgres local>}"
[[ "$PORTA" =~ ^[0-9]+$ ]] || { echo "porta inválida: $PORTA" >&2; exit 1; }

if ! docker ps --format '{{.Names}} {{.Ports}}' | grep -qE "^posto-(pg-[^ ]+|postgres) (127\.0\.0\.1|0\.0\.0\.0):${PORTA}->5432/"; then
    echo "Recusado: a porta $PORTA não é de um container posto-pg-* / posto-postgres local. O ensaio não roda em outro banco." >&2
    exit 1
fi

export PGHOST=127.0.0.1 PGPORT="$PORTA" PGUSER="${PGUSER:-posto}" PGDATABASE="${PGDATABASE:-posto}"
export PGPASSWORD="${PGPASSWORD:-posto}"

if [[ "$(psql -Atc "SELECT EXISTS (SELECT 1 FROM \"Posto\" WHERE id = 1)")" != "t" ]]; then
    echo "Recusado: o banco da porta $PORTA não tem o Jorro (Posto id 1) — o BR tomaria o id dele." >&2
    echo "Suba o banco com os cadastros (scripts/banco-da-worktree.sh subir) e rode de novo." >&2
    exit 1
fi

if [[ "$(psql -Atc "SELECT EXISTS (SELECT 1 FROM \"Posto\" WHERE nome = 'Posto BR')")" == "t" ]]; then
    echo "Posto BR já existe no banco da porta $PORTA — nada feito. Para refazer, recrie o volume do compose."
    exit 0
fi

hash() { php -r 'echo password_hash($argv[1], PASSWORD_BCRYPT, ["cost" => 12]);' "$1"; }
senha() { openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 14; }

SENHA_DONO=$(senha); SENHA_ELIAS_JORRO=$(senha); SENHA_ELIAS_BR=$(senha)

DIR=$(cd "$(dirname "$0")/.." && pwd)
retrato() { psql -Atq -f "$DIR/banco/ensaio/retrato-do-jorro.sql"; }
ANTES=$(retrato)

psql -v ON_ERROR_STOP=1 -q \
    -v h_dono="$(hash "$SENHA_DONO")" -v h_elias_jorro="$(hash "$SENHA_ELIAS_JORRO")" -v h_elias_br="$(hash "$SENHA_ELIAS_BR")" \
    -f "$DIR/banco/ensaio/posto-br.sql"

if [[ "$(retrato)" != "$ANTES" ]]; then
    echo "ERRO: o retrato do Jorro mudou durante o seed. Compare: diff <(echo \"\$ANTES\") <(retrato)" >&2
    exit 1
fi
echo "Jorro intacto: retrato idêntico antes e depois ($(wc -l <<<"$ANTES") tabelas com posto_id)."

cat <<EOF

=== Credenciais do ensaio (banco local na porta $PORTA) — não vão para o git ===
ADMIN(s) listados acima  senha: $SENHA_DONO
elias.jorro@ensaio.local (só Jorro)  senha: $SENHA_ELIAS_JORRO
elias.br@ensaio.local (só BR)  senha: $SENHA_ELIAS_BR
Frentistas do BR: sem chave — cada um cadastra a sua no primeiro acesso do PWA.
EOF
