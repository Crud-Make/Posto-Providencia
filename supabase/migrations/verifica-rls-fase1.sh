#!/usr/bin/env bash
# Verifica a RLS Fase 1 (migração 20260813_rls_fase1_views_e_delete_anonimo.sql).
#
# Rode ANTES de aplicar (esperado: FALHA no bloco A) e DEPOIS (esperado: PASSA).
#
# ============================================================================
# NÃO ESCREVE NADA, E ISSO NÃO É PROMESSA — É CONSEQUÊNCIA DO FILTRO.
#
# Todo probe de escrita usa um filtro que casa ZERO LINHAS por construção
# (`data=eq.1900-01-01`, `nome=eq.<sentinela>`). Os dois desfechos possíveis:
#
#   ESCRITA REVOGADA  -> 42501 (permission denied), e é conclusivo
#   ESCRITA ABERTA    -> 204 com zero linhas afetadas, nada tocado
#
# O que torna isso conclusivo é a ORDEM em que o Postgres decide: privilégio de
# tabela (GRANT) é checado ANTES de qualquer linha. Se o REVOKE pegou, o 42501
# vem mesmo com filtro vazio. Se não pegou, a query roda contra zero linhas e
# não faz nada. Nos dois casos, nenhum byte chega ao disco.
#
# ============================================================================
# POR QUE AS 3 POLICIES DE DELETE NÃO SÃO SONDADAS POR HTTP — leia antes de
# "melhorar" este script:
#
# O truque acima só funciona para o que a Fase 1 conserta por REVOKE (as views).
# Para o que ela conserta por POLICY (os três DELETEs anônimos), o filtro de zero
# linhas devolve 204 nos DOIS casos — privilégio existe, e a policy nunca chega a
# ser observável. Distinguir exigiria mandar o DELETE contra uma linha REAL, e aí:
#
#   policy fechada -> 204, zero linhas (ok)
#   policy ABERTA  -> a linha é APAGADA de verdade
#
# O estado que se quer medir é justamente "aberta". O probe destruiria dado real
# de fechamento em produção para provar que dá para destruir dado real de
# fechamento em produção. Por isso o bloco C mede pelo CATÁLOGO, e por isso ele
# se declara PENDENTE em vez de verde quando não há acesso SQL — verde obtido
# por não olhar é o mesmo verde falso que apagar asserção produz.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/../.."

# ----------------------------------------------------------------------------
# Credenciais. Aceita variável de ambiente OU arquivo — nesta máquina, em
# 13/08/2026, NÃO existe `.env` no repo (só `.env.example`), então os dois
# verificadores anteriores não rodam sem que alguém crie o arquivo. Daí o
# fallback para env var e a mensagem explícita.
# ----------------------------------------------------------------------------
le_env() { # arquivo chave -> valor
  [ -f "$1" ] && grep -m1 "^$2=" "$1" | cut -d= -f2- | tr -d '"'"'"' \r'
}

URL="${SUPABASE_URL:-}"
KEY="${SUPABASE_ANON_KEY:-}"
for arq in frontend/.env frontend/.env.local frontend/apps/web/.env frontend/apps/web/.env.local; do
  [ -n "$URL" ] || URL=$(le_env "$arq" VITE_SUPABASE_URL)
  [ -n "$KEY" ] || KEY=$(le_env "$arq" VITE_SUPABASE_ANON_KEY)
done

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  cat <<'FIM'
ERRO: sem URL/chave anônima.

  Exporte no ambiente:
    export SUPABASE_URL=https://<project-ref>.supabase.co
    export SUPABASE_ANON_KEY=<anon key>

  ou crie um `.env` com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.

  A chave anônima é pública por desenho (vai no bundle do painel), mas NÃO a
  escreva neste arquivo: ele é versionado.
FIM
  exit 1
fi

falhas=0
pendentes=0

api() { curl -s -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}" --max-time 20 "$@"; }

codigo() { # ...args do curl -> SQLSTATE ou 'sem-codigo'
  api "$@" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code','sem-codigo'))" 2>/dev/null \
  || echo 'sem-codigo'
}

# Espera 42501 (escrita revogada). Qualquer outra coisa = a porta segue aberta.
checar_revogado() { # descricao metodo caminho [payload]
  local desc="$1" metodo="$2" caminho="$3" payload="${4:-}" got
  if [ -n "$payload" ]; then
    got=$(codigo -X "$metodo" "${URL}/rest/v1/${caminho}" -H 'Content-Type: application/json' -d "$payload")
  else
    got=$(codigo -X "$metodo" "${URL}/rest/v1/${caminho}")
  fi
  if [ "$got" = '42501' ]; then
    printf '  ✓ %-52s (42501)\n' "$desc"
  else
    printf '  ✗ %-52s esperado 42501, veio %s\n' "$desc" "$got"
    falhas=$((falhas+1))
  fi
}

