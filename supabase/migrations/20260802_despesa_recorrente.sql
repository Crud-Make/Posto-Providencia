-- =============================================================================
-- Despesa fixa (recorrente): marca quais despesas se repetem todo mês.
--
-- POR QUE UMA COLUNA E NÃO UMA TABELA DE MODELOS:
--   O modelo de uma despesa fixa É a última despesa dela. Salário, luz, contador
--   e internet mudam de valor ao longo do ano — medido nos 7 meses de 2026 já
--   carregados: "Paulo" (salário) teve 3 valores distintos, de R$ 1.626 a
--   R$ 2.200, por reajuste; "Luz" teve 6, de R$ 280 a R$ 850, porque conta de
--   energia varia por natureza.
--
--   Uma tabela de modelos guardaria um valor que envelhece e passaria a divergir
--   do que foi realmente pago — e num sistema que apura lucro, despesa errada
--   vira lucro errado. Com a coluna, o valor sugerido é sempre o do último
--   lançamento, que é o dado real e não uma cópia.
--
--   "Fixa" aqui significa RECORRENTE (repete todo mês), NÃO valor constante.
--   Por isso a tela sugere e o dono revisa, em vez de lançar sozinha.
--
-- A REGRA de "quais faltam neste mês" não mora no banco: é função pura em
--   `packages/utils/src/despesa-fixa.ts`, com teste próprio. Aqui só o dado.
-- =============================================================================

ALTER TABLE "Despesa"
  ADD COLUMN IF NOT EXISTS recorrente boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN "Despesa".recorrente IS
  'Despesa fixa: repete todo mês. O valor NÃO é constante — serve de sugestão, '
  'tomada do lançamento mais recente com a mesma descrição.';

-- Backfill: marca o que de fato se repete. Corte em 4+ meses distintos, medido
-- sobre os 7 meses de 2026. Pegou 13: Net, Contador, Luz, Embasa, Sistema,
-- Frete, taxas de cartão, Alvará/IPTU, Imposto, ibamentro e 3 salários.
-- O dono revisa e desmarca o que não for — é reversível por um clique.
WITH recorrentes AS (
  SELECT descricao, posto_id
  FROM "Despesa"
  GROUP BY descricao, posto_id
  HAVING COUNT(DISTINCT date_trunc('month', data)) >= 4
)
UPDATE "Despesa" d
SET recorrente = true
FROM recorrentes r
WHERE d.descricao = r.descricao AND d.posto_id = r.posto_id;

CREATE INDEX IF NOT EXISTS idx_despesa_recorrente
  ON "Despesa" (posto_id, recorrente, data DESC)
  WHERE recorrente = true;

-- =============================================================================
-- Categorias que faltavam no cadastro.
--
-- Achado ao remover a tela órfã `/despesas`: três categorias com R$ 85.121,48 já
-- lançados não existiam no seletor da aba oficial, então o dono não conseguiria
-- lançar nelas. `Outros` era o pior caso — o cadastro tinha "Outros (Despesa)",
-- nome diferente, e o DEFAULT do formulário já era 'Outros'. Duas grafias para a
-- mesma categoria partiriam o gráfico de despesas em duas fatias.
--
-- O sufixo "(Despesa)" existia para distinguir da receita homônima, mas a coluna
-- `tipo` já faz isso e o seletor filtra por ela.
-- =============================================================================

UPDATE "CategoriaFinanceira" SET nome = 'Outros', updated_at = now()
WHERE nome = 'Outros (Despesa)' AND tipo = 'despesa';

INSERT INTO "CategoriaFinanceira" (nome, tipo, cor)
SELECT v.nome, 'despesa', v.cor
FROM (VALUES ('Contabilidade', '#8b5cf6'), ('Encargos Sociais', '#f97316')) AS v(nome, cor)
WHERE NOT EXISTS (
  SELECT 1 FROM "CategoriaFinanceira" c WHERE c.nome = v.nome AND c.tipo = 'despesa'
);
