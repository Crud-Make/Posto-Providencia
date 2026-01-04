#!/bin/bash

# Script de Entrega Automática (Deliver) - Posto Providência
# Automatiza o fluxo de: Validação -> Merge -> Push -> Limpeza

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 Iniciando processo de entrega..."

# 1. Validação de Regras
echo "🔍 Passo 1: Validando regras do projeto..."
./scripts/validate-rules.sh
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Falha na validação. Corrija os erros antes de entregar.${NC}"
    exit 1
fi

# 2. Identificar Branch Atual
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    echo -e "${RED}❌ Você já está na branch principal. Nada para entregar.${NC}"
    exit 1
fi

echo -e "📦 Branch detectada: ${YELLOW}$CURRENT_BRANCH${NC}"

# 3. Merge para Main
echo "🔀 Passo 2: Fazendo merge para a main..."
git checkout main
git pull origin main # Garante que a main está atualizada
git merge "$CURRENT_BRANCH"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Conflito Detectado! Resolva os conflitos manualmente.${NC}"
    exit 1
fi

# 4. Push
echo "📤 Passo 3: Enviando para o servidor (Push)..."
git push origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Falha ao enviar para o servidor.${NC}"
    exit 1
fi

# 5. Limpeza
echo "🧹 Passo 4: Limpando branch de trabalho..."
git branch -d "$CURRENT_BRANCH"

echo ""
echo -e "${GREEN}✨ Entrega concluída com sucesso! O deploy na Vercel deve iniciar em instantes.${NC}"
