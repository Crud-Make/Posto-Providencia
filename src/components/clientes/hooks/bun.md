# 🚀 Migrar runtime de Node.js para Bun

## Objetivo

Migrar o runtime do projeto de **Node.js** para **Bun** para obter melhor performance e experiência de desenvolvimento.

## Motivação

### Por que Bun?

1. ⚡ **Performance Superior**
   - Até 4x mais rápido que Node.js
   - Instalação de pacotes muito mais rápida
   - Startup time reduzido

2. 🔧 **Melhor DX**
   - Built-in TypeScript support
   - Built-in bundler
   - Built-in test runner
   - Compatível com Node.js

3. 📦 **Gerenciamento de Pacotes**
   - Substitui npm/yarn/pnpm
   - Lock file mais eficiente
   - Cache global compartilhado

## Escopo da Migração

### Dashboard Web (React + Vite)
- [x] Instalar Bun
- [x] Migrar dependências
- [x] Atualizar scripts
- [x] Testar build
- [x] Atualizar documentação

### Mobile (React Native + Expo)
- [ ] Avaliar compatibilidade
- [ ] Migrar se possível

## Checklist de Implementação

### 1. Preparação
- [x] Backup do projeto
- [x] Commitar mudanças
- [x] Criar branch feature/migrate-to-bun

### 2. Instalação do Bun
```bash
# Windows
powershell -c "irm bun.sh/install.ps1 | iex"

# Alternativa via NPM (se script falhar)
npm install -g bun

# Verificar
bun --version
```

### 3. Migração
```bash
# Remover node_modules
rm -rf node_modules package-lock.json

# Instalar com Bun
bun install

# Testar
bun run dev
bun run build
```

### 4. Atualizar Scripts
```json
{
  "scripts": {
    "dev": "bun --bun vite",
    "build": "bun -e \"Bun.write('./public/version.json', JSON.stringify({version: Date.now().toString()}))\" && bun --bun vite build",
    "preview": "bun --bun vite preview"
  }
}
```

### 5. Testes
- [x] Dev server funciona
- [x] Build funciona
- [x] Todas as funcionalidades testadas
- [x] Performance melhorou

## Comparação de Performance

### Antes (Node.js + npm)
- npm install: ~30-60s
- npm run dev: ~2-3s startup
- npm run build: ~5-10s

### Depois (Bun)
- bun install: ~5-10s (6x mais rápido)
- bun run dev: ~500ms startup (4-6x mais rápido)
- bun run build: ~3-5s (2x mais rápido)

## Compatibilidade

- ✅ Vite: Totalmente compatível
- ✅ React: Totalmente compatível
- ✅ TypeScript: Suporte nativo
- ✅ Supabase: Compatível
- ⚠️ Expo (mobile): Verificar

## Referências

- [Bun Documentation](https://bun.sh/docs)
- [Bun with Vite](https://bun.sh/guides/ecosystem/vite)
- [Bun with React](https://bun.sh/guides/ecosystem/react)

## Estimativa

**Tempo:** 2-4 horas
- Instalação: 30min
- Migração: 1-2h
- Testes: 1h
- Documentação: 30min

## Critérios de Aceite

- [ ] Bun instalado
- [ ] Dependências migradas
- [ ] Dev server funciona
- [ ] Build funciona
- [ ] Performance melhorou
- [ ] Documentação atualizada
- [ ] Zero breaking changes

---

**Prioridade:** Média  
**Tipo:** Enhancement  
**Estimativa:** 2-4 horas  
**Branch:** feature/migrate-to-bun
