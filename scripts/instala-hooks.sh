#!/bin/sh
# Instala o pre-commit versionado sem derrubar os hooks do graphify (post-commit/post-checkout),
# que vivem em .git/hooks e não são versionados. Por isso NÃO se usa core.hooksPath.
# Os hooks moram no diretório COMUM do git: numa worktree `.git` é um arquivo, não pasta.
raiz="$(git rev-parse --show-toplevel)"
hooks="$(git rev-parse --path-format=absolute --git-common-dir)/hooks"
install -m 0755 "$raiz/scripts/hooks/pre-commit" "$hooks/pre-commit" && echo "pre-commit instalado em $hooks"
install -m 0755 "$raiz/scripts/hooks/pre-push"   "$hooks/pre-push"   && echo "pre-push instalado em $hooks"
