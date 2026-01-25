# Guia de Atualizações OTA (Over-the-Air)

## 📱 Sistema de Atualizações OTA

O app mobile usa **Expo EAS Updates** para enviar correções e novas funcionalidades sem precisar de aprovação na loja de aplicativos.

## 🚀 Como Publicar uma Atualização

### Pré-requisitos
1. **EAS CLI** instalado:
   ```bash
   npm install -g eas-cli
   ```
2. **Login no Expo**:
   ```bash
   eas login
   ```
3. **Git branch atualizada** com as mudanças

### Passo a Passo

#### 1. Publicar Atualização para Produção
```bash
cd apps/mobile
npm run eas:update
```

Este comando:
- Compila o código JavaScript
- Faz upload para o Expo EAS
- Envia para o canal `production`
- Todos os usuários receberão a atualização automaticamente

#### 2. Publicar Atualização para Teste (Preview)
```bash
cd apps/mobile
npm run eas:update:preview
```

#### 3. Verificar Status das Atualizações
```bash
eas update:list
```

## 🏗️ Como Fazer um Novo Build

### Build para Produção (Google Play)
```bash
cd apps/mobile
npm run eas:build
```
Este comando:
- Gera um arquivo **.aab** (Android App Bundle)
- Faz upload para o EAS
- Envia e-mail quando o build estiver pronto
- Download: https://expo.dev/accounts/thygas8477/projects/posto-frentista/builds

### Build para Desenvolvimento
```bash
cd apps/mobile
npm run eas:build:dev
```
Gera um **APK** com development client para testes rápidos.

## 📊 Fluxo de Atualização no App

1. **App Abre**: O `UpdateBanner` em `_layout.tsx` verifica atualizações
2. **Atualização Disponível**:
   - Baixa automaticamente em background
   - Quando pronta, mostra alerta: "🆕 Atualização Disponível"
   - Usuário toca "Atualizar" → App reinicia
3. **Sem Internet**: Não verifica, mas mantém versão atual

## 🔧 Como Funciona o Hook `useUpdateChecker`

```typescript
import { useUpdateChecker } from '../lib/useUpdateChecker';

const {
    status,            // 'checking' | 'available' | 'ready' | 'up-to-date'
    isUpdateAvailable, // true se há atualização
    checkForUpdate,   // Função para verificar manualmente
    promptForUpdate   // Mostra alerta amigável
} = useUpdateChecker({
    checkOnMount: true,      // Verifica ao abrir app
    checkOnForeground: true, // Verifica ao voltar ao foreground
    autoDownload: true       // Baixa automaticamente
});
```

## ⚠️ Limitações

### NÃO PODE atualizar via OTA:
- **Código nativo**: módulos nativos, permissões, configurações
- **Versão do React Native/Expo SDK**
- **assets grandes** (imagens, fontes)

### PODE atualizar via OTA:
- **Código JavaScript/TypeScript**
- **Componentes React**
- **Lógica de negócio**
- **Estilos (Tailwind)**
- **Correções de bugs**

## 📝 Quando Fazer um Build vs Update

| Situação | Ação | Motivo |
|-----------|-------|--------|
| Correção de bug em JS/TS | `eas update` | Rápido, sem loja |
| Nova funcionalidade em JS/TS | `eas update` | Rápido, sem loja |
| Adicionar permissão (câmera, GPS) | `eas build` | Muda AndroidManifest |
- Atualizar versão do Expo SDK | `eas build` | Muda código nativo |
- Adicionar módulo nativo | `eas build` | Requer native modules |
- Nova versão major (1.6.0 → 2.0.0) | `eas build` | Muda versão do app |

## 🔍 Solução de Problemas

### Problema: Atualização não aparece

1. **Verifique o channel**:
   ```bash
   eas update:list
   ```
   Confirme se a atualização está no canal `production`.

2. **Verifique runtimeVersion**:
   O app só recebe atualizações se tiver o mesmo `runtimeVersion` definido em `app.json`.

3. **Logs no app**:
   Conecte com `adb logcat` e procure por `[OTA]` nos logs.

### Problema: Build falha

```bash
# Limpar cache
eas build:clear-cache

# Tentar novamente
eas build --platform android --profile production
```

### Problema: Update falha ao aplicar

1. Verifique se há código nativo modificado
2. Verifique se a versão do runtime mudou
3. Confirme que o build do app está configurado corretamente

## 📱 Testando Atualizações

### Método 1: Build de Preview
```bash
eas build --platform android --profile preview
eas update --branch preview
```

### Método 2: Build de Desenvolvimento
```bash
eas build --platform android --profile development
```

## 📚 Referências

- [Expo Updates Docs](https://docs.expo.dev/eas-update/introduction/)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Project EAS Dashboard](https://expo.dev/accounts/thygas8477/projects/posto-frentista)
