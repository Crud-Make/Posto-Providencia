#!/usr/bin/env bash
# ============================================================================================
#  Prepara o ENSAIO LOCAL de dois postos (Posto Jorro = 1, Posto BR = 2).
#  DADO DE DEMONSTRAÇÃO — NUNCA RODAR CONTRA PRODUÇÃO. Só fala com o Postgres desta worktree.
# ============================================================================================
#
# A demo mora num banco PRÓPRIO, `posto_demo`, dentro do container da worktree — nunca no `posto`:
# o Pest roda no `posto` (em transação) e vários testes contam as linhas da tabela inteira
# (Compra, Recebimento, tokens de PIN). Com o movimento da demo lá, 18 testes reprovam e o
# `pre-push` trava. Separados, os gates e a demo não se enxergam.
#
# O que faz, em ordem (tudo idempotente — rodar de novo não duplica nada):
#   1. sobe/usa o container da worktree (scripts/banco-da-worktree.sh subir);
#   2. cria o banco `posto_demo` quando não existe, com o esquema de banco/init/*.sql e os
#      cadastros do Posto 1 (banco/dados/cadastros.sql, não versionado);
#   3. se o Posto 1 não tiver Leitura de jan/2026, carrega janeiro do Jorro a partir da referência
#      validada (docs/data/posto_jorro_2026.sqlite, NÃO versionada) com os scripts de carga do ETL:
#      Leitura, Compra, Fechamento (+ envios) e Despesa;
#   4. aplica scripts/demo/posto-br.sql (cadastro + movimento inventado do Posto BR);
#   5. cria as contas do ensaio chamando as MESMAS ações dos comandos `usuario:definir` e
#      `frentista:pin` (DefineUsuario, DefinePinDoFrentista), via tinker — os comandos pedem a
#      senha por `secret()`, que não aceita entrada sem terminal;
#   6. imprime as credenciais, que ficam em scripts/demo/.credenciais-demo (gitignored, 0600).
#
# Uso:   scripts/demo/prepara-demo.sh
# Subir a API sobre a demo:   cd backend && DB_DATABASE=posto_demo php artisan serve
# Recomeçar do zero:          docker exec <container> dropdb -U posto posto_demo  (e rodar de novo)
# Trocar senhas/PINs:         apagar scripts/demo/.credenciais-demo e rodar de novo.
set -euo pipefail

raiz="$(git rev-parse --show-toplevel)"
nome="$(basename "$raiz")"
container="posto-pg-${nome//[^A-Za-z0-9_.-]/-}"
banco="posto_demo"
credenciais="$raiz/scripts/demo/.credenciais-demo"
env_backend="$raiz/backend/.env"

psql_demo() { docker exec -i "$container" psql -v ON_ERROR_STOP=1 -q -U posto -d "$banco" "$@"; }
valor() { docker exec -i "$container" psql -At -U posto -d "$banco" -c "$1"; }

# --- 0. Lombada: o backend desta worktree tem de apontar para o Postgres local -------------------
host="$(grep -E '^DB_HOST=' "$env_backend" | cut -d= -f2- || true)"
if [[ -n "$host" && "$host" != "127.0.0.1" && "$host" != "localhost" ]]; then
  echo "ERRO: backend/.env aponta DB_HOST=$host. Este script é só para o banco LOCAL da worktree." >&2
  exit 1
fi

# --- 1. Container --------------------------------------------------------------------------------
# O `subir` pode sair 141 (SIGPIPE) sem terminal: o `git worktree list | awk '{...; exit}'` dele
# fecha o pipe cedo e o `pipefail` derruba o script. O que importa aqui é o container saudável.
"$raiz/scripts/banco-da-worktree.sh" subir || true
[[ "$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null)" == "healthy" ]] || {
  echo "ERRO: o banco $container não subiu." >&2; exit 1; }

