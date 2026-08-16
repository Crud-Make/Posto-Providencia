# Memória — agente grafo

- [Preço por litro tem duas fontes](preco-por-litro-duas-fontes.md) — Leitura.preco_litro (histórico) vs Combustivel.preco_venda (cadastro); vários hooks do web usam o cadastro em dia histórico
- [Três parsers de encerrante no web](tres-parsers-de-encerrante-no-web.md) — a string sempre tem milhar; `useLeiturasDiarias` usa `replace('.','')` sem `/g` e erra só no bico ≥ 1 milhão
