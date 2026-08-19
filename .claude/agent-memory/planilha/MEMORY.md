# Memória — agente planilha

- [Estado do docs/data](estado-docs-data.md) — voltou em 16/08 com só 3 arquivos; staging do ETL ausente, mas o xlsx original reapareceu em ~/Downloads
- [Mapa da aba "Posto Jorro"](mapa-aba-posto-jorro-2026.md) — não existe aba com esse nome; onde fica cada bloco da sheet9 e por que nenhuma aba lê outra
- [Cabeçalho de frentista muda por mês](cabecalho-frentista-muda-por-mes.md) — nome, coluna e quantidade mudam; `Posto - Jorro` no mês 07 é a causa do aborto
- [Tabelas que existem de fato](tabelas-que-existem-de-fato.md) — as 12 reais, as 7 que a instrução cita e não existem, e as colunas cujo nome mente
- [Venda: resumo mensal × diário](divergencia-venda-resumo-vs-diario.md) — preço único de fim de mês contra preço do dia; litros batem, R$ não
- [Despesa em duas listas](divergencia-despesa-duas-listas.md) — planilha × app discordam; qual manda no rateio é decisão do dono
- [Fixture de lucro/custo do mês 01](fixture-lucro-custo-mes01.md) — única fonte com custo operacional por litro pronto; margem bruta não existe
- [Divergência 26-27/07](divergencia-26-27-julho.md) — 27 é dado de teste (provado pela AuditoriaDados), 26 é leitura parcial real; decisão do dono pendente
- [Onde para cada fonte](onde-para-cada-fonte.md) — como separar "dia vazio" de "dia faltando" entre sqlite, staging, xlsx e produção
- [Consultar Leitura em produção](consulta-leitura-producao.md) — SELECT somente leitura pela API de management, sem MCP; AuditoriaDados é a caixa-preta
