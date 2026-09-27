-- ESCRITO À MÃO (ao contrário do 01, que é gerado do catálogo de produção do Supabase).
-- Roda depois de 01-esquema-base.sql (o entrypoint do Postgres aplica em ordem alfabética).
--
-- Fecha a regra TEN-5 de docs/arquitetura/regras.md: cinco UNIQUE de tabela escopada por
-- posto_id não incluíam posto_id na chave, e o banco recusava o segundo posto —
-- Fechamento(data, turno_id) era o pior caso: dois postos não podiam fechar o MESMO DIA.
-- Ver docs/design/multi-tenant.md §3 ("Falta: uniques com posto_id").
--
-- Por que não editar 01-esquema-base.sql: aquele arquivo é GERADO por
-- scripts/extrai-esquema-do-catalogo.py a partir do catálogo de produção do Supabase, que
-- ainda é single-tenant. Rodar o gerador de novo apagaria qualquer edição feita ali. Esta
-- divergência é intencional e nova: existe só no Postgres do Laravel, não em produção — é o
-- próprio destino da refatoração (docs/architecture.md §2), não algo a sincronizar de volta.
--
-- NOT NULL antes do UNIQUE: posto_id nas 5 tabelas é hoje `integer DEFAULT 1`, sem NOT NULL
-- (medido 22/09/2026: 0 linhas NULL em produção nas 5). Sem essa trava, UNIQUE(coluna,
-- posto_id) não fecha nada — o Postgres trata cada NULL como distinto dos demais, então dois
-- postos "sem tenant resolvido" (job ou seeder fora de um PostoAtual, ver
-- App\Compartilhado\PertenceAoPosto) ainda colidiriam sem que o banco recusasse. As 5 tabelas
-- aqui são domínio de tenant (fechamento, estoque, config, fornecedor, frentista): nenhuma
-- faz sentido "sem posto". Isso também avança TEN-4 (❌ SEM TRAVA hoje) para estas 5, sem
-- fechar a regra inteira — as demais 40 tabelas continuam de fora.

ALTER TABLE "Fechamento"   ALTER COLUMN posto_id SET NOT NULL;
ALTER TABLE "Estoque"      ALTER COLUMN posto_id SET NOT NULL;
ALTER TABLE "Configuracao" ALTER COLUMN posto_id SET NOT NULL;
ALTER TABLE "Fornecedor"   ALTER COLUMN posto_id SET NOT NULL;
ALTER TABLE "Frentista"    ALTER COLUMN posto_id SET NOT NULL;

-- Fechamento(data, turno_id) — o pior caso: sem isso, dois postos não fecham o mesmo dia.
-- Era CREATE UNIQUE INDEX no esquema gerado (não ALTER TABLE ADD CONSTRAINT), por isso
-- DROP INDEX aqui, não DROP CONSTRAINT.
DROP INDEX IF EXISTS "Fechamento_data_turno_idx";
CREATE UNIQUE INDEX "Fechamento_data_turno_posto_idx" ON "Fechamento" USING btree (data, turno_id, posto_id);

-- Estoque(combustivel_id) — dois postos não podiam ter o mesmo combustível.
ALTER TABLE "Estoque" DROP CONSTRAINT IF EXISTS "Estoque_combustivel_id_key";
ALTER TABLE "Estoque" ADD CONSTRAINT "Estoque_combustivel_id_posto_id_key" UNIQUE (combustivel_id, posto_id);

-- Configuracao(chave) — configuração era global por engano (efeito colateral de single-tenant),
-- não por decisão: cada posto precisa poder ter o mesmo chave com valor próprio.
ALTER TABLE "Configuracao" DROP CONSTRAINT IF EXISTS "Configuracao_chave_key";
ALTER TABLE "Configuracao" ADD CONSTRAINT "Configuracao_chave_posto_id_key" UNIQUE (chave, posto_id);

-- Fornecedor(cnpj) — o mesmo distribuidor pode servir mais de um posto do sistema.
ALTER TABLE "Fornecedor" DROP CONSTRAINT IF EXISTS "Fornecedor_cnpj_key";
ALTER TABLE "Fornecedor" ADD CONSTRAINT "Fornecedor_cnpj_posto_id_key" UNIQUE (cnpj, posto_id);

-- Frentista(cpf) — a mesma pessoa pode ser cadastrada em mais de um posto (turnos distintos).
ALTER TABLE "Frentista" DROP CONSTRAINT IF EXISTS "Frentista_cpf_key";
ALTER TABLE "Frentista" ADD CONSTRAINT "Frentista_cpf_posto_id_key" UNIQUE (cpf, posto_id);
