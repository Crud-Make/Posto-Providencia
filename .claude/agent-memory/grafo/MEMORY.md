# Memória — agente grafo

- [Preço por litro tem duas fontes](preco-por-litro-duas-fontes.md) — Leitura.preco_litro (histórico) vs Combustivel.preco_venda (cadastro); vários hooks do web usam o cadastro em dia histórico
- [Três parsers de encerrante no web](tres-parsers-de-encerrante-no-web.md) — a string sempre tem milhar; `useLeiturasDiarias` usa `replace('.','')` sem `/g` e erra só no bico ≥ 1 milhão
- [Orquestração do dia para o mês](orquestracao-do-dia-para-o-mes.md) — só `Fechamento` tem agregado guardado; semana e mês recalculam na leitura; pwa-dono só lança HOJE
- [Janela de 7 dias trava lançamento retroativo](janela-7-dias-bloqueia-lancamento-retroativo.md) — RLS barra INSERT de venda fora de 7 dias, mas deixa passar Despesa e HistoricoTanque
