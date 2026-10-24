#!/bin/sh
# Canários do pre-push — prova de que o hook reprova o que tem de reprovar (memória
# "gate verde sem canário não vale"). Quatro casos, todos com a árvore checada out SADIA:
#
#   1. sadio    → o HEAD como está. Tem de LIBERAR (senão é falso vermelho).
#   2. dinheiro → commit com `emCentavos` sem quantizar. Tem de BARRAR. Quem barra é o vitest
#                 (2 falhas); o golden PASSA com essa mutação (medido em 18/09) — não é ele a
#                 trava deste caso.
#   3. php      → commit com `PapelNoPosto::gerencia()` deixando operador gerenciar. Tem de
#                 BARRAR (Pest). Este pega o vendor em symlink: com ele, o App\ carregado é o da
#                 árvore de origem, sadio, e o push passava.
#   4. eslint   → commit com um .ts NOVO contendo `any`. oxlint (não tem no-explicit-any), tsc,
#                 vitest e golden passam; só o ESLint type-aware acusa, pela catraca. Tem de BARRAR,
#                 e pelo gate "eslint (catraca)". Até 19/09 o pre-push não rodava o ESLint (só o
#                 CI) e este commit subia. Prova da diferença: passe o hook antigo como argumento.
#
# Os commits quebrados nascem SOLTOS: `git write-tree` + `git commit-tree` a partir do índice de
# um worktree descartável — sem ref, sem mover HEAD nenhum, e sem hook a pular (o commit-tree não
# roda nenhum). Até 19/09 era `git commit --no-verify`, que o workflow do executor proíbe — e um
# canário que ele não pode executar não prova nada. O objeto fica pendente no .git comum e o gc
# recolhe. O hook é alimentado pelo STDIN como o git faria. Nada é empurrado. Leva alguns
# minutos: roda a suíte inteira quatro vezes.
#
# Uso: scripts/hooks/testa-pre-push.sh [hook]   (da raiz do repo, com a árvore limpa ou não — tanto faz)

raiz="$(git rev-parse --show-toplevel)"
hook="${1:-$raiz/scripts/hooks/pre-push}"   # outro hook como argumento: para provar que o antigo libera
ZERO="0000000000000000000000000000000000000000"
base="$(git rev-parse HEAD)"
erros=0

oficina="$(mktemp -d)"
rm -rf "$oficina"
git worktree add --detach --quiet "$oficina" "$base" || { echo "não criei o worktree da oficina"; exit 2; }
trap 'git -C "$raiz" worktree remove --force "$oficina" >/dev/null 2>&1' EXIT INT TERM

# Volta índice e árvore da oficina ao $base (o HEAD dela nunca sai de lá).
zerar() {
    git -C "$oficina" restore --quiet --source="$base" --staged --worktree -- . || return 1
    git -C "$oficina" clean --quiet -fd -- frontend/apps/web/src/utils
}

# $1 = mensagem → grava um commit solto com o índice da oficina e imprime o sha
commitar_solto() {
    arvore="$(git -C "$oficina" write-tree)" || return 1
    git -C "$oficina" commit-tree "$arvore" -p "$base" -m "canario: $1 (NAO MERGEAR)"
}

# $1 = arquivo relativo · $2 = trecho sadio · $3 = trecho quebrado · $4 = mensagem → imprime o sha
quebrar() {
    python3 - "$oficina/$1" "$2" "$3" <<'PY' || return 1
import sys
caminho, velho, novo = sys.argv[1:4]
texto = open(caminho, encoding="utf-8").read()
if texto.count(velho) != 1:
    sys.exit(f"trecho sadio não encontrado (ou repetido) em {caminho} — o canário envelheceu")
open(caminho, "w", encoding="utf-8").write(texto.replace(velho, novo))
PY
    git -C "$oficina" add -- "$1" || return 1
    commitar_solto "$4"
}

# $1 = arquivo relativo NOVO · $2 = conteúdo · $3 = mensagem → imprime o sha
plantar() {
    [ -e "$oficina/$1" ] && { echo "$1 já existe — o canário envelheceu" >&2; return 1; }
    printf '%s\n' "$2" > "$oficina/$1" || return 1
    git -C "$oficina" add -- "$1" || return 1
    commitar_solto "$3"
}

# $1 = nome · $2 = sha · $3 = exit esperado (0 libera, 1 barra)
conferir() {
    printf 'refs/heads/canario-%s %s refs/heads/canario-%s %s\n' "$1" "$2" "$1" "$ZERO" \
        | (cd "$raiz" && sh "$hook") > "$oficina.$1.log" 2>&1
    obtido=$?
    if [ "$obtido" -eq "$3" ]; then
        echo "✓ $1: exit $obtido, como esperado"
    else
        echo "✗ $1: exit $obtido, esperado $3 — log em $oficina.$1.log"
        tail -n 30 "$oficina.$1.log" | sed 's/^/    /'
        erros=1
    fi
}

conferir sadio "$base" 0

sha="$(quebrar frontend/packages/utils/src/lucro.ts \
    'Math.round(reais * 100) / 100' 'reais' 'emCentavos sem quantizar')" || exit 2
conferir dinheiro "$sha" 1

zerar || exit 2
sha="$(quebrar backend/app/Compartilhado/Enums/PapelNoPosto.php \
    'return $this === self::Admin || $this === self::Gerente;' 'return true;' 'operador gerencia')" || exit 2
conferir php "$sha" 1

zerar || exit 2
sha="$(plantar frontend/apps/web/src/utils/canario-pre-push.ts 'export const canario: any = 1;' 'any em .ts novo')" || exit 2
conferir eslint "$sha" 1
grep -q 'eslint (catraca)' "$oficina.eslint.log" \
    || { echo "✗ eslint: não foi o gate do ESLint que barrou — log em $oficina.eslint.log"; erros=1; }

[ "$erros" -eq 0 ] && echo "pre-push: os quatro canários se comportaram." || echo "pre-push: CANÁRIO FALHOU."
exit "$erros"
