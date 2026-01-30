# 🚀 Guia de Deploy - Posto Mobile

## 📦 Tipos de Deploy

### 1. EAS Update (Recomendado para mudanças JS/TS) ⚡

**Quando usar:**
- Mudanças em código JavaScript/TypeScript
- Alterações de UI/UX
- Correções de bugs
- Novas features que não mexem em código nativo

**Vantagens:**
- ✅ Atualização instantânea (1-2 minutos)
- ✅ Usuários recebem automaticamente
- ✅ Sem necessidade de reinstalar o app
- ✅ Rollback fácil se necessário

**Como fazer:**
```bash
# 1. Certifique-se que as mudanças estão commitadas
git add -A
git commit -m "feat: sua mensagem"
git push origin main

# 2. Publique o update
npx eas-cli update --branch preview --message "descrição da mudança"

# Para produção
npx eas-cli update --branch production --message "descrição da mudança"
```

**Como os usuários recebem:**
1. App baixa automaticamente na próxima abertura
2. Ou via botão "Verificar Atualizações" no Perfil
3. Update é aplicado ao fechar e reabrir o app

---

### 2. EAS Build (Para mudanças nativas) 🏗️

**Quando usar:**
- Mudanças em dependências nativas
- Alterações em `app.json` ou `eas.json`
- Novos plugins do Expo
- Mudanças em permissões Android/iOS

**Como fazer:**
```bash
# Preview (para testes)
npx eas-cli build --platform android --profile preview

# Production (para publicação)
npx eas-cli build --platform android --profile production
```

---

## 📝 Histórico de Updates

### 03/01/2026 - Campo Moedas
- **Tipo:** EAS Update
- **Branch:** preview
- **Update ID:** e4ae4e56-dc69-428e-9a1b-00e417d79a07
- **Mudanças:**
  - ✨ Novo campo "Moedas" no formulário de pagamentos
  - 📊 Incluído no cálculo do Total Informado
  - 📋 Exibido no Resumo do Turno

### 03/01/2026 - Correção de Build
- **Tipo:** EAS Build
- **Build ID:** a7a7497a-7332-4394-851e-f05591f20b66
- **Mudanças:**
  - 🔧 Corrigido erro de TypeScript stack overflow
  - 📦 Atualizado dependências Expo SDK 54
  - 🗑️ Removido index.ts obsoleto

---

## 🔍 Verificar Status de Updates

```bash
# Ver updates publicados
npx eas-cli update:list --branch preview

# Ver builds
npx eas-cli build:list
```

---

## 🎯 Workflow Recomendado

1. **Desenvolvimento Local**
   ```bash
   npm start
   ```

2. **Commit & Push**
   ```bash
   git add -A
   git commit -m "feat: descrição"
   git push origin main
   ```

3. **Deploy**
   - **Mudanças JS/TS:** `npx eas-cli update`
   - **Mudanças Nativas:** `npx eas-cli build`

4. **Teste**
   - Abra o app no dispositivo
   - Verifique se o update foi aplicado

---

## ⚙️ Configuração

### Runtime Versions
- **Atual:** `1.3.1` (definido em `app.json`)
- Updates só funcionam para apps com a mesma runtime version
- Ao mudar código nativo, incremente a runtime version

### Branches
- `preview` - Para testes internos
- `production` - Para usuários finais

---

## 🆘 Troubleshooting

### Update não aparece no app
1. Feche o app completamente
2. Abra novamente
3. Aguarde 5-10 segundos
4. Feche e abra de novo

### Forçar download manual
No app, vá em: **Perfil → Verificar Atualizações**

### Rollback de update
```bash
npx eas-cli update:republish --group <update-group-id>
```
