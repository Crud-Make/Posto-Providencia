#!/usr/bin/env bash
# Verifica a trava de UPDATE anônimo por janela (migração 20260802_trava_update).
#
# Rode ANTES de aplicar (esperado: FALHA) e DEPOIS (esperado: PASSA).
#
# NÃO ESCREVE NADA, e isso não é promessa — é consequência do payload. Cada
# PATCH tenta gravar NULL numa coluna NOT NULL sem default, filtrado por um id
# real. Os dois desfechos possíveis são:
#   - RLS DEIXA PASSAR -> Postgres recusa com 23502 e aborta a transação
#   - RLS BARRA        -> a linha não entra no conjunto, volta 204 vazio
# Em nenhum dos dois um valor chega ao disco.
#
# POR QUE ESSE TRUQUE, E NÃO O STATUS HTTP:
#   Para UPDATE o PostgREST devolve 204 tanto para "policy negou" quanto para
#   "policy permitiu, 0 linhas casaram" — indistinguíveis. Foi assim que o mapa
#   da RLS saiu errado duas vezes. O 23502 é o único sinal inequívoco de que a
#   policy deixou o UPDATE chegar até a tabela.
#
# ⚠️ ELE NÃO TESTA "TUDO BLOQUEADO" — de propósito. Uma policy que bloqueasse
#   tudo também passaria nesse teste, e quebraria o painel. Ele testa a REGRA:
#   linha anterior ao mês passado BLOQUEADA, linha dentro da janela AINDA
#   GRAVÁVEL. Os dois lados precisam estar certos.
set -uo pipefail
cd "$(dirname "$0")/../.."

URL=$(grep '^VITE_SUPABASE_URL='      .env | cut -d= -f2- | tr -d '"'"'"' \r')
KEY=$(grep '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '"'"'"' \r')
[ -n "$URL" ] && [ -n "$KEY" ] || { echo "ERRO: .env sem URL/KEY"; exit 1; }

# Início do mês anterior — a mesma fronteira que a policy usa.
INICIO=$(date -d "$(date +%Y-%m-01) -1 month" +%F)
falhas=0

api() { curl -s -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}" --max-time 20 "$@"; }

primeiro_id() { # url -> id ou vazio
  api "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')" 2>/dev/null
}

tentar_update() { # tabela id coluna -> SQLSTATE ou 'sem-codigo'
  api -X PATCH "${URL}/rest/v1/$1?id=eq.$2" -H 'Content-Type: application/json' -d "{\"$3\":null}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('code','sem-codigo'))" 2>/dev/null \
  || echo 'sem-codigo'
}

checar() { # descricao tabela id coluna esperado(bloqueado|gravavel)
  local desc="$1" got; got=$(tentar_update "$2" "$3" "$4")
  local ok=1
  case "$5" in
    bloqueado) [ "$got" = 'sem-codigo' ] || [ "$got" = '42501' ] && ok=0 ;;
    gravavel)  [ "$got" = '23502' ] && ok=0 ;;
  esac
  if [ "$ok" -eq 0 ]; then
    printf '  ✓ %-46s (%s)\n' "$desc" "$got"
  else
    printf '  ✗ %-46s esperado %s, veio %s\n' "$desc" "$5" "$got"; falhas=$((falhas+1))
  fi
}

# Prova que o WITH CHECK está ativo: tenta EMPURRAR uma linha da janela para
# fora dela (backdating). Sem WITH CHECK, um atacante moveria a linha para
# janeiro e ela sairia do alcance da própria policy — a trava se desarmaria.
#
# O payload leva a data antiga E um NULL em coluna NOT NULL. Os dois desfechos
# não gravam nada, e se distinguem:
#   WITH CHECK barra  -> 42501
#   WITH CHECK passa  -> 23502 (o NOT NULL mata antes de gravar)
checar_backdating() { # tabela id coluna_isca
  local got
  got=$(api -X PATCH "${URL}/rest/v1/$1?id=eq.$2" -H 'Content-Type: application/json' \
        -d "{\"data\":\"2026-01-15\",\"$3\":null}" \
        | python3 -c "import sys,json; print(json.load(sys.stdin).get('code','sem-codigo'))" 2>/dev/null \
        || echo 'sem-codigo')
  if [ "$got" = '42501' ]; then
    printf '  ✓ %-46s (42501)\n' "$1: backdating da linha da janela barrado"
  else
    printf '  ✗ %-46s esperado 42501, veio %s\n' "$1: backdating da linha da janela" "$got"
    falhas=$((falhas+1))
  fi
}

# Tabela com coluna `data` própria.
checar_por_data() { # tabela coluna_isca
  local tabela="$1" isca="$2" antigo recente
  antigo=$(primeiro_id "${URL}/rest/v1/${tabela}?select=id,data&data=lt.${INICIO}&order=data.asc&limit=1")
  recente=$(primeiro_id "${URL}/rest/v1/${tabela}?select=id,data&data=gte.${INICIO}&order=data.desc&limit=1")

  if [ -n "$antigo" ]; then
    checar "${tabela}: linha ANTIGA (id=${antigo}) barrada" "$tabela" "$antigo" "$isca" bloqueado
  else
    printf '  — %-46s sem linha anterior a %s para testar\n' "${tabela}: lado antigo" "$INICIO"
  fi

  if [ -n "$recente" ]; then
    checar "${tabela}: linha da janela (id=${recente}) gravável" "$tabela" "$recente" "$isca" gravavel
    checar_backdating "$tabela" "$recente" "$isca"
  else
    printf '  — %-46s sem linha dentro da janela para testar\n' "${tabela}: lado recente"
  fi
}

# Tabela sem data própria: a janela vem do Fechamento pai.
checar_por_pai() { # tabela coluna_isca
  local tabela="$1" isca="$2" antigo recente
  antigo=$(primeiro_id "${URL}/rest/v1/${tabela}?select=id,Fechamento!inner(data)&Fechamento.data=lt.${INICIO}&limit=1")
  recente=$(primeiro_id "${URL}/rest/v1/${tabela}?select=id,Fechamento!inner(data)&Fechamento.data=gte.${INICIO}&limit=1")

  if [ -n "$antigo" ]; then
    checar "${tabela}: pai ANTIGO (id=${antigo}) barrado" "$tabela" "$antigo" "$isca" bloqueado
  else
    printf '  — %-46s nenhum Fechamento pai anterior a %s\n' "${tabela}: lado antigo" "$INICIO"
  fi

  if [ -n "$recente" ]; then
    checar "${tabela}: pai na janela (id=${recente}) gravável" "$tabela" "$recente" "$isca" gravavel
  else
    printf '  — %-46s nenhum Fechamento pai dentro da janela\n' "${tabela}: lado recente"
  fi
}

echo "Janela de edição — a partir de ${INICIO} (início do mês anterior)"
echo
echo "Regra: antes da janela = barrado; dentro da janela = ainda gravável."
echo
checar_por_data Leitura    litros_vendidos
checar_por_data Fechamento total_vendas
checar_por_pai  Recebimento         valor
checar_por_pai  FechamentoFrentista frentista_id

echo
if [ "$falhas" -eq 0 ]; then
  echo "OK — histórico congelado e o caminho legítimo do painel segue aberto."; exit 0
else
  echo "FALHOU em ${falhas} verificação(ões)."; exit 1
fi
