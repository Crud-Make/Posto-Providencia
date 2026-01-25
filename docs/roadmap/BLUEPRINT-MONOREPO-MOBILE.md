# 🛰️ BLUEPRINT: Evolução para Monorepo & Mobile Pro

> **Data:** 18/01/2026
> **Escopo:** Unificando o ecossistema Posto Providência para Alta Escalabilidade.

---

## 1. O Problema Atual (Por que mudar?)

Atualmente, o projeto Web e o Mobile vivem em "mundos separados", apesar de compartilharem o mesmo banco de dados. Isso gera:
*   **Desalinhamento de Dados:** No Web o `usuario_id` é tratado corretamente, no Mobile ele está como `string` (causando erros silenciosos).
*   **Dívida Técnica Mobile:** O arquivo de registro tem >1100 linhas e o compilador está travando (`Maximum call stack size exceeded`).
*   **Esforço Duplicado:** Se mudamos uma regra de cálculo no Web, precisamos reescrevê-la manualmente no Mobile.

---

## 2. A Solução: Arquitetura Monorepo (Bun Workspaces)

Vamos transformar a pasta raiz em um **Centro de Inteligência** que distribui código para as aplicações.

### A Nova Estrutura de Pastas:
```text
/Posto-Providencia
├── apps/
│   ├── web/               # Seu Dashboard (Vite + React)
│   └── mobile/            # Seu App (Expo + React Native)
├── packages/              # O "Cérebro" Compartilhado
│   ├── types/             # Única fonte da verdade para o Banco de Dados
│   ├── core/              # Lógica de API e Padrão ApiResponse
│   └── utils/             # Formatadores (R$, Datas) e Cálculos Fringistas
├── package.json           # Maestro que gerencia os espaços de trabalho
└── bun.lockb              # Versões sincronizadas de todas as bibliotecas
```

---

## 3. Os 3 Pilares da Transformação

### I. Sincronia de Tipos (@posto/types)
Criaremos um pacote que contém todas as interfaces do Supabase. Se você mudar o nome de uma coluna no banco, **tanto o Web quanto o Mobile ficarão vermelhos (erro)** até que você ajuste ambos. Isso garante integridade total.

### II. Modularização Mobile (O Resgate)
O arquivo `api.ts` (1000 linhas) será destruído e movido para o pacote `@posto/core`. No Mobile, teremos apenas serviços focados.
A tela de `registro.tsx` (1100 linhas) será refatorada em:
1.  **useRegistro.ts (Hook):** Só a lógica (cálculos e validação).
2.  **Componentes UI:** Pequenos arquivos para cada card da tela.
3.  **Resultado:** Arquivos com menos de 150 linhas (Padrão Senior).

### III. Inteligência Compartilhada (@posto/utils)
Cálculos complexos de diferença de caixa, sobras e faltas agora serão escritos **uma única vez**. O mobile e o web apenas chamam a função:
`const { falta } = calcularFechamento(dados);`

---

## 4. Plano de Execução (Roteiro)

| Fase | Ação | Impacto |
|:---:|:---|:---|
| **1** | **Setup Monorepo** | Organiza pastas e configura Bun Workspaces. |
| **2** | **Extração de Tipos** | Cria o pacote `@posto/types` e limpa o `usuario_id`. |
| **3** | **Refactor Mobile** | Modulariza a API e quebra a tela de 1100 linhas. |
| **4** | **Validação Total** | Build de ambos os apps e fim dos erros de compilador. |

---

## 🎯 Resultado Final Esperado
Um sistema onde o Mobile não é mais um "puxadinho", mas uma extensão poderosa do ecossistema, compartilhando 100% da tipagem do Dashboard e operando sem dívida técnica.

---

**[DOCUMENTAÇÃO COMPLETA GERADA PARA O AGENTE DE EXECUÇÃO]**
