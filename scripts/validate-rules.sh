#!/bin/bash

# Script de validação das regras do projeto
# Verifica se commits, branches e código seguem os padrões definidos

echo "🔍 Validando conformidade com .cursorrules..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. Verificar se estamos em uma branch apropriada
echo "📋 Verificando branch atual..."
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    echo -e "${RED}❌ ERRO: Você está na branch $CURRENT_BRANCH!${NC}"
    echo "   Regra violada: Nunca trabalhe diretamente na main/master"
    echo "   Crie uma branch: git checkout -b feature/nome-da-feature"
    ((ERRORS++))
else
    # Verificar se a branch segue o padrão
    if [[ $CURRENT_BRANCH =~ ^(feature|fix|refactor|docs|style|chore)/.+ ]]; then
        echo -e "${GREEN}✅ Branch '$CURRENT_BRANCH' segue o padrão${NC}"
    else
        echo -e "${YELLOW}⚠️  AVISO: Branch '$CURRENT_BRANCH' não segue o padrão recomendado${NC}"
        echo "   Padrão esperado: feature/*, fix/*, refactor/*, docs/*, style/*, chore/*"
        ((WARNINGS++))
    fi
fi

echo ""

# 2. Verificar últimos commits seguem Conventional Commits
echo "📝 Verificando últimos 5 commits..."
COMMITS=$(git log -5 --pretty=format:"%s")

while IFS= read -r commit; do
    if [[ $commit =~ ^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?:.+ ]] || [[ $commit =~ ^(merge|Merge):.+ ]]; then
        echo -e "${GREEN}✅${NC} $commit"
    else
        echo -e "${RED}❌${NC} $commit"
        echo "   Não segue Conventional Commits (feat:, fix:, docs:, etc.)"
        ((ERRORS++))
    fi
done <<< "$COMMITS"

echo ""

# 3. Verificar se há arquivos modificados sem commit
echo "📂 Verificando arquivos modificados..."
MODIFIED=$(git status --porcelain | wc -l)

if [ $MODIFIED -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Há $MODIFIED arquivo(s) modificado(s) não commitado(s)${NC}"
    echo "   Lembre-se: commits pequenos e incrementais!"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ Nenhum arquivo pendente${NC}"
fi

echo ""

# 4. Verificar se há comentários JSDoc em arquivos TypeScript/TSX modificados
echo "📖 Verificando documentação em arquivos modificados..."
MODIFIED_TS_FILES=$(git diff --name-only --cached | grep -E '\.(ts|tsx)$')

if [ -n "$MODIFIED_TS_FILES" ]; then
    for file in $MODIFIED_TS_FILES; do
        if [ -f "$file" ]; then
            # Contar funções e JSDoc comments
            FUNCTIONS=$(grep -c "^\s*\(const\|function\|export\)" "$file" || true)
            JSDOC=$(grep -c "^\s*/\*\*" "$file" || true)
            
            if [ $FUNCTIONS -gt 0 ] && [ $JSDOC -eq 0 ]; then
                echo -e "${YELLOW}⚠️  $file: Possui funções mas sem JSDoc${NC}"
                ((WARNINGS++))
            else
                echo -e "${GREEN}✅ $file${NC}"
            fi
        fi
    done
else
    echo "   Nenhum arquivo TS/TSX modificado"
fi

# 5. Verificar regra da porta 3015 no package.json
echo "🌐 Verificando configuração de porta do servidor..."
if grep -q "vite --port 3015" package.json; then
    echo -e "${GREEN}✅ Porta 3015 configurada corretamente${NC}"
else
    echo -e "${YELLOW}⚠️  Aviso: Porta 3015 não encontrada no script 'dev' do package.json${NC}"
    echo "   Regra violada: Sempre use a porta 3015"
    ((WARNINGS++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Resumo final
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 Tudo certo! Projeto em conformidade com as regras.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS aviso(s) encontrado(s)${NC}"
    echo "   Considere corrigir para manter a qualidade do código"
    exit 0
else
    echo -e "${RED}❌ $ERRORS erro(s) e $WARNINGS aviso(s) encontrado(s)${NC}"
    echo "   Corrija os erros antes de continuar"
    exit 1
fi
