#!/usr/bin/env bash
# Banco Postgres PRÓPRIO por worktree.
#
# Por que existe: o `docker-compose.yml` da raiz sobe UM Postgres com `container_name`
# fixo (`posto-postgres`) e a porta 5433 fixa. Como todas as worktrees são cópias do
# mesmo repositório, o `docker compose up` de qualquer uma delas encontra o container da
# outra já no ar, reusa — e o banco fica MONTANDO O `banco/init` DO CHECKOUT PRINCIPAL.
#
# Isso não é teoria: em 23/09/2026 o checkout principal ganhou
# `banco/init/02-multi-tenant-uniques-por-posto.sql` (não versionado, de outra sessão) e
# 3 testes do Pest passaram a reprovar em TODA branch, inclusive na `feat/#103-p9-api`,
# que não toca no esquema. O container montava um esquema mais novo do que a worktree.
#
# O que este script faz: sobe um Postgres isolado por pasta, com volume próprio e porta
# própria derivada do NOME DA PASTA (estável entre execuções, sem colidir entre
# worktrees), e aponta o `DB_PORT` do `backend/.env` desta worktree para ela.
#
#   scripts/banco-da-worktree.sh subir    sobe (ou religa) o banco desta pasta
#   scripts/banco-da-worktree.sh status   mostra pasta, container, porta e volume
#   scripts/banco-da-worktree.sh parar    para o container (o volume e o dado ficam)
#   scripts/banco-da-worktree.sh zerar    para e APAGA o volume desta pasta — pede confirmação
#
# O checkout principal continua usando `docker compose` como sempre: lá o container se
# chama `posto-postgres` e a porta é a 5433. Este script não o toca.
set -euo pipefail

raiz="$(git rev-parse --show-toplevel)"
nome="$(basename "$raiz")"
container="posto-pg-${nome//[^A-Za-z0-9_.-]/-}"
volume="posto-${nome//[^A-Za-z0-9_.-]/-}_pg"
env_backend="$raiz/backend/.env"

# Porta determinística a partir do nome: mesma pasta → mesma porta, sempre.
semente="$(printf '%s' "$nome" | cksum | cut -d' ' -f1)"
porta=$((5440 + semente % 50))

# Se a porta estiver ocupada por outro projeto (não pelo nosso container), anda até achar.
porta_ocupada() { ss -ltnH "sport = :$1" 2>/dev/null | grep -q .; }
# Container que já existe é a fonte da verdade da porta: o hash é só o palpite inicial.
if docker inspect "$container" >/dev/null 2>&1; then
  do_container="$(docker inspect -f '{{range $p, $c := .NetworkSettings.Ports}}{{range $c}}{{.HostPort}}{{end}}{{end}}' "$container")"
  [[ -n "$do_container" ]] && porta="$do_container"
else
  while porta_ocupada "$porta"; do porta=$((porta + 1)); done
fi

