-- Cadastra "Moedas" e "Baratão" como formas de pagamento do posto 1.
--
-- POR QUÊ
-- A fórmula canônica de `conferido()` tem 7 baldes: dinheiro, moedas, pix, cartão
-- (aditivo), nota e baratão. O cadastro de `FormaPagamento` só tinha 5 deles — não
-- havia forma nenhuma para moedas nem para baratão. Resultado: o auto-preencher do
-- Caixa Geral não tinha onde pôr esses dois valores e eles sumiam da tela. No dia
-- 15/06/2026 eram R$ 5,00 de moedas e R$ 675,23 de baratão evaporando todo dia.
--
-- Sem taxa: nenhum dos dois passa por adquirente.
--
-- Idempotente por nome + posto: reaplica sem duplicar.

INSERT INTO "FormaPagamento" (nome, tipo, taxa, ativo, posto_id)
SELECT 'Moedas', 'venda', 0, true, 1
WHERE NOT EXISTS (
    SELECT 1 FROM "FormaPagamento" WHERE nome = 'Moedas' AND posto_id = 1
);

INSERT INTO "FormaPagamento" (nome, tipo, taxa, ativo, posto_id)
SELECT 'Baratão', 'venda', 0, true, 1
WHERE NOT EXISTS (
    SELECT 1 FROM "FormaPagamento" WHERE nome = 'Baratão' AND posto_id = 1
);
