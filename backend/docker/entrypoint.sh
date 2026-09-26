#!/bin/sh
# Entrypoint de produção (#105). Roda como `www-data`, a cada partida do container.
#
# Duas responsabilidades, e só duas:
#
#   1. RECUSAR subir quando falta o que produção exige, ou quando está ligado o que não pode
#      estar. Um container que sobe com o CORS aberto ou sem o segredo do token é pior do que um
#      container parado: parado, ninguém perde nada; no ar, ele ATENDE — e atende errado, em
#      silêncio. A trava é aqui, não no runbook, porque runbook se pula.
#
#   2. Refazer os caches que dependem do ambiente. `config:cache` congela o `env()` do momento em
#      que roda: feito no build, gravaria os valores do build; aqui, grava os da VPS.
set -eu

cd /app

exigir() {
    nome="$1"
    motivo="$2"
    eval "valor=\${$nome:-}"
    if [ -z "$valor" ]; then
        echo "ERRO: $nome não definida. $motivo" >&2
        exit 1
    fi
}

if [ "${APP_ENV:-production}" = "production" ]; then
    exigir APP_KEY "Sem ela o Laravel não cifra sessão nem cookie. Gere com: php artisan key:generate --show"
    exigir DB_HOST "Aponte para o Postgres de produção (o do Supabase, no ensaio de 27/09/2026)."
    exigir SUPABASE_JWT_SECRET "É o segredo que valida o token do painel. Sem ele, TODO login responde 401."

    # O padrão do framework é `allowed_origins: ['*']`, que deixa qualquer site chamar esta API.
    # Em produção isso não passa — e não é aviso, é parada.
    case "${CORS_ORIGINS:-}" in
    "" | "*")
        echo "ERRO: CORS_ORIGINS está vazia ou '*': qualquer site poderia chamar esta API." >&2
        echo "      Liste a origem do painel, ex.: CORS_ORIGINS=https://posto.vercel.app" >&2
        exit 1
        ;;
    esac
fi

# Os caches que dependem do ambiente. `event:cache` tolerado: um app sem eventos é válido.
php artisan config:cache --no-interaction
php artisan route:cache --no-interaction
php artisan event:cache --no-interaction 2>/dev/null || true

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs
chmod -R ug+rwX storage bootstrap/cache 2>/dev/null || true

exec "$@"