subir() {
  [[ -f "$raiz/banco/init/01-esquema-base.sql" ]] || {
    echo "ERRO: $raiz/banco/init/01-esquema-base.sql não existe — não vou subir banco sem esquema." >&2
    exit 1
  }

  if [[ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null)" == "true" ]]; then
    echo "banco já está no ar: $container (porta $porta)"
  else
    # Reusa o container parado quando ele já existe; senão cria.
    if docker inspect "$container" >/dev/null 2>&1; then
      docker start "$container" >/dev/null
      echo "container $container religado (porta $porta)"
    else
      docker run -d --name "$container" \
        -e POSTGRES_USER=posto -e POSTGRES_PASSWORD=posto -e POSTGRES_DB=posto \
        -e TZ=America/Sao_Paulo -e PGTZ=America/Sao_Paulo \
        -p "127.0.0.1:${porta}:5432" \
        -v "$raiz/banco/init:/docker-entrypoint-initdb.d:ro" \
        -v "${volume}:/var/lib/postgresql/data" \
        --health-cmd 'pg_isready -U posto -d posto' \
        --health-interval 3s --health-timeout 3s --health-retries 20 \
        postgres:17 >/dev/null
      echo "container $container criado (porta $porta, volume $volume)"
    fi
  fi

  # Espera o healthcheck: `--wait` explícito, porque o schema só termina depois dele.
  for _ in $(seq 1 40); do
    [[ "$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null)" == "healthy" ]] && break
    sleep 1
  done
  echo "saúde: $(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null)"

  if [[ -f "$env_backend" ]]; then
    if grep -q '^DB_PORT=' "$env_backend"; then
      sed -i "s|^DB_PORT=.*|DB_PORT=$porta|" "$env_backend"
    else
      printf '\nDB_PORT=%s\n' "$porta" >> "$env_backend"
    fi
    grep -q '^DB_HOST=' "$env_backend" || printf 'DB_HOST=127.0.0.1\n' >> "$env_backend"
    sed -i "s|^DB_HOST=.*|DB_HOST=127.0.0.1|" "$env_backend"
    echo "backend/.env aponta para 127.0.0.1:$porta"
  fi

  # Cadastros (Posto, frentistas, bicos, formas de pagamento). É o passo que o
  # `docker-compose.yml` documenta como manual. O arquivo é idempotente (`ON CONFLICT DO
  # NOTHING` em todas as inserções, dentro de um BEGIN), então aplicar sempre é seguro.
  # Não é versionado (dado pessoal), então a worktree pode não ter: cai no do principal.
  seed="$raiz/banco/dados/cadastros.sql"
  if [[ ! -f "$seed" ]]; then
    principal="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
    [[ -f "$principal/banco/dados/cadastros.sql" ]] && seed="$principal/banco/dados/cadastros.sql"
  fi
  if [[ -f "$seed" ]]; then
    docker exec -i "$container" psql -q -U posto -d posto < "$seed"
    echo "cadastros aplicados ($seed)"
  else
    echo "AVISO: banco/dados/cadastros.sql não encontrado — testes que precisam do Posto vão falhar." >&2
  fi

  # O `phpunit.xml` fixa `<env name="DB_PORT" value="5433"/>` e, por ser env de PROCESSO,
  # vence o `.env` do Laravel (o Dotenv não sobrescreve o que já existe no ambiente).
  # Sem este ajuste o Pest bate no banco COMPARTILHADO mesmo com o .env certo.
  phpunit="$raiz/backend/phpunit.xml"
  if [[ -f "$phpunit" ]]; then
    if grep -q '<env name="DB_PORT"' "$phpunit"; then
      # phpunit.xml antigo (até 23/09/2026): fixava DB_PORT e vencia o .env. Troca o valor.
      sed -i "s|<env name=\"DB_PORT\" value=\"[0-9]*\"/>|<env name=\"DB_PORT\" value=\"$porta\"/>|" "$phpunit"
      echo "backend/phpunit.xml (antigo) aponta DB_PORT para $porta"
    else
      echo "backend/phpunit.xml já não fixa DB_PORT — vale o backend/.env"
    fi
  else
    echo "AVISO: $phpunit não existe — o Pest pode estar batendo no banco errado." >&2
  fi

  echo
  echo "  psql: docker exec -it $container psql -U posto -d posto"
  echo "  Dica: o banco do compose (posto-postgres, 5433) é do checkout principal e NÃO é este."
}

case "${1:-subir}" in
  subir) subir ;;
  status)
    echo "pasta     : $raiz"
    echo "container : $container"
    echo "porta     : $porta"
    echo "volume    : $volume"
    echo "estado    : $(docker inspect -f '{{.State.Status}} (health {{.State.Health.Status}})' "$container" 2>/dev/null || echo 'não existe')"
    grep -n '^DB_' "$env_backend" 2>/dev/null | sed 's/^/env       : /' || true
    ;;
  parar)
    docker stop "$container" >/dev/null && echo "parado: $container (volume $volume preservado)"
    ;;
  zerar)
    read -r -p "Apagar o volume $volume (todo o dado deste banco) e o container? [s/N] " r
    [[ "$r" == "s" || "$r" == "S" ]] || { echo "cancelado"; exit 0; }
    docker rm -f "$container" >/dev/null 2>&1 || true
    docker volume rm "$volume" >/dev/null 2>&1 || true
    echo "zerado: container $container e volume $volume"
    ;;
  *) echo "uso: $0 {subir|status|parar|zerar}" >&2; exit 2 ;;
esac
