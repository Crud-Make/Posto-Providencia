# 📱 PostoGestão Pro - App Mobile

O **PostoGestão Pro Mobile** é a interface de operação de pista para frentistas e clientes da rede Posto Providência. Desenvolvido com **React Native** e **Expo**, o app permite registros rápidos, validação de vouchers e controle de turnos diretamente no celular.

> [!NOTE]
> **Sobre a Tecnologia:** O GitHub identifica este repositório como **TypeScript** porque 99% do código foi escrito em TypeScript para maior segurança e qualidade. No entanto, este projeto é 100% **React Native (Expo)**.

![Status do Projeto](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow?style=for-the-badge)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

## ✨ Funcionalidades Mobile

### ⛽ Operação de Frentista
*   **Abertura e Fechamento de Turno:** Registro de encerrantes iniciais e finais.
*   **Venda de Bicos:** Lançamento rápido de abastecimentos por combustível.
*   **Gestão de Inadimplência:** Registro e consulta de vendas no "Fiado".
*   **Validação de Vouchers:** Scanner para validar cupons de desconto e promoções.

### 🔔 Notificações e Atualizações
*   **Push Notifications:** Alertas sobre metas batidas ou avisos administrativos.
*   **EAS Update:** Recebimento de correções e novas funcionalidades instantaneamente sem passar pela loja.

## 🛠️ Stack Tecnológica

*   **Framework:** Expo (SDK 54) / React Native.
*   **Estilização:** NativeWind (Tailwind CSS para Mobile).
*   **Banco de Dados:** Supabase (Client-side real-time).
*   **Autenticação:** Supabase Auth (com persistência em SecureStore).

## 🚀 Como Executar Localmente

1.  **Clonar o repositório:**
    ```bash
    git clone https://github.com/Thyago-vibe/posto-mobile.git
    cd posto-mobile
    ```

2.  **Instalar dependências:**
    ```bash
    npm install
    ```

3.  **Configurar Variáveis de Ambiente:**
    O app utiliza o Supabase configurado em `lib/supabase.ts`. Verifique se as chaves estão corretas no arquivo ou configure conforme necessário.

4.  **Iniciar o Expo:**
    ```bash
    npx expo start
    ```
    Escaneie o QR Code com o app **Expo Go** no seu Android ou iOS.

## 🏗️ Build e Deploy

O projeto utiliza o **EAS (Expo Application Services)** para builds e atualizações:
*   **Criar Build Android:** `eas build --platform android`
*   **Enviar Atualização:** `eas update --branch production`

---
Este repositório faz parte do ecossistema [PostoGestão Pro](https://github.com/Thyago-vibe/Posto-Providencia).
