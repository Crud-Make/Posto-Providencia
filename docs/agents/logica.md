Comparação planilha x tela “Compras”

- Planilha (aba POSTO JORRO,2025 ) confirma as fórmulas:
  - Litros vendidos: F5 = E5 - D5
  - Valor por bico: H5 = F5 * G5
  - Lucro/LT: I5 = G5 - G19
  - Lucro/bico: J5 = I5 * F5
  - Margem %: K5 = I5 / G5
  - Média LT: F19 = E19 / D19
  - Valor pra venda: G19 = F19 + H22
  - Custo operacional por LT: H22 = H19 / F11 (onde F11 soma os litros vendidos)
- App ( /compras ) em useCalculosRegistro.ts :
  - Litros vendidos = fechamento - inicial ( L54-L60 ) → bate com E - D
  - Valor por bico = litros * preco_venda_atual ( L62-L67 ) → bate com F * G
  - Média LT = compra_rs / compra_lt ( L71-L79 ) → bate com E / D
  - Despesa/LT = despesasMes / totalLitrosVendidos ( L81-L92 ) → bate com H19 / F11
  - Valor pra venda = media + despesaLt ( L94-L100 ) → bate com F19 + H22
  - Lucro/LT = precoVenda - valorParaVenda ( L102-L108 ) → bate com G5 - G19
  - Margem % = (lucroBico/valorBico)*100 ( L117-L123 ) → equivalente à planilha (ela usa I/G e formata com