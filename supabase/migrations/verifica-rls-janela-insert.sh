#!/usr/bin/env bash
# Verifica a trava de INSERT por janela (migração 20260802).
#
# Rode ANTES de aplicar a migração (esperado: FALHA) e DEPOIS (esperado: PASSA).
#
# NÃO ESCREVE NADA. O payload é incompleto de propósito:
#   - se a RLS barra   -> 42501 "new row violates row-level security policy"
#   - se a RLS permite -> 23502 NOT NULL / 23503 FK, o banco recusa antes de gravar
# Ou seja, "permitido" nunca chega a criar linha. É o que torna este teste
# seguro de rodar contra produção.
set -uo pipefail
cd "$(dirname "$0")/../.."

URL=$(grep '^VITE_SUPABASE_URL='      .env | cut -d= -f2- | tr -d '"'"'"' \r')
KEY=$(grep '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '"'"'"' \r')
[ -n "$URL" ] && [ -n "$KEY" ] || { echo "ERRO: .env sem URL/KEY"; exit 1; }

HOJE=$(date +%F)
ANTIGA='2026-01-15'
falhas=0

tentar() { # tabela json -> imprime o SQLSTATE
  curl -s -X POST "${URL}/rest/v1/$1" \
    -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}" \
    -H 'Content-Type: application/json' -d "$2" --max-time 20 \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('code','sem-codigo'))" 2>/dev/null || echo 'erro-http'
}

checar() { # descricao tabela json esperado
  local desc="$1" got; got=$(tentar "$2" "$3")
  if [ "$got" = "$4" ]; then
    printf '  ✓ %-52s %s\n' "$desc" "$got"
  else
    printf '  ✗ %-52s esperado %s, veio %s\n' "$desc" "$4" "$got"; falhas=$((falhas+1))
  fi
}

echo "Janela de escrita — hoje=${HOJE}, data fora da janela=${ANTIGA}"
echo
echo "Deve ser BARRADO pela RLS (42501) — escrita no passado:"
checar 'Leitura no passado'    Leitura    "{\"data\":\"${ANTIGA}\"}" 42501
checar 'Fechamento no passado' Fechamento "{\"data\":\"${ANTIGA}\"}" 42501

# Recebimento e FechamentoFrentista não têm data própria: herdam do Fechamento
# pai. Um pai inexistente faz o EXISTS da policy falhar -> 42501. Antes da
# migração isso morre em FK (23503), que é justamente o sinal de "RLS deixou
# passar".
checar 'Recebimento com pai inexistente'  Recebimento         '{"fechamento_id":-999999}' 42501
checar 'FechamentoFrentista pai inexist.' FechamentoFrentista '{"fechamento_id":-999999}' 42501

echo
echo "Deve PASSAR pela RLS e morrer no NOT NULL (23502) — escrita do dia:"
checar 'Leitura hoje'    Leitura    "{\"data\":\"${HOJE}\"}" 23502
checar 'Fechamento hoje' Fechamento "{\"data\":\"${HOJE}\"}" 23502

echo
if [ "$falhas" -eq 0 ]; then
  echo "OK — janela ativa e o caminho legítimo do dia segue aberto."; exit 0
else
  echo "FALHOU em ${falhas} verificação(ões)."; exit 1
fi
