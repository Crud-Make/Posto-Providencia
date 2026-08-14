---
name: onde-para-cada-fonte
description: Como descobrir até onde cada fonte tem dado — staging, sqlite do ETL, xlsx e Leitura de produção — sem confundir "dia vazio" com "dia faltando"
metadata:
  type: reference
---

Antes de dizer que um dia "não existe", conferir nas quatro fontes, nesta ordem —
cada uma responde uma pergunta diferente:

1. **`docs/data/posto_jorro_2026.sqlite`** (saída do ETL, autoridade de venda e
   encerrante). `encerrante_diario` tem `dado_incompleto`: linha com `litros NULL`
   e `dado_incompleto=1` é dia com um lado do encerrante faltando — o `venda_bico`
   dela é lixo negativo de milhão, herdado da subtração da planilha, e não se soma.
   `fechamento_diario` traz linha zerada para dia que nunca foi preenchido, então
   **existir linha não significa existir dado**.
2. **`docs/data-staging/estagio1/mes_NN.json`** diz *por que* o dia saiu vazio: o
   campo `avisos` do bloco ("bloco sem cabeçalho 'Produtos'…") é a prova de que o
   extrator olhou e não achou, em vez de ter pulado. `conciliacao.status` fecha o
   mês contra a aba de resumo.
3. **`~/Downloads/Posto,Jorro, 2026.xlsx`** só quando a pergunta é a fórmula, ou
   para provar que a célula está vazia mesmo. `openpyxl` não está instalado; ler o
   XML do zip resolve (`xl/workbook.xml` para os nomes, `xl/_rels/workbook.xml.rels`
   para o mapa aba→sheetN.xml). O `linha_inicio`/`linha_fim` do staging dá a faixa
   exata a inspecionar.
4. **`Leitura` em produção** ([[consulta-leitura-producao]]) pode ter dia que a
   planilha não tem, e vice-versa. As duas divergirem é achado, não erro.

A aba `-26` **não é mês nenhum**: é controle de empréstimo/parcela. Ignorar em
pergunta de venda.

Caso concreto que motivou isto: [[divergencia-26-27-julho]].
