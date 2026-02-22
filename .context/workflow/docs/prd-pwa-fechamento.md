# PRD: PWA Fechamento de Caixa (Operacional)

## 📌 1. Visão Geral
O App de **Fechamento de Caixa Mobile** é uma aplicação PWA (Progressive Web App) criada para substituir a versão antiga construída em React Native.
Ele segue o princípio de **Dispositivo Compartilhado Universal**: o posto de gasolina pode manter um único tablet ou smartphone (ou os frentistas usarem seus próprios celulares), sem necessidade de login complexo a cada uso.

O objetivo do app é ser **exclusivo para inserção de dados**, registrando o que cada frentista vendeu durante seu turno (Cartão, PIX, Dinheiro, Fiado). O processamento complexo e análises ficam a cargo do painel de administração Web.

---

## 🚀 2. Como Funciona (Fluxo Operacional)

### Modo Universal e Seleção
1. **Acesso Base:** O PWA é aberto através de um ícone na tela inicial (instalado via Chrome/Safari). O aparelho JÁ está logado ao posto de forma genérica/PIN.
2. **Seleção de Frentista:** A interface pergunta: *"Quem está fazendo o fechamento agora?"*. O funcionário seleciona seu próprio nome em uma lista interativa.
3. **Turno Automático:** O app detecta o turno atual (Manhã, Tarde ou Noite) pela hora do celular (ex: 14:05 -> Turno Tarde), mas permite edição caso estejam registrando o dia/turno anterior.

### Inserção de Dados
1. **Valor Encerrante:** Total geral registrado pelas bombas/vendas do frentista.
2. **Formas de Recebimento:**
   - Cartão Débito e Crédito
   - PIX
   - Dinheiro (cédulas)
   - Moedas
   - Outros (Vouchers, "Baratão")
3. **Notas de Fiado:** O frentista pode selecionar os clientes que compraram fiado, definir o valor e adicionar à "Mochila" do fechamento daquele turno.

### Sincronização e Envio (O Coração do App)
1. **Validações Prévias:** O PWA impede o envio se o total do fechamento for R$ 0,00 ou não houver frentista selecionado.
2. **Botão de Envio (`submitMobileClosing`):** Quando o frentista clica em Enviar:
   - Cria o registro diário do posto (se não existir para o turno).
   - Cria o registro `FechamentoFrentista` no Supabase com os dados específicos do recebedor (Cartões, Pix, etc).
   - Registra cada `NotaFrentista` atrelando o valor à conta do cliente para controle de dívidas.
   - O Supabase recalcula através das Triggers ou do ORM o total faltante do Caixa no Monorepo Web Principal.

### O Ponto Principal: Integração com a Web
O PWA **não precisa gerenciar gráficos complexos ou relatórios**. Ele atua como um coletor ágil. Uma vez que a carga é enviada pelo PWA, o gestor usando a tela do `TelaFechamentoDiario` no `apps/web` recebe os dados quase instantaneamente e pode conferir ou ajustar faltas de caixa (`diferenca`).

---

## 🧱 3. Arquitetura Planejada (Monorepo)

**Stack Escolhida:**
- **App:** `apps/pwa-frentista`
- **Framework:** Vite + React 19 + TypeScript + TailwindCSS
- **PWA:** `vite-plugin-pwa` (Manifest, SW e Caching)
- **Pacotes Compartilhados:** Utilizará `@posto/types` e possivelmente os mesmos services configurados em `@posto/api-core`.

**Regras (Clean Code):**
- SOLID, JSDoc obrigatório, tudo em PT-BR.
- Reduzir imports não utilizados e preferir modularização.
- Interface simples e focada no toque (touch first) - botões com mínimo de 44px (padrão iOS/Android).
- Tratamento explícito do Status Mobile (Se online/offline na hora de enviar, se possui PWA atualizado).
