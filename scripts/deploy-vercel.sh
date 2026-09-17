#!/usr/bin/env bash
# Deploy dos apps do Posto Providência na Vercel.
#
# Existe por causa de duas armadilhas que custaram uma tarde em 30/08/2026, e
# que este script não deixa acontecer de novo:
#
#   1. O `.vercelignore` SUBSTITUI o `.gitignore` no upload. Se ele não excluir
#      `docs/` e `.env*`, os .sqlite reais do posto e a chave PRIVADA do VAPID
#      sobem junto. Estar no .gitignore NÃO protege aqui.
#   2. Os projetos têm Root Directory dentro do monorepo (`frontend/apps/pwa-dono`), então
#      o deploy tem de sair da RAIZ. Rodar de dentro da pasta do app falha com
#      "The specified Root Directory does not exist".
#
# Uso:
#   scripts/deploy-vercel.sh dono              # preview (padrão)
#   scripts/deploy-vercel.sh frentista --prod  # produção, com confirmação
#   scripts/deploy-vercel.sh dono --dry-run    # só as checagens
set -euo pipefail

readonly ORG_ID='team_upqRo75tSm2qtK7kPuAAqU8c'

# app        -> id do projeto na Vercel  (Root Directory)
declare -A PROJETOS=(
    [dono]='prj_eeMdcprmOStC5PnfBotQXbLPecHV'       # pwa-dono          -> frontend/apps/pwa-dono
    [frentista]='prj_eZMuNiEujRE1pUmu6GSu3HctBbFB'  # pwa               -> frontend/apps/pwa-frentista
    [painel]='prj_tTsFoELV3Gx3OgwIXMrsgHClcgex'     # posto-providencia -> frontend
)

erro() { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$*"; }
aviso(){ printf '\033[33m!\033[0m %s\n' "$*"; }

app="${1:-}"
[[ -n "$app" && -n "${PROJETOS[$app]:-}" ]] \
    || erro "Uso: $0 <${!PROJETOS[*]}> [--prod] [--dry-run]"

producao=false
seco=false
for arg in "${@:2}"; do
    case "$arg" in
        --prod) producao=true ;;
        --dry-run) seco=true ;;
        *) erro "Argumento desconhecido: $arg" ;;
    esac
done

raiz="$(git rev-parse --show-toplevel)"
cd "$raiz"
ok "Raiz do repositório: $raiz"

# --- Guarda 1: o upload não pode levar dado do posto nem segredo -------------
[[ -f .vercelignore ]] || erro ".vercelignore não existe. Sem ele a Vercel usaria o .gitignore — mas com ele presente e incompleto, o vazamento é silencioso. Crie antes."

vazando="$(git ls-files -o --exclude-from=.vercelignore \
    | grep -E '^(docs/|\.env($|\.)|\.claude/)' || true)"

if [[ -n "$vazando" ]]; then
    printf '\n%s\n' "$vazando" >&2
    erro "Os arquivos acima SUBIRIAM para a Vercel. Corrija o .vercelignore antes de publicar."
fi
ok "Upload limpo: docs/, .env* e .claude/ ficam fora"

# --- Guarda 2: a suíte tem de estar verde -----------------------------------
if $seco; then
    aviso "--dry-run: pulando os testes"
else
    printf '  rodando a suíte…\n'
    (cd frontend && bun run test) >/dev/null 2>&1 || erro "Testes falhando. Não se publica assim."
    ok "Suíte verde"
fi

# --- Guarda 3: produção é decisão consciente --------------------------------
alvo='preview'
if $producao; then
    alvo='PRODUÇÃO'
    aviso "Isto substitui o app que o dono do posto já usa no celular dele."
    # Sem terminal (agente, CI), a confirmação vem por variável — a palavra
    # inteira, nunca um `-y`. A trava é contra publicar em produção por
    # descuido; não contra automação que já teve o "pode" de quem manda.
    if [[ -t 0 ]]; then
        read -r -p "  Digite 'producao' para confirmar: " resposta
        [[ "$resposta" == 'producao' ]] || erro "Cancelado."
    elif [[ "${CONFIRMA_PRODUCAO:-}" == 'producao' ]]; then
        aviso "Confirmado por CONFIRMA_PRODUCAO (sem terminal)."
    else
        erro "Sem terminal: exporte CONFIRMA_PRODUCAO=producao para confirmar."
    fi
fi

if $seco; then
    ok "--dry-run: tudo passou. Publicaria '$app' em $alvo."
    exit 0
fi

# --- Deploy -----------------------------------------------------------------
# Os ids vão por variável de ambiente de propósito: assim nada de `.vercel/`
# é escrito na raiz, e o vínculo de cada app continua sendo só o do seu ID aqui.
export VERCEL_ORG_ID="$ORG_ID"
export VERCEL_PROJECT_ID="${PROJETOS[$app]}"

printf '\n  publicando %s em %s…\n\n' "$app" "$alvo"
if $producao; then
    bunx vercel@latest deploy --yes --prod
else
    bunx vercel@latest deploy --yes
    printf '\n'
    aviso "Preview fica atrás do SSO da Vercel: abre no navegador logado, NÃO num celular deslogado."
    aviso "Para testar em aparelho de terceiro, use --prod ou desligue a Proteção de Deploy no painel."
fi
