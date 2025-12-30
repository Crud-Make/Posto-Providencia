
-- 1. Inserir Combustíveis e Tanques para o Posto Acajutiba (posto_id = 3)
-- (Assumindo os mesmos preços base do posto 1, mas você pode ajustar)
INSERT INTO "Combustivel" (nome, codigo, preco_venda, posto_id, cor, ativo) VALUES
('Gasolina Comum', 'GC', 6.48, 3, '#FFFF00', true),
('Gasolina Aditivada', 'GA', 6.48, 3, '#00FF00', true),
('Etanol', 'ET', 4.58, 3, '#00FFFF', true),
('Diesel S10', 'S10', 6.28, 3, '#FF0000', true),
('Diesel Comum', 'DIESEL', 6.18, 3, '#FFA500', true);

-- Função auxiliar para pegar id do combustível recém criado
DO $$
DECLARE
    v_gc_id INTEGER;
    v_ga_id INTEGER;
    v_et_id INTEGER;
    v_s10_id INTEGER;
    v_diesel_id INTEGER;
    v_bomba_1_id INTEGER;
    v_bomba_2_id INTEGER;
    v_bomba_3_id INTEGER;
BEGIN
    -- Pegar IDs dos combustíveis inseridos para o posto 3
    SELECT id INTO v_gc_id FROM "Combustivel" WHERE posto_id = 3 AND codigo = 'GC';
    SELECT id INTO v_ga_id FROM "Combustivel" WHERE posto_id = 3 AND codigo = 'GA';
    SELECT id INTO v_et_id FROM "Combustivel" WHERE posto_id = 3 AND codigo = 'ET';
    SELECT id INTO v_s10_id FROM "Combustivel" WHERE posto_id = 3 AND codigo = 'S10';
    SELECT id INTO v_diesel_id FROM "Combustivel" WHERE posto_id = 3 AND codigo = 'DIESEL';

    -- 2. Inserir Bombas para o Posto Acajutiba
    INSERT INTO "Bomba" (nome, localizacao, posto_id, ativo) VALUES ('Bomba 01', 'Ilha 1', 3, true) RETURNING id INTO v_bomba_1_id;
    INSERT INTO "Bomba" (nome, localizacao, posto_id, ativo) VALUES ('Bomba 02', 'Ilha 2', 3, true) RETURNING id INTO v_bomba_2_id;
    INSERT INTO "Bomba" (nome, localizacao, posto_id, ativo) VALUES ('Bomba 03', 'Ilha 3', 3, true) RETURNING id INTO v_bomba_3_id;

    -- 3. Inserir Bicos vinculando Bombas e Combustíveis
    -- Bomba 1: Gasolina e Etanol
    INSERT INTO "Bico" (numero, bomba_id, combustivel_id, posto_id, ativo) VALUES (1, v_bomba_1_id, v_gc_id, 3, true);
    INSERT INTO "Bico" (numero, bomba_id, combustivel_id, posto_id, ativo) VALUES (2, v_bomba_1_id, v_ga_id, 3, true);
    
    -- Bomba 2: Etanol e S10
    INSERT INTO "Bico" (numero, bomba_id, combustivel_id, posto_id, ativo) VALUES (3, v_bomba_2_id, v_et_id, 3, true);
    INSERT INTO "Bico" (numero, bomba_id, combustivel_id, posto_id, ativo) VALUES (4, v_bomba_2_id, v_s10_id, 3, true);

    -- Bomba 3: Diesel e S10
    INSERT INTO "Bico" (numero, bomba_id, combustivel_id, posto_id, ativo) VALUES (5, v_bomba_3_id, v_diesel_id, 3, true);
    INSERT INTO "Bico" (numero, bomba_id, combustivel_id, posto_id, ativo) VALUES (6, v_bomba_3_id, v_s10_id, 3, true);

    -- 4. Inicializar Estoque para cada Combustível (Opcional, mas recomendado)
    INSERT INTO "Estoque" (combustivel_id, capacidade_tanque, quantidade_atual, custo_medio, posto_id) VALUES
    (v_gc_id, 10000, 5000, 4.50, 3),
    (v_ga_id, 10000, 5000, 4.60, 3),
    (v_et_id, 10000, 5000, 3.20, 3),
    (v_s10_id, 15000, 8000, 4.80, 3),
    (v_diesel_id, 15000, 8000, 4.70, 3);
    
    -- 5. Inserir Formas de Pagamento padrão para o posto
    INSERT INTO "FormaPagamento" (nome, tipo, taxa, posto_id, ativo) VALUES
    ('Dinheiro', 'dinheiro', 0, 3, true),
    ('Cartão Crédito', 'cartao_credito', 2.5, 3, true),
    ('Cartão Débito', 'cartao_debito', 1.5, 3, true),
    ('PIX', 'pix', 0, 3, true),
    ('Nota a Prazo', 'nota_prazo', 0, 3, true);

END $$;
