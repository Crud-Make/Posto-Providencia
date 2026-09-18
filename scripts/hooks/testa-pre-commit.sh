#!/bin/sh
# Canários do pre-commit — prova de que ele julga o ÍNDICE, não o working tree (memória
# "gate verde sem canário não vale"). Em cada caso, índice e árvore divergem de propósito:
#
#   1. ts-indice-sujo  → índice com `any`, árvore limpa.   Tem de BARRAR (a versão antiga liberava).
#   2. ts-arvore-suja  → índice limpo, árvore com `any`.   Tem de LIBERAR (a antiga barrava à toa).
#   3. php-indice-sujo → índice com PHP fora do Pint, árvore limpa. Tem de BARRAR.
#   4. php-arvore-suja → índice limpo, árvore com PHP fora do Pint. Tem de LIBERAR.
#
# Tudo acontece numa worktree descartável, destacada no HEAD: o índice de verdade de quem
# roda o teste não é tocado. Nada é commitado. Uso: scripts/hooks/testa-pre-commit.sh [hook]

raiz="$(git rev-parse --show-toplevel)"
hook="${1:-$raiz/scripts/hooks/pre-commit}"   # outro hook como argumento: para provar que o antigo reprova
erros=0

oficina="$(mktemp -d)"
rm -rf "$oficina"
git worktree add --detach --quiet "$oficina" HEAD || { echo "não criei o worktree da oficina"; exit 2; }
trap 'git -C "$raiz" worktree remove --force "$oficina" >/dev/null 2>&1' EXIT INT TERM

# A oficina ganha dependências INSTALADAS na árvore. O hook novo não usa (instala no snapshot
# do índice), mas o antigo roda na árvore e, sem elas, reprovaria tudo com "comando não
# encontrado" — e a comparação novo × antigo não provaria nada.
principal="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
for origem in "$raiz/backend/.env" "$principal/backend/.env"; do
    [ -f "$origem" ] && { cp "$origem" "$oficina/backend/.env"; break; }
done
(cd "$oficina/frontend" && bun install --frozen-lockfile >/dev/null 2>&1) || { echo "bun install falhou na oficina"; exit 2; }
(cd "$oficina/backend" && composer install --no-interaction --quiet >/dev/null 2>&1) || { echo "composer install falhou na oficina"; exit 2; }

ts="frontend/apps/web/src/utils/canario-pre-commit.ts"
php="backend/app/Compartilhado/Enums/PapelNoPosto.php"
php_sadio='return $this === self::Admin || $this === self::Gerente;'
php_sujo='return $this===self::Admin||$this===self::Gerente;'

# Volta a oficina ao HEAD, índice e árvore.
zerar() {
    git -C "$oficina" reset --quiet --hard HEAD
    git -C "$oficina" clean --quiet -fd -- frontend/apps/web/src/utils
}

# $1 = nome · $2 = exit esperado (0 libera, 1 barra)
conferir() {
    (cd "$oficina" && sh "$hook") > "$oficina.$1.log" 2>&1
    obtido=$?
    if [ "$obtido" -eq "$2" ]; then
        echo "✓ $1: exit $obtido, como esperado"
    else
        echo "✗ $1: exit $obtido, esperado $2 — log em $oficina.$1.log"
        tail -n 30 "$oficina.$1.log" | sed 's/^/    /'
        erros=1
    fi
}

zerar
printf 'export const canario: any = 1;\n' > "$oficina/$ts"
git -C "$oficina" add "$ts"
printf 'export const canario: number = 1;\n' > "$oficina/$ts"
conferir ts-indice-sujo 1

zerar
printf 'export const canario: number = 1;\n' > "$oficina/$ts"
git -C "$oficina" add "$ts"
printf 'export const canario: any = 1;\n' > "$oficina/$ts"
conferir ts-arvore-suja 0

zerar
grep -qF "$php_sadio" "$oficina/$php" || { echo "✗ trecho sadio sumiu de $php — o canário envelheceu"; exit 2; }
python3 -c 'import sys; p, a, b = sys.argv[1:4]; t = open(p).read(); open(p, "w").write(t.replace(a, b))' \
    "$oficina/$php" "$php_sadio" "$php_sujo"
grep -qF "$php_sujo" "$oficina/$php" || { echo "✗ não consegui sujar $php"; exit 2; }
git -C "$oficina" add "$php"
git -C "$oficina" checkout -- "$php"
conferir php-indice-sujo 1

# O inverso prova que o caso 3 reprovou pelo PHP sujo, e não porque o Pint reprova qualquer coisa.
zerar
python3 -c 'import sys; p, a, b = sys.argv[1:4]; t = open(p).read(); open(p, "w").write(t.replace(a, b))' \
    "$oficina/$php" "$php_sadio" "$php_sadio // canário: índice limpo"
git -C "$oficina" add "$php"
python3 -c 'import sys; p, a, b = sys.argv[1:4]; t = open(p).read(); open(p, "w").write(t.replace(a, b))' \
    "$oficina/$php" "$php_sadio // canário: índice limpo" "$php_sujo"
conferir php-arvore-suja 0

[ "$erros" -eq 0 ] && echo "pre-commit: os quatro canários se comportaram." || echo "pre-commit: CANÁRIO FALHOU."
exit "$erros"
