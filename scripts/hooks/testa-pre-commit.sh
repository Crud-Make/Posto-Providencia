#!/bin/sh
# Canários do pre-commit — prova de que ele julga o ÍNDICE, não o working tree (memória
# "gate verde sem canário não vale"). Em cada caso, índice e árvore divergem de propósito:
#
#   1. ts-indice-sujo  → índice com `any`, árvore limpa.   Tem de BARRAR (a versão antiga liberava).
#   2. ts-arvore-suja  → índice limpo, árvore com `any`.   Tem de LIBERAR (a antiga barrava à toa).
#   3. php-indice-sujo → índice com PHP fora do Pint, árvore limpa. Tem de BARRAR.
#   4. php-arvore-suja → índice limpo, árvore com PHP fora do Pint. Tem de LIBERAR.
#   5. php-arch-indice-sujo → índice com Cadastro usando Pessoas (CA-7). Tem de BARRAR pelo Pest Arch.
#   6. config-trava-indice-suja → índice SÓ com frontend/eslint.config.mjs apontando uma regra
#                 inexistente, nenhum .ts. Tem de BARRAR pelo ramo novo da catraca (ESLint inteiro),
#                 não pelo oxlint. Antes de 19/09 o hook saía com exit 0 sem rodar nada: "nada de
#                 .php nem .ts no índice" — e a config quebrada só apareceria no CI.
#   7. config-trava-tsconfig-de-app → índice SÓ com frontend/apps/pwa-dono/tsconfig.app.json com
#                 JSON quebrado. A regex de config de trava só casava frontend/tsconfig.json (revisão
#                 de 19/09) e este commit saía com exit 0. Tem de ACORDAR o hook (ramo de config) e
#                 BARRAR: o projectService lê esse tsconfig para os arquivos do pwa-dono e a catraca
#                 devolve erro fatal.
#   8. ccn-novo-indice → índice com .ts NOVO cuja função tem CCN 11 (Q-1); oxlint não tem mais o
#                 teto (saiu do .oxlintrc.json em 19/09), só o ESLint sob catraca. Tem de BARRAR, e
#                 pelo ESLint.
#   9. ccn-congelada-cresce-indice → índice com `analisarValor` de utils/formatters.ts (congelada em
#                 CCN 12 em .catraca/eslint.json) ganhando UM `if` a mais; árvore restaurada. A catraca
#                 de contagem passava (continuava "1 erro" da mesma regra); a de MEDIDA tem de BARRAR.
#
# Tudo acontece numa worktree descartável: o índice de verdade de quem roda o teste não é tocado.
# A oficina nasce de um COMMIT SOLTO da árvore de trabalho (índice temporário + write-tree +
# commit-tree, a mesma técnica de testa-pre-push.sh): assim os canários provam o hook contra o
# código que está sendo escrito, inclusive o ainda não commitado. Até 19/09 nascia do HEAD, e um
# canário sobre regra nova (caso 8: `complexity` no ESLint; caso 9: chave congelada na catraca) só
# passaria a valer depois do commit — não provava nada durante a revisão. Sem ref, sem mover HEAD,
# sem hook a pular (não há hook em commit-tree); o objeto fica pendente no .git e o gc recolhe.
# Nenhuma ref é criada. Uso: scripts/hooks/testa-pre-commit.sh [hook]

raiz="$(git rev-parse --show-toplevel)"
hook="${1:-$raiz/scripts/hooks/pre-commit}"   # outro hook como argumento: para provar que o antigo reprova
erros=0

indice_tmp="$(mktemp)" && rm -f "$indice_tmp"
GIT_INDEX_FILE="$indice_tmp" git -C "$raiz" add -A . || { echo "não montei o índice temporário da oficina"; exit 2; }
arvore="$(GIT_INDEX_FILE="$indice_tmp" git -C "$raiz" write-tree)" || exit 2
rm -f "$indice_tmp"
base="$(git -C "$raiz" commit-tree "$arvore" -p HEAD -m 'oficina do testa-pre-commit: árvore de trabalho (NAO MERGEAR)')" || exit 2

