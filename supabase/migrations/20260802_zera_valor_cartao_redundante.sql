-- Zera `FechamentoFrentista.valor_cartao` onde ela apenas REPETE débito + crédito.
--
-- POR QUÊ
-- `valor_cartao` é o "lump" que o painel web usa quando o dono lança um total de
-- cartão sem separar débito de crédito. Por isso `cartao()` em
-- `packages/utils/src/fechamento.ts` soma os três campos: no desenho eles são
-- ALTERNATIVOS — ou se lança o lump, ou se lançam os dois detalhados.
--
-- A carga do histórico (`scripts/carga-historico-fechamento.py`) preenchia o lump
-- com `credito + debito`, repetindo o que já estava detalhado. O cartão passou a
-- entrar DUAS VEZES em tudo que usa `conferido()`.
--
-- MEDIDO EM 02/08/2026, contra `docs/data/posto_jorro_2026.sqlite` (a planilha):
--
--   junho:  tela R$ 360.250,06  ·  planilha R$ 284.807,47   (+26,5%)
--   ano:    tela R$ 2.269.410,15 · planilha R$ 1.847.601,86  (+22,8%)
--   sobra de venda que não existe: R$ 421.808,29
--
-- Confirmado por um segundo caminho, independente: a coluna `valor_conferido` já
-- gravada bate com a planilha em 967 das 991 linhas. Era só a soma do lump que
-- sobrava — o dado detalhado sempre esteve certo.
--
-- SEGURANÇA
-- O `WHERE` só alcança linha em que o lump é EXATAMENTE `debito + credito`
-- (tolerância de meio centavo). Lançamento legítimo de lump — aquele em que o dono
-- informou só o total, sem detalhar — tem débito e crédito zerados e portanto NÃO
-- casa, ficando intacto. Medição de 02/08: 967 linhas casam, 24 têm lump zero, e
-- nenhuma diverge.
--
-- Idempotente: rodar de novo não acha mais nada para zerar.

UPDATE "FechamentoFrentista"
SET valor_cartao = 0
WHERE valor_cartao <> 0
  AND ABS(
        valor_cartao
        - (COALESCE(valor_cartao_debito, 0) + COALESCE(valor_cartao_credito, 0))
      ) < 0.005
  AND (COALESCE(valor_cartao_debito, 0) + COALESCE(valor_cartao_credito, 0)) <> 0;
