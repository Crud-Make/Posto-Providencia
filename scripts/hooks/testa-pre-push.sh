#!/bin/sh
# Canários do pre-push — prova de que o hook reprova o que tem de reprovar (memória
# "gate verde sem canário não vale"). Três casos, todos com a árvore checada out SADIA:
#
#   1. sadio    → o HEAD como está. Tem de LIBERAR (senão é falso vermelho).
#   2. dinheiro → commit com `emCentavos` sem quantizar. Tem de BARRAR. Quem barra é o vitest
#                 (2 falhas); o golden PASSA com essa mutação (medido em 18/09) — não é ele a
#                 trava deste caso.
#   3. php      → commit com `PapelNoPosto::gerencia()` deixando operador gerenciar. Tem de
#                 BARRAR (Pest). Este pega o vendor em symlink: com ele, o App\ carregado é o da
#                 árvore de origem, sadio, e o push passava.
#
# Os commits quebrados nascem num worktree descartável, soltos (sem branch), e o hook é
# alimentado pelo STDIN como o git faria. Nada é empurrado. Leva alguns minutos: roda a
# suíte inteira três vezes.
#
# Uso: scripts/hooks/testa-pre-push.sh   (da raiz do repo, com a árvore limpa ou não — tanto faz)

raiz="$(git rev-parse --show-toplevel)"
hook="$raiz/scripts/hooks/pre-push"
ZERO="0000000000000000000000000000000000000000"
base="$(git rev-parse HEAD)"
erros=0

oficina="$(mktemp -d)"
rm -rf "$oficina"
git worktree add --detach --quiet "$oficina" "$base" || { echo "não criei o worktree da oficina"; exit 2; }
trap 'git -C "$raiz" worktree remove --force "$oficina" >/dev/null 2>&1' EXIT INT TERM

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
    git -C "$oficina" -c core.hooksPath=/dev/null commit --quiet --no-verify -am "canario: $4 (NAO MERGEAR)" || return 1
    git -C "$oficina" rev-parse HEAD
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

git -C "$oficina" checkout --quiet --detach "$base"
sha="$(quebrar backend/app/Compartilhado/Enums/PapelNoPosto.php \
    'return $this === self::Admin || $this === self::Gerente;' 'return true;' 'operador gerencia')" || exit 2
conferir php "$sha" 1

[ "$erros" -eq 0 ] && echo "pre-push: os três canários se comportaram." || echo "pre-push: CANÁRIO FALHOU."
exit "$erros"
