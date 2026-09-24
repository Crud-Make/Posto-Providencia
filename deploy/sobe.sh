#!/usr/bin/env bash
# Sobe (ou opera) a produção do backend Laravel na VPS (#105).
#
#   deploy/sobe.sh            constrói a imagem e sobe
#   deploy/sobe.sh atualizar  reconstrói a imagem e recria o que mudou
#   deploy/sobe.sh status     o que está no ar
#   deploy/sobe.sh logs       segue o log da API
#   deploy/sobe.sh saude      pergunta ao /api/saude pela URL pública
#   deploy/sobe.sh parar      derruba tudo (os volumes ficam: o certificado não se refaz à toa)
#
# O que ele NÃO faz: preencher segredo. Sem o `deploy/.env.producao`, ele cria o arquivo a partir
# do exemplo, diz o que falta e PARA. Subir com o valor errado é pior do que não subir: parado,
# ninguém perde nada; no ar, ele atende — e atende errado, em silêncio.
#
# A checagem das chaves aparece duas vezes de propósito: aqui, com mensagem que diz onde arrumar; e
# no `backend/docker/entrypoint.sh`, que é a que não tem como pular.
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$raiz"

exemplo="$raiz/deploy/.env.producao.exemplo"
env_prod="$raiz/deploy/.env.producao"
compose=(docker compose -f "$raiz/docker-compose.prod.yml")

erro() { echo "ERRO: $*" >&2; }

exigir_docker() {
    command -v docker >/dev/null || { erro "docker não está instalado nesta máquina"; exit 1; }
    docker compose version >/dev/null 2>&1 || { erro "o plugin 'docker compose' (v2) não responde"; exit 1; }
}

carregar_env() {
    if [[ ! -f "$env_prod" ]]; then
        cp "$exemplo" "$env_prod"
        chmod 600 "$env_prod"
        echo "Criei $env_prod a partir do exemplo, com as chaves VAZIAS."
        echo
        echo "Preencha estas — o container recusa subir sem elas:"
        echo "  APP_KEY, DB_HOST, DB_PASSWORD, CORS_ORIGINS, SUPABASE_JWT_SECRET"
        echo "E confira DOMINIO_API e ACME_EMAIL, que são do edge."
        echo
        echo "Para gerar a APP_KEY:  cd backend && php artisan key:generate --show"
        exit 1
    fi

    # Sem `source`: o arquivo tem valor com espaço (APP_NAME), e o shell o interpretaria como
    # comando. Aqui só se separa na primeira igualdade e se tiram as aspas das pontas.
    local linha chave valor
    while IFS= read -r linha || [[ -n "$linha" ]]; do
        [[ "$linha" =~ ^[[:space:]]*$ || "$linha" =~ ^[[:space:]]*# ]] && continue
        chave="${linha%%=*}"
        valor="${linha#*=}"
        chave="${chave//[[:space:]]/}"
        [[ -z "$chave" ]] && continue
        valor="${valor%\"}"; valor="${valor#\"}"
        export "$chave=$valor"
    done < "$env_prod"

    local faltando=()
    for v in DOMINIO_API ACME_EMAIL APP_KEY DB_HOST DB_PASSWORD CORS_ORIGINS SUPABASE_JWT_SECRET; do
        [[ -z "${!v:-}" ]] && faltando+=("$v")
    done
    if (( ${#faltando[@]} > 0 )); then
        erro "vazio(s) no $env_prod: ${faltando[*]}"
        exit 1
    fi

    if [[ "$CORS_ORIGINS" == "*" ]]; then
        erro "CORS_ORIGINS=* deixa qualquer site chamar esta API. Liste a origem do painel."
        exit 1
    fi

    # Deixa claro com qual banco se está falando, porque o erro de apontar para o banco errado não
    # aparece em log nenhum: o sistema funciona, só que sobre o dado de outro lugar.
    echo "domínio : $DOMINIO_API"
    echo "banco   : $DB_USERNAME@$DB_HOST:$DB_PORT/$DB_DATABASE (ssl=$DB_SSLMODE)"
    echo "cors    : $CORS_ORIGINS"
    echo
}

subir() {
    carregar_env
    "${compose[@]}" up -d --build --wait
    echo
    "${compose[@]}" ps
    echo
    echo "sonda: https://$DOMINIO_API/api/saude"
    curl -fsS --max-time 15 "https://$DOMINIO_API/api/saude" || erro "o /api/saude não respondeu — veja: deploy/sobe.sh logs"
    echo
}

case "${1:-subir}" in
subir) exigir_docker; subir ;;
atualizar) exigir_docker; carregar_env; "${compose[@]}" up -d --build --wait; "${compose[@]}" ps ;;
status) exigir_docker; "${compose[@]}" ps ;;
logs) exigir_docker; "${compose[@]}" logs -f --tail=100 api ;;
saude)
    carregar_env
    curl -fsS --max-time 15 "https://$DOMINIO_API/api/saude" || erro "sem resposta de https://$DOMINIO_API/api/saude"
    echo
    ;;
parar) exigir_docker; "${compose[@]}" down ;;
*) erro "uso: $0 {subir|atualizar|status|logs|saude|parar}"; exit 2 ;;
esac