oficina="$(mktemp -d)"
rm -rf "$oficina"
git worktree add --detach --quiet "$oficina" "$base" || { echo "não criei o worktree da oficina"; exit 2; }
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

# 5. Fronteira entre módulos (CA-7): PHP limpo para Pint, PHPStan, PHPMD e Deptrac — o Deptrac junta o
# Domain de todos os módulos numa camada só e deixa passar — mas Cadastro usando Pessoas. Só o Pest Arch
# pega. No índice e fora da árvore: tem de BARRAR, e pelo Pest Arch, não por outro gate.
arch="backend/app/Cadastro/Domain/CanarioArch.php"
zerar
cat > "$oficina/$arch" <<'PHP'
<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Pessoas\Domain\Usuario;

final class CanarioArch
{
    public function idDe(Usuario $usuario): int
    {
        return $usuario->id;
    }
}
PHP
git -C "$oficina" add "$arch"
rm "$oficina/$arch"
conferir php-arch-indice-sujo 1
grep -q 'Pest Arch reprovou' "$oficina.php-arch-indice-sujo.log" \
    || { echo "✗ php-arch-indice-sujo não foi barrado pelo Pest Arch — log em $oficina.php-arch-indice-sujo.log"; erros=1; }
git -C "$oficina" rm --cached --quiet "$arch"

# 6. Config de trava no índice (19/09): commit só de eslint.config.mjs, nenhum .ts, e a árvore
# restaurada. A mutação é uma REGRA INEXISTENTE na config — sintaxe válida, então o oxlint (que lê o
# .mjs como fonte: `oxlint .`) passa, e só o ESLint recusa ('Could not find "…" in plugin "@"', exit 2,
# stdout vazio → a catraca falha alto). Erro de sintaxe NÃO serve: o oxlint barrava antes de a catraca
# rodar e o canário provava o passo errado (revisão de 19/09). O hook tem de acordar (a saída antecipada
# não pode ignorar config de trava) e barrar pelo ramo NOVO — a catraca inteira, com o rótulo
# "a config de trava no índice quebrou o lint". Com o hook anterior a 19/09 este caso sai 0:
# `sh scripts/hooks/testa-pre-commit.sh <hook antigo>` prova a diferença.
cfg="frontend/eslint.config.mjs"
ancora='      "@typescript-eslint/no-explicit-any": "error",'
zerar
[ "$(grep -cF "$ancora" "$oficina/$cfg")" -eq 1 ] || { echo "✗ âncora sumiu (ou repetiu) em $cfg — o canário envelheceu"; exit 2; }
python3 -c 'import sys; p, a, b = sys.argv[1:4]; t = open(p).read(); open(p, "w").write(t.replace(a, a + "\n" + b, 1))' \
    "$oficina/$cfg" "$ancora" '      "regra-que-nao-existe-canario": "error",'
grep -qF 'regra-que-nao-existe-canario' "$oficina/$cfg" || { echo "✗ não consegui mutar $cfg"; exit 2; }
git -C "$oficina" add "$cfg"
git -C "$oficina" checkout -- "$cfg"
conferir config-trava-indice-suja 1
grep -q 'a config de trava no índice quebrou o lint' "$oficina.config-trava-indice-suja.log" \
    || { echo "✗ config-trava-indice-suja não foi barrado pelo ramo de config da catraca (oxlint?) — log em $oficina.config-trava-indice-suja.log"; erros=1; }
grep -q 'oxlint reprovou' "$oficina.config-trava-indice-suja.log" \
    && { echo "✗ config-trava-indice-suja foi barrado pelo oxlint — a mutação tem de passar nele"; erros=1; }

# 7. tsconfig de um app no índice (19/09): a regex antiga só casava frontend/tsconfig.json. JSON quebrado
# (uma vírgula sobrando antes do `}`) — o oxlint não lê tsconfig; o projectService do typescript-eslint
# lê, e falha para os arquivos do pwa-dono. O hook tem de acordar pelo ramo de config e barrar lá.
tscfg="frontend/apps/pwa-dono/tsconfig.app.json"
zerar
[ -f "$oficina/$tscfg" ] || { echo "✗ $tscfg não existe — o canário envelheceu"; exit 2; }
printf '{ "extends": "./tsconfig.app.json", "compilerOptions": { "strict": true, }, }\n' > "$oficina/$tscfg"
git -C "$oficina" add "$tscfg"
git -C "$oficina" checkout -- "$tscfg"
conferir config-trava-tsconfig-de-app 1
grep -q 'config de trava no índice — rodando' "$oficina.config-trava-tsconfig-de-app.log" \
    || { echo "✗ config-trava-tsconfig-de-app: o hook não acordou para $tscfg — regex de config de trava não casou"; erros=1; }
