#!/bin/sh
# Canários do pre-push ENXUTO (24/09/2026) — prova de que o hook reprova o que tem de reprovar
# (memória "gate verde sem canário não vale"). Três casos:
#
#   1. sadio  → HEAD como está, para uma branch qualquer. Tem de LIBERAR.
#   2. main   → HEAD para refs/heads/main. Tem de BARRAR sem nem rodar o golden.
#   3. golden → `diferenca` da @posto/utils com o sinal trocado, na ÁRVORE (o hook enxuto
#               testa a árvore, não o commit). Tem de BARRAR. O arquivo é restaurado no fim,
#               aconteça o que acontecer.
#
# Leva uns segundos: o golden roda três vezes no máximo. Nada é empurrado nem commitado.
# Uso: scripts/hooks/testa-pre-push.sh   (da raiz do repo)

raiz="$(git rev-parse --show-toplevel)"
hook="$raiz/scripts/hooks/pre-push"
ZERO="0000000000000000000000000000000000000000"
head="$(git rev-parse HEAD)"
alvo="$raiz/frontend/packages/utils/src/fechamento.ts"
copia="$(mktemp)"
cp "$alvo" "$copia"
trap 'cp "$copia" "$alvo"; rm -f "$copia"' EXIT INT TERM
erros=0

# $1 = nome · $2 = ref remota · $3 = exit esperado (0 libera, 1 barra)
conferir() {
    log="$(mktemp)"
    printf 'refs/heads/canario-%s %s %s %s\n' "$1" "$head" "$2" "$ZERO" | (cd "$raiz" && sh "$hook") > "$log" 2>&1
    obtido=$?
    if [ "$obtido" -eq "$3" ]; then
        echo "✓ $1: exit $obtido, como esperado"
    else
        echo "✗ $1: exit $obtido, esperado $3 — log:"
        tail -n 20 "$log" | sed 's/^/    /'
        erros=1
    fi
    rm -f "$log"
}

conferir sadio refs/heads/canario-sadio 0
conferir main  refs/heads/main          1

python3 - "$alvo" <<'PY' || exit 2
import sys
caminho = sys.argv[1]
texto = open(caminho, encoding="utf-8").read()
velho = "return emCentavos(encerrante - valorConferido);"
if texto.count(velho) != 1:
    sys.exit("trecho sadio de `diferenca` não encontrado (ou repetido) — o canário envelheceu")
open(caminho, "w", encoding="utf-8").write(texto.replace(velho, "return emCentavos(valorConferido - encerrante);"))
PY
conferir golden refs/heads/canario-golden 1
cp "$copia" "$alvo"

[ "$erros" -eq 0 ] && echo "pre-push: os três canários se comportaram." || echo "pre-push: CANÁRIO FALHOU."
exit "$erros"
