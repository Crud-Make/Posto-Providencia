# Memória — agente planilha

- [Estado do docs/data](estado-docs-data.md) — docs/data = planilha VELHA (07/08); planilha NOVA (30/08) tem staging completo em docs/data-staging/2026-08-30/
- [Mapa da aba "Posto Jorro"](mapa-aba-posto-jorro-2026.md) — não existe aba com esse nome; onde fica cada bloco da sheet9 e por que nenhuma aba lê outra
- [Cabeçalho de frentista muda por mês](cabecalho-frentista-muda-por-mes.md) — nome, coluna e quantidade mudam; `Posto - Jorro` no mês 07 é a causa do aborto
- [Tabelas que existem de fato](tabelas-que-existem-de-fato.md) — as 12 reais, as 7 que a instrução cita e não existem, e as colunas cujo nome mente
- [Venda: resumo mensal × diário](divergencia-venda-resumo-vs-diario.md) — preço único editado à mão no resumo × preço do dia; sinal do delta varia; lucro do resumo não desconta falta
- [Duas colunas de concentrador](divergencia-concentrador-fechamento-diario.md) — fechamento_diario: encerrante×preço × bloco Caixa divergem em todos os dias; a falta se mede contra o Caixa
- [Despesa em duas listas](divergencia-despesa-duas-listas.md) — planilha × app discordam; qual manda no rateio é decisão do dono
- [Fixture de lucro/custo do mês 01](fixture-lucro-custo-mes01.md) — única fonte com custo operacional por litro pronto; margem bruta não existe
- [Custo do produto = média do próprio mês](custo-produto-media-do-proprio-mes.md) — F=Compra R$/Compra LT na aba POSTO JORRO; estoque "ano passado" é só litros, sem custo de abertura; não usa compra do mês anterior
- [Divergência 26-27/07](divergencia-26-27-julho.md) — 27 é dado de teste (provado pela AuditoriaDados), 26 é leitura parcial real; decisão do dono pendente
- [Onde para cada fonte](onde-para-cada-fonte.md) — como separar "dia vazio" de "dia faltando" entre sqlite, staging, xlsx e produção
- [Consultar Leitura em produção](consulta-leitura-producao.md) — SELECT somente leitura pela API de management, sem MCP; AuditoriaDados é a caixa-preta
- [venda_bico lixo em dia incompleto](venda-bico-lixo-em-dia-incompleto.md) — SUM(venda_bico)/venda_concentrador_total exige dado_incompleto=0; planilha rateia despesa÷litros, não 0,45 fixo; manifesto tem referencia_ate_dia
- [Lucro bruto e folha: onde ficam](lucro-bruto-e-folha-onde-ficam.md) — lucro bruto = Σlucro_bico + despesa_mensal (fecha ao centavo); folha = rubrica "Nome = dia" na planilha / categoria no app; ago do app é cópia
- [Custo fixo só no histórico](custo-operacional-fixo-so-no-historico.md) — I19/H22 são despesa÷litros em 2025 e 2026; G digitado por ano no bloco "Ano 17 a 26"; bloco anual da planilha 2025 é lixo (dez vazio)
- [Taxa de cartão: onde está](taxa-cartao-onde-esta-na-planilha.md) — calculada por dia mas quem vira despesa é o bloco de consolidação, redigitado à mão; layout muda do mês 01 p/ 02
- [Não há lucro líquido diário](sem-lucro-liquido-diario.md) — bloco Caixa Dia não tem lucro, custo nem despesa; lucro só mensal por bico, e já líquido de despesa
- [Venda sem compra e zero IFERROR](venda-sem-compra-e-zero-guarda-de-erro.md) — 24.543 fórmulas sem guarda; mês sem compra recebe compra simbólica digitada à mão