grep -q 'a config de trava no índice quebrou o lint' "$oficina.config-trava-tsconfig-de-app.log" \
    || { echo "✗ config-trava-tsconfig-de-app não foi barrado pelo ramo de config da catraca — log em $oficina.config-trava-tsconfig-de-app.log"; erros=1; }

# 8. Arquivo novo com CCN 11 (Q-1). `dez` ifs = complexidade 11; oxlint (sem o teto desde 19/09) passa,
# a catraca do ESLint acusa `complexity` como erro novo.
ccn="frontend/apps/web/src/utils/canario-ccn-11.ts"
zerar
python3 - "$oficina/$ccn" <<'PY'
import sys
ifs = "".join(f"  if (n > {i}) r += 1;\n" for i in range(1, 11))
open(sys.argv[1], "w").write("export function onze(n: number): number {\n  let r = 0;\n" + ifs + "  return r;\n}\n")
PY
git -C "$oficina" add "$ccn"
rm "$oficina/$ccn"
conferir ccn-novo-indice 1
grep -q "complexity" "$oficina.ccn-novo-indice.log" \
    || { echo "✗ ccn-novo-indice não foi barrado pela regra complexity — log em $oficina.ccn-novo-indice.log"; erros=1; }
grep -q 'oxlint reprovou' "$oficina.ccn-novo-indice.log" \
    && { echo "✗ ccn-novo-indice foi barrado pelo oxlint — o teto tinha de estar só no ESLint"; erros=1; }

# 9. Função CONGELADA que cresce (catraca de medida, 19/09). `analisarValor` está em .catraca/eslint.json
# com complexity [12]; um `if` a mais leva a 13. Índice sujo, árvore restaurada. A catraca antiga, por
# contagem, via "1 erro de complexity" dos dois lados e passava; a de medida vê 13 > 12 e barra.
fmt="frontend/apps/web/src/utils/formatters.ts"
# A âncora é a única linha de `analisarValor` que não se repete no arquivo (`if (!value) return 0;`
# aparece também em :122 — o guard de unicidade barrou a primeira versão, 19/09).
fmt_sadio="  if (limpo.includes(',')) {"
fmt_sujo="  if (limpo === 'canario') return -1;
  if (limpo.includes(',')) {"
zerar
[ "$(grep -cF "$fmt_sadio" "$oficina/$fmt")" -eq 1 ] || { echo "✗ âncora sumiu (ou repetiu) em $fmt — o canário envelheceu"; exit 2; }
grep -qF '"apps/web/src/utils/formatters.ts|complexity": [' "$oficina/frontend/.catraca/eslint.json" \
    || { echo "✗ formatters.ts não está congelado em complexity na catraca — o canário envelheceu"; exit 2; }
python3 -c 'import sys; p, a, b = sys.argv[1:4]; t = open(p).read(); open(p, "w").write(t.replace(a, b, 1))' \
    "$oficina/$fmt" "$fmt_sadio" "$fmt_sujo"
git -C "$oficina" add "$fmt"
git -C "$oficina" checkout -- "$fmt"
conferir ccn-congelada-cresce-indice 1
grep -q 'formatters.ts|complexity: congelado \[12\], agora \[13\]' "$oficina.ccn-congelada-cresce-indice.log" \
    || { echo "✗ ccn-congelada-cresce-indice não foi barrado pela catraca de medida (12 → 13) — log em $oficina.ccn-congelada-cresce-indice.log"; erros=1; }

[ "$erros" -eq 0 ] && echo "pre-commit: os nove canários se comportaram." || echo "pre-commit: CANÁRIO FALHOU."
exit "$erros"
