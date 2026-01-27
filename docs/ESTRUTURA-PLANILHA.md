# 📊 Estrutura da Planilha para Importação

Este documento descreve a estrutura esperada da planilha Excel para importação de dados no sistema **Posto Providência**.

## 📁 Arquivo
- **Localização**: `docs/data/Posto,Jorro, 2025.xlsx`
- **Formato**: Excel (.xlsx)

## 📋 Abas Esperadas

### 1. **Usuarios** (Opcional)
Cadastro de usuários do sistema.

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| email | Texto | ✅ | Email único do usuário |
| nome | Texto | ✅ | Nome completo |
| senha | Texto | ❌ | Senha (padrão: "senha123") |
| role | Texto | ❌ | ADMIN, GERENTE, OPERADOR, FRENTISTA (padrão: OPERADOR) |
| ativo | Boolean | ❌ | true/false (padrão: true) |

**Exemplo:**
```
email                    | nome              | role      | ativo
admin@posto.com          | João Silva        | ADMIN     | true
gerente@posto.com        | Maria Santos      | GERENTE   | true
```

---

### 2. **Combustiveis** (Recomendado)
Tipos de combustíveis disponíveis.

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| nome | Texto | ✅ | Nome do combustível |
| codigo | Texto | ✅ | Código único (ex: GC, GA, S10) |
| cor | Texto | ❌ | Cor em hexadecimal (padrão: #000000) |
| preco_venda | Número | ❌ | Preço de venda por litro |
| ativo | Boolean | ❌ | true/false (padrão: true) |

**Exemplo:**
```
nome              | codigo | cor      | preco_venda | ativo
Gasolina Comum    | GC     | #FF0000  | 5.89        | true
Gasolina Aditivada| GA     | #00FF00  | 6.19        | true
Diesel S10        | S10    | #FFFF00  | 5.49        | true
Etanol            | ET     | #0000FF  | 3.99        | true
```

---

### 3. **Postos** (Obrigatório)
Cadastro dos postos de combustível.

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| nome | Texto | ✅ | Nome do posto |
| endereco | Texto | ❌ | Endereço completo |
| telefone | Texto | ❌ | Telefone de contato |
| cnpj | Texto | ❌ | CNPJ do posto |
| ativo | Boolean | ❌ | true/false (padrão: true) |

**Exemplo:**
```
nome                  | endereco                           | telefone       | cnpj              | ativo
Posto Providência     | Av. Principal, 123 - Centro        | (11) 3333-4444 | 12.345.678/0001-90| true
Posto Jorro           | Rua das Flores, 456 - Jardim       | (11) 5555-6666 | 98.765.432/0001-10| true
```

---

### 4. **Frentistas** (Recomendado)
Cadastro dos frentistas.

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| nome | Texto | ✅ | Nome completo |
| cpf | Texto | ❌ | CPF do frentista |
| telefone | Texto | ❌ | Telefone de contato |
| ativo | Boolean | ❌ | true/false (padrão: true) |

**Exemplo:**
```
nome              | cpf            | telefone       | ativo
Carlos Oliveira   | 123.456.789-00 | (11) 9999-8888 | true
Ana Paula         | 987.654.321-00 | (11) 8888-7777 | true
```

---

### 5. **Produtos** (Opcional)
Produtos de conveniência e lubrificantes.

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| nome | Texto | ✅ | Nome do produto |
| codigo | Texto | ✅ | Código único |
| preco_venda | Número | ❌ | Preço de venda |
| preco_custo | Número | ❌ | Preço de custo |
| estoque | Número | ❌ | Quantidade em estoque |
| ativo | Boolean | ❌ | true/false (padrão: true) |

**Exemplo:**
```
nome              | codigo | preco_venda | preco_custo | estoque | ativo
Óleo Motor 5W30   | OL001  | 45.90       | 32.00       | 50      | true
Refrigerante 2L   | REF001 | 8.50        | 5.00        | 100     | true
Água Mineral 500ml| AG001  | 2.50        | 1.20        | 200     | true
```

---

## 🚀 Como Usar

### 1. **Preparar a Planilha**
- Crie ou edite o arquivo `docs/data/Posto,Jorro, 2025.xlsx`
- Adicione as abas conforme a estrutura acima
- Preencha os dados

### 2. **Executar o Script**
```bash
npm run reset-data
```

### 3. **O que o Script Faz**
1. ✅ **Limpa** todas as tabelas do banco de dados (respeitando foreign keys)
2. ✅ **Lê** a planilha Excel
3. ✅ **Importa** os dados na ordem correta
4. ✅ **Exibe** relatório de sucesso/erros

---

## ⚠️ Avisos Importantes

### 🔴 **ATENÇÃO: DADOS SERÃO APAGADOS!**
O script **ZERA COMPLETAMENTE** o banco de dados antes de importar. Todos os dados existentes serão perdidos.

### 📝 **Ordem de Importação**
O script importa os dados na seguinte ordem (respeitando foreign keys):
1. Usuários
2. Combustíveis
3. Postos
4. Frentistas
5. Produtos

### 🔗 **Relacionamentos Automáticos**
- Frentistas são automaticamente associados ao **primeiro posto** cadastrado
- Produtos são automaticamente associados ao **primeiro posto** cadastrado

---

## 🛠️ Troubleshooting

### Erro: "Planilha não encontrada"
- Verifique se o arquivo está em `docs/data/Posto,Jorro, 2025.xlsx`
- Verifique se o nome do arquivo está correto (incluindo vírgulas)

### Erro: "Variáveis de ambiente não encontradas"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Verifique se contém `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

### Erro ao inserir dados
- Verifique se os nomes das colunas estão corretos
- Verifique se os tipos de dados estão corretos
- Verifique se campos obrigatórios estão preenchidos

---

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação do projeto ou entre em contato com o desenvolvedor.

---

**Desenvolvido com ❤️ para o Posto Providência**
