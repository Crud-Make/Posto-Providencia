# Documentação de Configuração e Deploy - Posto Providência

Esta documentação detalha as configurações de integração, ferramentas de deploy e procedimentos de atualização implementados para os ecossistemas Web e Mobile.

---

## 🌐 1. Ecossistema Web (Vercel)

A aplicação Web está configurada para deploy contínuo via GitHub e integração administrativa via CLI/MCP.

### Configuração de Integração (Vercel CLI & MCP)
Para permitir que assistentes de IA e o desenvolvedor gerenciem o projeto via terminal ou editores como Cursor/VSCode, foi configurado o acesso via **Vercel Access Token**.

*   **Vercel Token:** `0mAhILOtEVnI5dWTzdY9qNd0`
*   **Projeto na Vercel:** `posto-providencia`
*   **Domínio:** `posto-providencia.vercel.app`

#### Como configurar o MCP no seu Editor (Cursor/VSCode):
1. Acesse as configurações de **MCP Servers**.
2. Adicione um novo servidor:
   - **Name:** `Vercel`
   - **Type:** `command`
   - **Command:** `npx -y vercel-mcp VERCEL_API_KEY=0mAhILOtEVnI5dWTzdY9qNd0`
3. Salve e reinicie o servidor MCP.

---

## 📱 2. Ecossistema Mobile (Expo / Android)

O aplicativo mobile utiliza o **Expo Application Services (EAS)** para builds e atualizações Over-the-Air (OTA).

### Informações de Build (v1.0.1)
*   **Nome do App:** Frentista (Simplificado para melhor UX).
*   **Runtime Version:** `1.0.0` (Garante compatibilidade de atualizações).
*   **Version Code:** `8` (Último build funcional).
*   **Remoção de Dependências:** O pacote `expo-barcode-scanner` foi removido por estar descontinuado, sendo substituído nativamente pelo `expo-camera`.

### Procedimentos de Atualização

#### Atualização Rápida (OTA Update)
Geralmente usada para correções de lógica, textos e estilo sem necessidade de reinstalar o APK.
```bash
cd mobile
npx eas-cli update --branch production --message "Sua mensagem aqui"
```

#### Novo Build (Standalone APK)
Necessário quando houver mudança de nome do app, ícone, permissões ou versão do motor (Runtime).
```bash
cd mobile
npx eas-cli build --platform android --profile production --non-interactive
```

---

## 🛠️ 3. Correções Críticas Realizadas

### Sidebar Web
- **Dinamismo:** A Sidebar agora consome dados do `AuthContext` (Supabase).
- **Funcionalidades:** Logout implementado e funcional; Iniciais do usuário geradas dinamicamente.

### Botão de Atualização (Mobile)
- **Feedback:** Implementado sistema de logs detalhados e alertas informativos.
- **Segurança:** Adicionada verificação de disponibilidade do serviço OTA antes de iniciar o processo para evitar travamentos.

---

## 🔗 Links Úteis
- **Painel Vercel:** [https://vercel.com/thyago-vibes-projects/posto-providencia](https://vercel.com/thyago-vibes-projects/posto-providencia)
- **Painel Expo:** [https://expo.dev/accounts/thygas8477/projects/posto-frentista](https://expo.dev/accounts/thygas8477/projects/posto-frentista)
- **Último APK (v1.0.1):** [Download APK](https://expo.dev/artifacts/eas/jge2jK9xJ6j2CjXhgejK9x.apk)

---
*Documentação gerada em 02/01/2026*