# Não-regressão: a leitura das views precisa CONTINUAR funcionando. Um script que
# só testasse "tudo bloqueado" passaria em verde com o painel quebrado.
#
# E não basta conferir o 200: com `security_invoker = on`, a view passa a ser lida
# sob as policies de QUEM CHAMA. Se `anon` não tivesse policy de SELECT na tabela
# base, a resposta seria 200 com array VAZIO — falha silenciosa, tela em branco,
# nenhum erro em lugar nenhum. É o pior desfecho do §V5. Por isso o teste exige
# LINHA, não status: `count=exact` devolve o total no header content-range.
checar_leitura() { # descricao caminho minimo
  local desc="$1" total
  total=$(api -I -H 'Prefer: count=exact' "${URL}/rest/v1/$2" \
          | grep -i '^content-range' | tr -d '\r' | sed 's#.*/##')
  if [ -n "$total" ] && [ "$total" != '*' ] && [ "$total" -ge "$3" ] 2>/dev/null; then
    printf '  ✓ %-52s (%s linhas)\n' "$desc" "$total"
  else
    printf '  ✗ %-52s esperado >= %s linhas, veio "%s"\n' "$desc" "$3" "${total:-nada}"
    falhas=$((falhas+1))
  fi
}

echo "=== A. As duas views deixaram de ser porta de escrita? ==================="
echo
# Filtros que casam zero linhas: `data` é coluna das duas pontas em
# vw_lucro_periodo, e `nome` existe em frentistas. Nenhum id é usado — a view
# vw_lucro_periodo NÃO expõe coluna `id`.
checar_revogado "vw_lucro_periodo: UPDATE anônimo revogado" \
  PATCH  "vw_lucro_periodo?data=eq.1900-01-01" '{"lucro_liquido":null}'
checar_revogado "vw_lucro_periodo: DELETE anônimo revogado" \
  DELETE "vw_lucro_periodo?data=eq.1900-01-01"
checar_revogado "vw_lucro_periodo: INSERT anônimo revogado" \
  POST   "vw_lucro_periodo" '{}'
checar_revogado "frentistas: UPDATE anônimo revogado" \
  PATCH  "frentistas?nome=eq.__probe_rls_fase1__" '{"nome":null}'
checar_revogado "frentistas: DELETE anônimo revogado" \
  DELETE "frentistas?nome=eq.__probe_rls_fase1__"
checar_revogado "frentistas: INSERT anônimo revogado" \
  POST   "frentistas" '{}'

echo
echo "=== B. E a leitura continua de pé? ======================================="
echo
# Os mínimos são baixos de propósito: o teste é "a view devolve dado", não "a view
# devolve N". Amarrar no total de hoje (201 e 12, medidos em 13/08/2026) faria o
# script ficar vermelho a cada fechamento novo, e script que grita à toa deixa de
# ser lido — a mesma razão pela qual o hook de higiene é silencioso quando está ok.
checar_leitura "vw_lucro_periodo: SELECT anônimo intacto" "vw_lucro_periodo?select=data&limit=1" 1
checar_leitura "frentistas: SELECT anônimo intacto"       "frentistas?select=id&limit=1"        1

echo
echo "=== C. As 3 policies de DELETE (por catálogo — ver cabeçalho) ============"
echo

CONSULTA_CATALOGO=$(cat <<'SQL'
select tablename, policyname, coalesce(qual,'-') as using_expr
from pg_policies
where schemaname = 'public'
  and tablename in ('FechamentoFrentista','Recebimento','Despesa')
  and cmd = 'DELETE'
  and 'anon' = any(roles);
-- Esperado DEPOIS da migração: exatamente 3 linhas, e NENHUMA com using_expr
-- igual a 'true'. As três devem citar `dentro_da_janela_de_edicao`.
SQL
)

if [ -n "${DATABASE_URL:-}" ] && command -v psql >/dev/null 2>&1; then
  saida=$(psql "$DATABASE_URL" -At -F'|' -c "
    select count(*) filter (where qual = 'true'),
           count(*) filter (where qual like '%dentro_da_janela_de_edicao%'),
           count(*)
    from pg_policies
    where schemaname='public'
      and tablename in ('FechamentoFrentista','Recebimento','Despesa')
      and cmd='DELETE' and 'anon' = any(roles);" 2>/dev/null)
  IFS='|' read -r abertas com_janela total <<<"$saida"
  if [ "${abertas:-x}" = '0' ] && [ "${com_janela:-x}" = '3' ]; then
    printf '  ✓ %-52s (3/3 com janela, 0 abertas)\n' "DELETE anônimo travado nas 3 tabelas"
  else
    printf '  ✗ %-52s abertas=%s com_janela=%s total=%s\n' \
      "DELETE anônimo nas 3 tabelas" "${abertas:-?}" "${com_janela:-?}" "${total:-?}"
    falhas=$((falhas+1))
  fi
else
  printf '  ⏸ %-52s\n' "PENDENTE — sem psql/DATABASE_URL para ler o catálogo"
  echo
  echo "     Rode esta consulta pelo MCP do Supabase ou pelo painel:"
  echo
  printf '%s\n' "$CONSULTA_CATALOGO" | sed 's/^/       /'
  pendentes=$((pendentes+1))
fi

echo
if [ "$falhas" -gt 0 ]; then
  echo "FALHOU em ${falhas} verificação(ões)."
  exit 1
elif [ "$pendentes" -gt 0 ]; then
  echo "INCOMPLETO — ${pendentes} bloco(s) não verificados. As views passaram;"
  echo "as policies de DELETE seguem SEM prova. Isto não é verde."
  exit 2
else
  echo "OK — views fechadas para escrita, leitura de pé, DELETE dentro da janela."
  exit 0
fi