# --- 2. Banco da demo ----------------------------------------------------------------------------
existe="$(docker exec -i "$container" psql -At -U posto -d posto -c "SELECT 1 FROM pg_database WHERE datname = '$banco'")"
if [[ "$existe" != "1" ]]; then
  echo "Criando o banco $banco com o esquema de banco/init..."
  docker exec -i "$container" createdb -U posto "$banco"
  for arquivo in "$raiz"/banco/init/*.sql; do
    psql_demo < "$arquivo"
  done
fi

seed="$raiz/banco/dados/cadastros.sql"
[[ -f "$seed" ]] || seed="$(git worktree list --porcelain | awk '/^worktree /{if (!p) {print $2; p=1}}')/banco/dados/cadastros.sql"
[[ -f "$seed" ]] || { echo "ERRO: banco/dados/cadastros.sql não encontrado (cadastros do Posto 1)." >&2; exit 1; }
psql_demo < "$seed"
echo "cadastros do Posto 1 aplicados em $banco ($seed)"

# --- 3. Janeiro do Jorro -------------------------------------------------------------------------
jorro_jan="$(valor "SELECT count(*) FROM \"Leitura\" WHERE posto_id = 1 AND (data AT TIME ZONE 'UTC')::date BETWEEN '2026-01-01' AND '2026-01-31'")"
if [[ "$jorro_jan" == "0" ]]; then
  if [[ -f "$raiz/docs/data/posto_jorro_2026.sqlite" ]]; then
    echo "Carregando janeiro/2026 do Posto Jorro a partir de docs/data (referência validada)..."
    ( cd "$raiz"
      python3 scripts/carga-historico-leitura.py 1 --sql | psql_demo
      python3 scripts/carga-historico-compra.py 1 --sql | psql_demo
      python3 scripts/carga-historico-fechamento.py 1 --sql | psql_demo
      python3 scripts/carga-historico-despesa.py 1 --fonte planilha --sql | psql_demo )
  else
    echo "AVISO: sem docs/data/posto_jorro_2026.sqlite — o Jorro fica sem movimento; o BR usa 1..31/jan." >&2
  fi
else
  echo "Jorro já tem $jorro_jan leituras em jan/2026 — não recarrego."
fi

# --- 4. Posto BR ---------------------------------------------------------------------------------
psql_demo < "$raiz/scripts/demo/posto-br.sql"
posto_br="$(valor "SELECT id FROM \"Posto\" WHERE nome = 'Posto BR' ORDER BY id LIMIT 1")"

# Frentistas que ganham PIN: o primeiro ativo do Jorro, e Carla BR e Diego BR.
frent_jorro="$(valor "SELECT id FROM \"Frentista\" WHERE posto_id = 1 AND ativo ORDER BY id LIMIT 1")"
frent_carla="$(valor "SELECT id FROM \"Frentista\" WHERE posto_id = $posto_br AND nome = 'Carla BR'")"
frent_diego="$(valor "SELECT id FROM \"Frentista\" WHERE posto_id = $posto_br AND nome = 'Diego BR'")"

# --- 5. Credenciais (reusa as do arquivo; senão gera) --------------------------------------------
if [[ ! -f "$credenciais" ]]; then
  pin() { printf '%04d' $(( $(od -An -N2 -tu2 /dev/urandom) % 10000 )); }
  umask 077
  cat > "$credenciais" <<EOF
# Credenciais do ENSAIO LOCAL — NÃO versionar, NÃO usar em produção.
SENHA_DONO=demo-$(openssl rand -hex 4)
SENHA_ELIAS=demo-$(openssl rand -hex 4)
SENHA_GERENTE_BR=demo-$(openssl rand -hex 4)
SENHA_GERENTE_JORRO=demo-$(openssl rand -hex 4)
PIN_FRENTISTA_JORRO=$(pin)
PIN_FRENTISTA_BR=$(pin)
PIN_FRENTISTA_BR_2=$(pin)
EOF
fi
chmod 600 "$credenciais"
# shellcheck disable=SC1090
source "$credenciais"

export SENHA_DONO SENHA_ELIAS SENHA_GERENTE_BR SENHA_GERENTE_JORRO PIN_FRENTISTA_JORRO PIN_FRENTISTA_BR PIN_FRENTISTA_BR_2
export POSTO_BR="$posto_br" FRENT_JORRO="$frent_jorro" FRENT_CARLA="$frent_carla" FRENT_DIEGO="$frent_diego"

# As mesmas ações dos comandos `usuario:definir` e `frentista:pin`; segredo entra por variável de
# ambiente, nunca na linha de comando. DB_DATABASE no ambiente vence o backend/.env (o Dotenv não
# sobrescreve variável que já existe).
( cd "$raiz/backend" && DB_DATABASE="$banco" php artisan tinker --execute='
use App\Compartilhado\Enums\PapelNoPosto as P;
use App\Compartilhado\Enums\Role as R;
if (Illuminate\Support\Facades\DB::connection()->getDatabaseName() !== "posto_demo") { fwrite(STDERR, "banco errado\n"); exit(1); }
$u = app(App\Pessoas\Application\DefineUsuario::class);
$p = app(App\Pessoas\Application\DefinePinDoFrentista::class);
$br = (int) getenv("POSTO_BR");
$u("posto@providencia.com", "Dono do projeto", R::Admin, getenv("SENHA_DONO"), [1 => P::Admin, $br => P::Admin]);
$u("postoprovidenciaa@gmail.com", "Elias", R::Gerente, getenv("SENHA_ELIAS"), [1 => P::Gerente, $br => P::Gerente]);
$u("gerente.br@demo.local", "Gerente só do BR (demo)", R::Gerente, getenv("SENHA_GERENTE_BR"), [$br => P::Gerente]);
$u("gerente.jorro@demo.local", "Gerente só do Jorro (demo)", R::Gerente, getenv("SENHA_GERENTE_JORRO"), [1 => P::Gerente]);
$ok = $p((int) getenv("FRENT_JORRO"), getenv("PIN_FRENTISTA_JORRO"))
   && $p((int) getenv("FRENT_CARLA"), getenv("PIN_FRENTISTA_BR"))
   && $p((int) getenv("FRENT_DIEGO"), getenv("PIN_FRENTISTA_BR_2"));
if (! $ok) { fwrite(STDERR, "PIN não gravado\n"); exit(1); }
echo "contas e PINs gravados em posto_demo\n";
' )

# --- 6. Resumo -----------------------------------------------------------------------------------
echo
echo "================= ENSAIO LOCAL — DOIS POSTOS (banco $banco) ================="
valor "SELECT format('%-12s id=%s', nome, id) FROM \"Posto\" WHERE id IN (1, $posto_br) ORDER BY id"
echo
valor "SELECT format('posto %s  jan/2026: %s leituras, R\$ %s vendidos, %s fechamentos, %s compras, R\$ %s de despesa',
         p.id,
         (SELECT count(*) FROM \"Leitura\" l WHERE l.posto_id = p.id AND (l.data AT TIME ZONE 'UTC')::date BETWEEN '2026-01-01' AND '2026-01-31'),
         (SELECT COALESCE(sum(valor_total), 0) FROM \"Leitura\" l WHERE l.posto_id = p.id AND (l.data AT TIME ZONE 'UTC')::date BETWEEN '2026-01-01' AND '2026-01-31'),
         (SELECT count(*) FROM \"Fechamento\" f WHERE f.posto_id = p.id AND (f.data AT TIME ZONE 'UTC')::date BETWEEN '2026-01-01' AND '2026-01-31'),
         (SELECT count(*) FROM \"Compra\" c WHERE c.posto_id = p.id AND (c.data AT TIME ZONE 'UTC')::date BETWEEN '2026-01-01' AND '2026-01-31'),
         (SELECT COALESCE(sum(valor), 0) FROM \"Despesa\" d WHERE d.posto_id = p.id AND d.data BETWEEN '2026-01-01' AND '2026-01-31'))
       FROM \"Posto\" p WHERE p.id IN (1, $posto_br) ORDER BY p.id"
echo
echo "Contas do painel (POST /api/login — no máximo 6 logins por minuto por IP):"
echo "  ADMIN    posto@providencia.com         senha: $SENHA_DONO"
echo "  GERENTE  postoprovidenciaa@gmail.com   senha: $SENHA_ELIAS   (Elias — Jorro e BR)"
echo "  GERENTE  gerente.br@demo.local         senha: $SENHA_GERENTE_BR   (só BR)"
echo "  GERENTE  gerente.jorro@demo.local      senha: $SENHA_GERENTE_JORRO   (só Jorro)"
echo "PWA do frentista (POST /api/postos/{posto}/frentistas/entrar):"
echo "  posto 1          frentista_id=$frent_jorro   PIN: $PIN_FRENTISTA_JORRO"
echo "  posto $posto_br (BR)     frentista_id=$frent_carla (Carla BR)   PIN: $PIN_FRENTISTA_BR"
echo "  posto $posto_br (BR)     frentista_id=$frent_diego (Diego BR)   PIN: $PIN_FRENTISTA_BR_2"
echo
echo "Credenciais guardadas em: $credenciais (fora do git)"
echo "API sobre a demo:  cd backend && DB_DATABASE=$banco php artisan serve"
echo "Dias 16–31/jan do BR estão SEM fechamento: são os dias livres para enviar pelo PWA no ensaio."
