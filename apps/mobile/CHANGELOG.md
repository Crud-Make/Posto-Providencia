# Changelog - Posto Providência Mobile

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.6.0] - 2026-01-06

### ✨ Adicionado
- **Seleção de Data de Fechamento**: Agora é possível selecionar a data do fechamento ao invés de usar sempre a data atual.
  - Card visual com exibição da data selecionada
  - Botão "Alterar" para abrir o seletor de data
  - DatePicker nativo para Android e iOS
  - Formatação em português brasileiro (DD/MM/YYYY)
  - Validação: não permite selecionar datas futuras
  - Útil para fechar dias anteriores quando necessário
  - Data selecionada é exibida na mensagem de confirmação antes do envio

### 📦 Dependências
- Adicionado `@react-native-community/datetimepicker@^8.5.1`

### ⚠️ Nota Importante
- **Requer novo build**: Esta versão adiciona uma dependência nativa, portanto não pode ser distribuída via OTA Update.
- Necessário fazer novo build com `npx eas build --platform android --profile production`

---


## [1.4.0] - 2026-01-04

### 🚀 Nova Arquitetura - Modo Plataforma Universal

Esta versão transforma o aplicativo em uma **plataforma universal** que pode ser usada em um único dispositivo (celular do dono) por todos os frentistas do posto.

### ✨ Adicionado
- **Seleção de frentista SEMPRE visível**: Qualquer pessoa pode selecionar qual frentista está realizando o fechamento, independente de estar logado como admin ou não.
- **Sistema de Atualizações OTA Inteligente** (`useUpdateChecker.ts`):
  - Verificação automática ao abrir o app
  - Verificação ao voltar ao foreground
  - Download automático em background
  - **Instant Reload**: Aplicação imediata de atualizações críticas
  - Prompt amigável ao usuário quando atualização está pronta
  - Suporte a Cross-native Runtime Deployments
- Documentação detalhada com JSDoc nas funções principais.

### 🔄 Alterado
- **Header Card refatorado**: Dropdown de seleção de frentistas agora está sempre ativo.
- Badge "Diário" informativo no lugar da seleção manual de turno.
- `loadAllData()` simplificado: removida verificação de papel de usuário (admin/frentista).
- Turno é determinado automaticamente pela função `getCurrentTurno()`, igual ao dashboard web.

### 🗑️ Removido
- Modal de Seleção de Turno (código morto).
- Estado `isAdmin` - não é mais necessário no modo universal.
- Estado `modalTurnoVisible` - seleção de turno agora é automática.
- Import `usuarioService` - não utilizado após refatoração.
- Verificação de caixa aberto por frentista logado.

### 📝 Notas Técnicas
- A lógica de turno agora segue o mesmo padrão do dashboard web (Modo Diário).
- Ao trocar de frentista no dropdown, o formulário é automaticamente limpo (`resetFormulario()`).
- Os frentistas que já fecharam o turno são indicados visualmente na lista.

---

## [1.3.1] - 2026-01-02

### 🐛 Correções
- Correção de layout e formatação de valores.
- Ajustes visuais para melhor experiência do usuário.

---

## [1.3.0] - 2026-01-02

### ✨ Adicionado
- Campo de Moedas no registro de turno.
- Indicação visual de frentistas que já fecharam o turno.
- Auto-refresh via Supabase Realtime.

### 🔄 Alterado
- Layout de grid 2x2 para os campos de pagamento.
- Melhorias na estética e responsividade.

---

## [1.2.0] - 2025-12-XX

### ✨ Adicionado
- Sistema de Notas/Vales com seleção de clientes.
- Campo de Baratão.
- Indicador de clientes bloqueados.

---

## [1.1.0] - 2025-12-XX

### ✨ Adicionado
- Integração com Supabase.
- Sistema de push notifications.
- Tela de histórico de fechamentos.

---

## [1.0.0] - 2025-12-XX

### 🎉 Lançamento Inicial
- Tela de Registro de Turno.
- Campos de Encerrante, Cartão, PIX, Dinheiro.
- Cálculo automático de diferença de caixa.
- Navegação por tabs.
