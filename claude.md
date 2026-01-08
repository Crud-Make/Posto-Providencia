# Regras de Desenvolvimento - Posto Providência

> **Versão:** 2.0  
> **Última atualização:** Janeiro/2026  
> **Responsável:** Thyago (Desenvolvedor Principal)

---

## ⚠️ REGRA ZERO - Leitura e Validação Obrigatória

Antes de iniciar qualquer trabalho no projeto, você DEVE:

1. Ler este arquivo `.cursorrules` por completo
2. Criar branch apropriada (`feature/`, `fix/`, `refactor/`, etc.)
3. Executar `./scripts/validate-rules.sh` (ou `npm run validate`)
4. **Comando /push:** Quando o usuário disser "/push", execute o workflow em `.agent/workflows/push.md`

---

## 📋 Índice

1. [Comunicação e Idioma](#1-comunicação-e-idioma)
2. [Fluxo de Trabalho Git](#2-fluxo-de-trabalho-git)
3. [Servidor e Ambiente de Desenvolvimento](#3-servidor-e-ambiente-de-desenvolvimento)
4. [Rigor Técnico - TypeScript](#4-rigor-técnico---typescript)
5. [Documentação de Código](#5-documentação-de-código)
6. [Qualidade e Redução de Dívida Técnica](#6-qualidade-e-redução-de-dívida-técnica)
7. [Versionamento e Pontos de Restauração](#7-versionamento-e-pontos-de-restauração)
8. [Colaboração e Tomada de Decisão](#8-colaboração-e-tomada-de-decisão)

---

## 1. Comunicação e Idioma

### 1.1 Idioma Obrigatório
- **TODO** o conteúdo criado deve ser em **Português (Brasil)**
- Isso inclui: comentários de código, documentação, mensagens de commit, textos de interface, logs e explicações

### 1.2 Proibição de Inglês
- **NUNCA** crie componentes, labels, placeholders ou logs em inglês
- **Exceções permitidas:**
  - Palavras-chave da linguagem de programação (`function`, `const`, `interface`, etc.)
  - Prefixos do Conventional Commits (`feat`, `fix`, `docs`, `chore`, `refactor`, `style`)
  - Nomes de bibliotecas e APIs externas

### 1.3 Tom de Comunicação
- Profissional, prestativo e colaborativo
- Comportamento de um parceiro de pair programming
- Explicações claras e didáticas

---

## 2. Fluxo de Trabalho Git

### 2.1 Rastreabilidade por Issues (GitHub Issues)

| Regra | Descrição |
|-------|-----------|
| **Obrigatoriedade** | NENHUMA tarefa pode ser iniciada sem estar vinculada a uma Issue no GitHub |
| **Nomenclatura de Branch** | `tipo/#numero-descricao` (ex: `feat/#12-login-social`) |
| **Mensagens de Commit** | DEVEM referenciar a issue: `tipo: descrição (#numero)` |
| **Pull Request** | DEVE usar `Closes #numero` para fechamento automático |

### 2.2 Commits Semânticos (Conventional Commits)

```
feat:     Nova funcionalidade
fix:      Correção de bug
docs:     Documentação
chore:    Tarefas de manutenção
refactor: Refatoração de código
style:    Formatação (sem alteração de lógica)
```

### 2.3 Tamanho e Frequência de Commits
- Commits **pequenos e incrementais** são MANDATÓRIOS
- **1 mudança lógica = 1 commit**
- Mensagens devem descrever **exatamente** o que foi feito

### 2.4 Política de Branches

| ✅ Permitido | ❌ Proibido |
|-------------|------------|
| Trabalhar em branches específicas (`fix/`, `feature/`, `refactor/`, `docs/`, `style/`) | Trabalhar diretamente na `main` ou `master` |
| Reutilizar branch para tarefas relacionadas ao mesmo contexto | Criar nova branch para cada micro-correção |
| Criar nova branch apenas para objetivos distintos | Qualquer alteração sem branch dedicada e vinculada a Issue |

### 2.5 Segurança
- **BLOQUEIO TOTAL** de `git push --force`
- Nenhuma exceção é permitida

### 2.6 Changelog
- **SEMPRE** atualizar `CHANGELOG.md` quando:
  - Um bug for corrigido
  - Uma nova funcionalidade for finalizada
- Formato: descrição clara + hash do commit + Issue correspondente
- Seção: `[Não Lançado]`

### 2.7 Regra de Ouro - Validação do Usuário

> ⚠️ **NUNCA** realize merge para `main` ou push remoto sem aprovação explícita do usuário

**Fluxo OBRIGATÓRIO:**

```
1. Criar Branch → vinculada à Issue
        ↓
2. Implementar → as mudanças necessárias
        ↓
3. Solicitar Validação → em LOCALHOST (porta 3015)
        ↓
4. Aguardar "OK" → do usuário após testes
        ↓
5. Criar PR → aguardar CI verde ✅
        ↓
6. Merge → somente após aprovação dupla (usuário + CI)
```

### 2.8 Pull Requests e CI/CD (GitHub Actions)

- **Vercel:** Gera Previews em PRs; produção só atualiza após Merge na `main`
- **GitHub Actions:** Todo PR passa por validação automática (`npm run build`)
- **Merge:** Somente se aprovado pelo usuário E pelo CI

### 2.9 Conformidade
- Nenhum agente (AI) está autorizado a violar estas regras
- Descumprimento = erro de processo

---

## 3. Servidor e Ambiente de Desenvolvimento

### 3.1 Porta Padrão
- **SEMPRE** use a porta **3015**
- Comando: `npm run dev -- --port 3015`

### 3.2 Gerenciamento de Processos
- **ANTES** de iniciar novo servidor:
  - Verificar se não existem processos Vite antigos rodando
  - Evitar confusão de cache entre portas diferentes

### 3.3 URL de Testes
- Validação local: `http://localhost:3015`

---

## 4. Rigor Técnico - TypeScript

### 4.1 Proibição Absoluta do `any`

| ❌ Proibido | ✅ Correto |
|------------|-----------|
| `function processar(dados: any)` | `function processar<T>(dados: T)` |
| `const resposta: any = await fetch()` | `const resposta: RespostaAPI = await fetch()` |

- Se o tipo for desconhecido, use **Generics `<T>`**
- Mantenha segurança de tipos E dinamicidade

### 4.2 Contratos via Interfaces
- **SEMPRE** defina a estrutura de objetos e funções usando `interface` ou `type` **ANTES** da implementação

```typescript
// ✅ Correto: Contrato definido primeiro
interface Venda {
  readonly id: string;
  valor: number;
  formaPagamento: FormaPagamento;
  dataHora: Date;
}

// Depois implementar
function registrarVenda(venda: Venda): ResultadoVenda { ... }
```

### 4.3 Imutabilidade
- Use `readonly` para propriedades que não devem ser alteradas após criação

```typescript
interface Configuracao {
  readonly versao: string;
  readonly ambiente: 'desenvolvimento' | 'producao';
}
```

### 4.4 Enums para Legibilidade
- Use `Enums` para valores fixos (status, direções, tipos)

```typescript
enum FormaPagamento {
  DINHEIRO = 'dinheiro',
  PIX = 'pix',
  CARTAO_CREDITO = 'cartao_credito',
  CARTAO_DEBITO = 'cartao_debito',
  NOTA_VALE = 'nota_vale'
}

enum StatusVenda {
  PENDENTE = 'pendente',
  FINALIZADA = 'finalizada',
  CANCELADA = 'cancelada'
}
```

### 4.5 Estilo de Código
- Funcionalidades modernas ES6+
- Arrow Functions quando apropriado
- Destructuring para clareza

```typescript
// ✅ Moderno e limpo
const { valor, formaPagamento } = venda;
const calcular = (vendas: Venda[]) => vendas.reduce((acc, v) => acc + v.valor, 0);
```

---

## 5. Documentação de Código

### 5.1 Obrigatoriedade
**TODA** função, componente, lógica complexa ou alteração DEVE conter comentários explicativos.

### 5.2 Formato Padrão - JSDoc

```typescript
/**
 * Calcula o total de vendas do dia considerando todas as formas de pagamento.
 * 
 * @param vendas - Array de vendas do dia
 * @returns Total em reais (R$)
 * 
 * @example
 * const total = calcularTotalVendas(vendasDoDia);
 * console.log(`Total: R$ ${total.toFixed(2)}`);
 * 
 * @remarks
 * - Inclui cartão, PIX, dinheiro e nota/vale
 * - Usado no fechamento diário para validação de caixa
 * - Nota/vale também conta como receita esperada
 */
function calcularTotalVendas(vendas: Venda[]): number {
  return vendas.reduce((total, v) => total + v.valor, 0);
}
```

### 5.3 Requisitos de Documentação

| Elemento | O que documentar |
|----------|------------------|
| **Propósito** | O QUE o código faz e POR QUÊ existe |
| **Parâmetros** | Tipo e descrição de cada parâmetro |
| **Retorno** | O que a função retorna |
| **Exemplos** | Quando aplicável, mostrar uso |
| **Observações** | Regras de negócio, edge cases, dependências |

### 5.4 Comentários de Alteração
- **SEMPRE** que alterar código existente, documente:
  - O QUE foi alterado
  - POR QUÊ foi alterado
  - Data da alteração (opcional mas recomendado)

```typescript
// [ALTERADO 2026-01-08] Adicionada validação de valor negativo
// Motivo: Bug #45 - sistema permitia vendas com valor negativo
if (venda.valor < 0) {
  throw new Error('Valor da venda não pode ser negativo');
}
```

### 5.5 Objetivos da Documentação
- Entender a intenção original do código
- Identificar rapidamente onde bugs podem estar
- Facilitar onboarding de novos desenvolvedores
- Permitir manutenção futura sem "decifrar" código

> ⚠️ **Nenhum código pode ser commitado sem documentação adequada.**

---

## 6. Qualidade e Redução de Dívida Técnica

### 6.1 Princípio da Carta Curta
> "Escrever uma carta curta exige mais tempo e entendimento"

- **NÃO** gere código over-engineered
- Priorize soluções **simples e diretas**
- Menos código = menos bugs = mais manutenibilidade

### 6.2 Sinal vs. Ruído

| Remover | Manter |
|---------|--------|
| Códigos desnecessários | Lógica essencial |
| Abstrações vazias | Abstrações úteis |
| Comentários óbvios | Comentários explicativos |
| Código morto | Código ativo |

### 6.3 Evite o Ciclo de Dependência
- **NÃO** tente resolver problemas complexos gerando mais volume de código
- Se a lógica estiver confusa: **PARE**
- Sugira uma **refatoração** em vez de adicionar mais camadas

### 6.4 Feedback do Compilador
- Trate mensagens de erro do TypeScript como **guias**
- Se o código causar erro de tipagem no VS Code:
  - Priorize correção baseada na inferência estática
  - Não ignore warnings

---

## 7. Versionamento e Pontos de Restauração

### 7.1 Padronização de Versão
- **SEMPRE** que uma funcionalidade for concluída, testada e aprovada em produção:
  - Criar ponto de restauração

### 7.2 Nomenclatura

```
# Formato para branches de backup
versao-testada-funcionando-[nome-da-feature]

# Exemplos
versao-testada-funcionando-login-social
versao-testada-funcionando-fechamento-caixa
versao-testada-funcionando-relatorio-vendas
```

### 7.3 Tags Git
- Use tags para marcar estados estáveis do projeto
- Formato sugerido: `v1.0.0`, `v1.1.0`, etc.

### 7.4 Backup de Segurança
- **ANTES** de grandes refatorações:
  - Garantir que última versão estável está tagueada
  - Ou em branch de backup protegida

### 7.5 Registro de Versões
- `CHANGELOG.md` é o guia oficial e centralizado
- Deve conter:
  - O que foi corrigido
  - O que há de novo
  - Em cada versão ou ponto de restauração

### 7.6 Objetivo: Sufoco Zero
- Evitar que o projeto fique "quebrado" por longos períodos
- **SEMPRE** poder voltar para a última `versao-testada-funcionando`

---

## 8. Colaboração e Tomada de Decisão

### 8.1 Diferencie Atrito de Fricção

| Automatizar (Atrito Inútil) | Discutir (Fricção Produtiva) |
|-----------------------------|------------------------------|
| Boilerplates | Lógica central |
| CRUDs simples | Arquitetura |
| Configurações de tsc | Decisões de design |
| Formatação | Trade-offs técnicos |

### 8.2 Explicação de Trade-offs
- Quando houver mais de uma forma de resolver um problema:
  - Liste brevemente as opções
  - Explique **perda** e **ganho** de cada escolha

```
Opção A: Usar Redux
  ✅ Estado centralizado, debug facilitado
  ❌ Mais boilerplate, curva de aprendizado

Opção B: Usar Context API
  ✅ Nativo do React, mais simples
  ❌ Pode ter problemas de performance em apps grandes
```

### 8.3 Papel do Agente (AI)
- Atuar como **parceiro de desenvolvimento**
- Seguir TODAS as regras rigorosamente
- Priorizar **entendimento** sobre **codificação**
- Sempre explicar o raciocínio por trás das decisões

---

## 📎 Referência Rápida

```bash
# Iniciar servidor
npm run dev -- --port 3015

# Validar regras
npm run validate
# ou
./scripts/validate-rules.sh

# Criar branch
git checkout -b feat/#12-nome-da-feature

# Commit semântico
git commit -m "feat: adiciona login social (#12)"

# Workflow de push
/push
```

---

## ✅ Checklist Antes de Qualquer Commit

- [ ] Código está em Português (Brasil)?
- [ ] Branch está vinculada a uma Issue?
- [ ] Commit segue Conventional Commits?
- [ ] Documentação JSDoc está presente?
- [ ] Nenhum `any` foi utilizado?
- [ ] Usuário validou em localhost:3015?
- [ ] CHANGELOG.md foi atualizado?
- [ ] CI passou (verde)?

---

> **Lembre-se:** Estas regras existem para manter a qualidade e a saúde do projeto. Seguí-las rigorosamente evita dores de cabeça futuras e garante que o Posto Providência continue evoluindo de forma sustentável.