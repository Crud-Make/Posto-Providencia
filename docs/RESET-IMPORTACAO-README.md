# 🔄 Script de Reset e Importação de Dados

## ✅ Status: Pronto para Uso

O sistema está configurado e pronto para receber a planilha atualizada!

## 📋 O que foi preparado:

### 1. **Script de Importação** (`scripts/reset-and-import-data.js`)
- ✅ Limpa todas as tabelas do banco de dados
- ✅ Lê a planilha Excel automaticamente
- ✅ Importa dados via Supabase Client
- ✅ Relatório detalhado de sucesso/erros

### 2. **Comando NPM**
```bash
npm run reset-data
```
ou
```bash
bun run reset-data
```

### 3. **Estrutura Esperada da Planilha**
Consulte: `docs/ESTRUTURA-PLANILHA.md`

---

## 🚀 Próximos Passos

### Quando você enviar a planilha atualizada:

1. **Salvar a planilha** em:
   ```
   docs/data/Posto,Jorro, 2025.xlsx
   ```

2. **Executar o script**:
   ```bash
   bun run reset-data
   ```

3. **Verificar os resultados** no console

---

## 📊 Abas Suportadas

O script processa automaticamente as seguintes abas da planilha:

- ✅ **Usuarios** - Cadastro de usuários do sistema
- ✅ **Combustiveis** - Tipos de combustíveis
- ✅ **Postos** - Postos de combustível
- ✅ **Frentistas** - Funcionários frentistas
- ✅ **Produtos** - Produtos de conveniência

---

## ⚠️ IMPORTANTE

### 🔴 **ATENÇÃO: DADOS SERÃO APAGADOS!**
O script **ZERA COMPLETAMENTE** o banco de dados antes de importar.

### Tabelas que serão limpas:
- TokenAbastecimento
- PromocaoBaratencia
- ClienteBaratencia
- PushToken
- ItemVenda
- Venda
- RecebimentoFechamento
- Fechamento
- Leitura
- DespesaOperacional
- CompraCombustivel
- HistoricoTanque
- Tanque
- Bico
- Bomba
- Produto
- Frentista
- UsuarioPosto
- Posto
- Combustivel
- Usuario

---

## 🛠️ Tecnologias Utilizadas

- **XLSX** - Leitura de planilhas Excel
- **Supabase Client** - Inserção de dados no banco
- **Node.js** - Execução do script
- **Dotenv** - Carregamento de variáveis de ambiente

---

## 📝 Logs do Script

O script exibe logs detalhados:

```
╔════════════════════════════════════════════╗
║  🔄 RESET E IMPORTAÇÃO DE DADOS           ║
║  Posto Providência - Sistema de Gestão    ║
╚════════════════════════════════════════════╝

🗑️  Iniciando limpeza do banco de dados...

✅ TokenAbastecimento: Limpa
✅ PromocaoBaratencia: Limpa
✅ ClienteBaratencia: Limpa
...

✨ Limpeza concluída!

📊 Lendo planilha Excel...

📄 Abas encontradas: Usuarios, Combustiveis, Postos, Frentistas, Produtos

   Usuarios: 5 registros
   Combustiveis: 4 registros
   Postos: 2 registros
   Frentistas: 8 registros
   Produtos: 15 registros

📥 Iniciando importação de dados...

👤 Inserindo Usuários...
✅ 5 usuários inseridos

⛽ Inserindo Combustíveis...
✅ 4 combustíveis inseridos

🏪 Inserindo Postos...
✅ 2 postos inseridos

👨‍🔧 Inserindo Frentistas...
✅ 8 frentistas inseridos

📦 Inserindo Produtos...
✅ 15 produtos inseridos

✨ Importação concluída!

╔════════════════════════════════════════════╗
║  ✅ PROCESSO CONCLUÍDO COM SUCESSO!       ║
╚════════════════════════════════════════════╝
```

---

## 🎯 Aguardando...

**Estou pronto para processar a planilha atualizada assim que você enviar!**

Basta salvar o arquivo em `docs/data/Posto,Jorro, 2025.xlsx` e executar:
```bash
bun run reset-data
```

---

**Desenvolvido com ❤️ para o Posto Providência**
