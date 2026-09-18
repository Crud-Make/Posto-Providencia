#!/bin/sh
# Instala o pre-commit versionado sem derrubar os hooks do graphify (post-commit/post-checkout),
# que vivem em .git/hooks e não são versionados. Por isso NÃO se usa core.hooksPath.
raiz="$(git rev-parse --show-toplevel)"
install -m 0755 "$raiz/scripts/hooks/pre-commit" "$raiz/.git/hooks/pre-commit" && echo "pre-commit instalado em .git/hooks"
install -m 0755 "$raiz/scripts/hooks/pre-push"   "$raiz/.git/hooks/pre-push"   && echo "pre-push instalado em .git/hooks"
