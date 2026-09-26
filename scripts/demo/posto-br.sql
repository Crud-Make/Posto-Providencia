-- ============================================================================================
--  DADO DE DEMONSTRAÇÃO — NUNCA RODAR EM PRODUÇÃO (nem no Supabase, nem na VPS de produção)
-- ============================================================================================
--
-- Cria o "Posto BR" (segundo posto da rede Providência) com cadastro e movimento INVENTADOS,
-- para o ensaio local de dois postos (Jorro = posto 1, BR = este). Todo número daqui é
-- fabricado: não é dado do posto BR de verdade, e não pode virar dado de ninguém.
--
-- Onde roda: SÓ no banco `posto_demo` do Postgres local da worktree (scripts/banco-da-worktree.sh),
-- criado por scripts/demo/prepara-demo.sh. NÃO no banco `posto` da worktree: o Pest roda lá, em
-- transação, e vários testes contam linhas da tabela inteira (Compra, Recebimento, tokens) — com o
-- movimento da demo dentro, 18 testes reprovam. A trava abaixo recusa qualquer banco que não seja
-- `posto_demo` com o usuário `posto`; não é garantia, é lombada.
--
-- Idempotente: rodar duas vezes não duplica. Cada INSERT é guardado por chave natural
-- (nome + posto, bico + dia, fechamento + frentista, ...), e o movimento é determinístico —
-- a segunda execução calcula os mesmos valores e não grava nada.
--
-- O que cria (posto_id = o do "Posto BR", id 2 quando livre):
--   Cadastro: Posto, 4 Combustivel, 2 Bomba, 4 Tanque, 4 Bico, 9 FormaPagamento, 1 Maquininha,
--             3 Turno, 3 Frentista, 4 Estoque, 1 Fornecedor, 2 Produto.
--   Movimento de jan/2026, nos MESMOS dias em que o Posto 1 tem Leitura (ou 1..31 se não tiver):
--     Leitura: 4 bicos × dia, ~60 % do volume do Jorro por combustível, encerrante encadeado;
--     Compra: 1 por combustível (15/01); Despesa: 6 itens (31/01);
--     Fechamento FECHADO + 2 FechamentoFrentista + Recebimento nos dias 1 a 15.
--   Os dias 16 a 31 ficam SEM fechamento de propósito: é onde o ensaio envia pelo PWA.
--
-- Convenções copiadas do que o sistema já grava (não são escolha deste arquivo):
--   * Leitura.data e Fechamento.data em 00:00 UTC do dia (memória timestamps-leitura-em-utc);
--   * Fechamento.turno_id = 1 e usuario_id = 1: é o que PaiDoDia (TURNO_CANONICO,
--     USUARIO_DO_PWA) grava para QUALQUER posto — o pai do dia que a API procura;
--   * FechamentoFrentista.valor_cartao = 0 quando crédito/débito vêm separados (carga do Jorro);
--   * diferenca = concentrador − conferido; total_vendas = Σ Leitura.valor_total do dia.
-- ============================================================================================

\set ON_ERROR_STOP on

BEGIN;

DO $trava$
BEGIN
  IF current_user <> 'posto' OR current_database() <> 'posto_demo' THEN
    RAISE EXCEPTION 'posto-br.sql é DADO DE DEMONSTRAÇÃO: só roda no banco local "posto_demo" (usuário "posto"). Conectado como % em %.',
      current_user, current_database();
  END IF;
END
$trava$;

DO $demo$
DECLARE
  v_posto   integer;
  v_forn    integer;
  v_turno   integer[];
  v_frent   integer[];
  v_comb    record;
  v_bomba1  integer;
  v_bomba2  integer;
  v_tanque  bigint;
  v_bico    record;
  v_dia     date;
  v_dias    date[];
  v_litros  numeric;
  v_ini     numeric;
  v_fim     numeric;
  v_n       integer;
  v_fech    integer;
  v_total   numeric;
  v_share   numeric;
  v_falta   numeric;
  k         integer;
  f_pix numeric; f_din numeric; f_deb numeric; f_cred numeric; f_nota numeric; f_moe numeric; f_conf numeric;
BEGIN
  ---------------------------------------------------------------------------------------------
  -- Posto
  ---------------------------------------------------------------------------------------------
  SELECT id INTO v_posto FROM "Posto" WHERE nome = 'Posto BR' ORDER BY id LIMIT 1;
  IF v_posto IS NULL THEN
    -- id 2 quando livre (o "segundo posto" da skill validar-mvp-dois-postos); senão, a sequência.
    INSERT INTO "Posto" (id, nome, endereco, cidade, estado, ativo)
    VALUES (CASE WHEN EXISTS (SELECT 1 FROM "Posto" WHERE id = 2) THEN nextval('"Posto_id_seq"') ELSE 2 END,
            'Posto BR', 'Rodovia BR-116 (endereço de demonstração)', 'Tucano', 'BA', true)
    RETURNING id INTO v_posto;
    PERFORM setval('"Posto_id_seq"', GREATEST((SELECT MAX(id) FROM "Posto"), (SELECT last_value FROM "Posto_id_seq")));
  END IF;

  ---------------------------------------------------------------------------------------------
  -- Combustíveis (preço de hoje no cadastro; o preço de janeiro vai em cada Leitura)
  ---------------------------------------------------------------------------------------------
  INSERT INTO "Combustivel" (nome, codigo, cor, ativo, preco_venda, preco_custo, posto_id)
  VALUES ('Gasolina Comum',     'GC',  '#FFD700', true, 6.89, 5.39, v_posto),
         ('Gasolina Aditivada', 'GA',  '#FF4500', true, 7.09, 5.36, v_posto),
         ('Etanol',             'ET',  '#32CD32', true, 4.89, 4.15, v_posto),
         ('Diesel S10',         'S10', '#708090', true, 7.29, 5.42, v_posto)
  ON CONFLICT (codigo, posto_id) DO NOTHING;

  ---------------------------------------------------------------------------------------------
  -- Bombas, tanques e bicos: 2 bombas, 1 bico por combustível
  ---------------------------------------------------------------------------------------------
  INSERT INTO "Bomba" (nome, localizacao, ativo, posto_id)
  VALUES ('BR BOMBA 01', 'Ilha 1', true, v_posto), ('BR BOMBA 02', 'Ilha 2', true, v_posto)
  ON CONFLICT (nome, posto_id) DO NOTHING;
  SELECT id INTO v_bomba1 FROM "Bomba" WHERE nome = 'BR BOMBA 01' AND posto_id = v_posto;
  SELECT id INTO v_bomba2 FROM "Bomba" WHERE nome = 'BR BOMBA 02' AND posto_id = v_posto;

  FOR v_comb IN
    SELECT c.id, c.codigo,
           CASE c.codigo WHEN 'GC' THEN 1 WHEN 'GA' THEN 2 WHEN 'ET' THEN 3 ELSE 4 END AS numero,
           CASE c.codigo WHEN 'GC' THEN 15000 WHEN 'GA' THEN 10000 WHEN 'ET' THEN 10000 ELSE 10000 END AS capacidade,
           CASE c.codigo WHEN 'GC' THEN 7200.00 WHEN 'GA' THEN 1850.00 WHEN 'ET' THEN 2600.00 ELSE 1100.00 END AS estoque,
           c.preco_custo
      FROM "Combustivel" c WHERE c.posto_id = v_posto
  LOOP
    SELECT id INTO v_tanque FROM "Tanque" WHERE nome = 'BR Tanque ' || v_comb.codigo AND posto_id = v_posto;
    IF v_tanque IS NULL THEN
      INSERT INTO "Tanque" (nome, combustivel_id, capacidade, estoque_atual, ativo, posto_id)
      VALUES ('BR Tanque ' || v_comb.codigo, v_comb.id, v_comb.capacidade, v_comb.estoque, true, v_posto)
      RETURNING id INTO v_tanque;
    END IF;

    INSERT INTO "Bico" (numero, bomba_id, combustivel_id, ativo, posto_id, tanque_id)
    VALUES (v_comb.numero, CASE WHEN v_comb.numero <= 2 THEN v_bomba1 ELSE v_bomba2 END, v_comb.id, true, v_posto, v_tanque)
    ON CONFLICT (bomba_id, numero) DO NOTHING;

    INSERT INTO "Estoque" (combustivel_id, quantidade_atual, custo_medio, capacidade_tanque, posto_id)
    VALUES (v_comb.id, v_comb.estoque, v_comb.preco_custo, v_comb.capacidade, v_posto)
    ON CONFLICT (combustivel_id, posto_id) DO NOTHING;
  END LOOP;

  ---------------------------------------------------------------------------------------------
  -- Formas de pagamento (os mesmos 9 nomes do Jorro, taxas um pouco diferentes) e maquininha
  ---------------------------------------------------------------------------------------------
  INSERT INTO "FormaPagamento" (nome, tipo, ativo, taxa, posto_id)
  VALUES ('Dinheiro', 'venda', true, 0.00, v_posto),
         ('Pix', 'venda', true, 0.00, v_posto),
         ('Cartão de Crédito', 'venda', true, 3.20, v_posto),
         ('Cartão de Débito', 'venda', true, 1.10, v_posto),
         ('Convênio/Nota', 'venda', true, 0.00, v_posto),
         ('Vale/Check', 'venda', true, 0.00, v_posto),
         ('APP', 'venda', true, 1.90, v_posto),
         ('Moedas', 'venda', true, 0.00, v_posto),
         ('Baratão', 'venda', true, 0.00, v_posto)
  ON CONFLICT (nome, posto_id) DO NOTHING;

  INSERT INTO "Maquininha" (nome, operadora, taxa, ativo, posto_id)
  SELECT 'Maquininha BR 01', 'Demonstração', 1.50, true, v_posto
  WHERE NOT EXISTS (SELECT 1 FROM "Maquininha" WHERE nome = 'Maquininha BR 01' AND posto_id = v_posto);

  ---------------------------------------------------------------------------------------------
  -- Turnos e frentistas
  ---------------------------------------------------------------------------------------------
  INSERT INTO "Turno" (nome, horario_inicio, horario_fim, ativo, posto_id)
  SELECT t.nome, t.ini, t.fim, true, v_posto
    FROM (VALUES ('Manhã', time '06:00', time '14:00', 1), ('Tarde', time '14:00', time '22:00', 2),
                 ('Noite', time '22:00', time '06:00', 3)) AS t(nome, ini, fim, ordem)
   WHERE NOT EXISTS (SELECT 1 FROM "Turno" x WHERE x.nome = t.nome AND x.posto_id = v_posto);
  SELECT array_agg(id ORDER BY horario_inicio) INTO v_turno FROM "Turno" WHERE posto_id = v_posto;

  INSERT INTO "Frentista" (nome, cpf, telefone, data_admissao, ativo, turno_id, posto_id)
  SELECT f.nome, f.cpf, NULL, timestamptz '2025-12-01 00:00:00+00', true, v_turno[f.turno], v_posto
    FROM (VALUES ('Carla BR', '000.000.001-91', 2), ('Diego BR', '000.000.002-72', 3),
                 ('Joana BR', '000.000.003-53', 1)) AS f(nome, cpf, turno)
  ON CONFLICT (cpf, posto_id) DO NOTHING;
  SELECT array_agg(id ORDER BY nome) INTO v_frent FROM "Frentista"
   WHERE posto_id = v_posto AND nome IN ('Carla BR', 'Diego BR');   -- [1] Carla, [2] Diego

  ---------------------------------------------------------------------------------------------
  -- Fornecedor e produtos da conveniência
  ---------------------------------------------------------------------------------------------
  INSERT INTO "Fornecedor" (nome, cnpj, contato, ativo, posto_id)
  VALUES ('Distribuidora BR (demonstração)', '11.111.111/0001-11', NULL, true, v_posto)
  ON CONFLICT (cnpj, posto_id) DO NOTHING;
  SELECT id INTO v_forn FROM "Fornecedor" WHERE cnpj = '11.111.111/0001-11' AND posto_id = v_posto;

  INSERT INTO "Produto" (nome, categoria, preco_custo, preco_venda, estoque_atual, estoque_minimo, unidade_medida, ativo, posto_id)
  SELECT p.nome, p.cat, p.custo, p.venda, p.est, 5, 'unidade', true, v_posto
    FROM (VALUES ('Óleo 20W50 1L (BR)', 'Lubrificante', 22.50, 34.90, 40),
                 ('Água mineral 500ml (BR)', 'Conveniência', 1.10, 3.00, 120)) AS p(nome, cat, custo, venda, est)
   WHERE NOT EXISTS (SELECT 1 FROM "Produto" x WHERE x.nome = p.nome AND x.posto_id = v_posto);

  ---------------------------------------------------------------------------------------------
  -- Dias do movimento: os dias de jan/2026 em que o Posto 1 tem Leitura; sem eles, 1..31.
  ---------------------------------------------------------------------------------------------
  SELECT array_agg(DISTINCT (data AT TIME ZONE 'UTC')::date ORDER BY (data AT TIME ZONE 'UTC')::date)
    INTO v_dias
    FROM "Leitura"
   WHERE posto_id = 1 AND (data AT TIME ZONE 'UTC')::date BETWEEN date '2026-01-01' AND date '2026-01-31';
  IF v_dias IS NULL THEN
    SELECT array_agg(d::date ORDER BY d) INTO v_dias
      FROM generate_series(date '2026-01-01', date '2026-01-31', interval '1 day') d;
  END IF;

  ---------------------------------------------------------------------------------------------
  -- Leituras: encerrante encadeado por bico. Litros = 60 % do mesmo combustível no Jorro no
  -- mesmo dia, com uma oscilação fixa de ±5 %; sem Jorro no dia, um volume-base por combustível.
  ---------------------------------------------------------------------------------------------
  FOR v_bico IN
    SELECT b.id, b.combustivel_id, c.codigo,
           CASE c.codigo WHEN 'GC' THEN 6.39 WHEN 'GA' THEN 6.49 WHEN 'ET' THEN 4.69 ELSE 6.39 END AS preco_jan,
           CASE c.codigo WHEN 'GC' THEN 612000.000 WHEN 'GA' THEN 215400.500 WHEN 'ET' THEN 187250.250 ELSE 98760.750 END AS encerrante0,
           CASE c.codigo WHEN 'GC' THEN 780 WHEN 'GA' THEN 150 WHEN 'ET' THEN 250 ELSE 60 END AS base
      FROM "Bico" b JOIN "Combustivel" c ON c.id = b.combustivel_id
     WHERE b.posto_id = v_posto
     ORDER BY b.numero
  LOOP
    v_fim := v_bico.encerrante0;
    FOREACH v_dia IN ARRAY v_dias LOOP
      SELECT COALESCE(SUM(l.litros_vendidos), 0) INTO v_litros
        FROM "Leitura" l JOIN "Combustivel" c ON c.id = l.combustivel_id
       WHERE l.posto_id = 1 AND c.codigo = v_bico.codigo AND (l.data AT TIME ZONE 'UTC')::date = v_dia;
      IF v_litros = 0 THEN
        v_litros := v_bico.base;
      END IF;
      v_litros := round(v_litros * 0.60 * (0.95 + ((extract(day FROM v_dia)::int * 7 + v_bico.id) % 11) / 100.0), 3);
      v_ini := v_fim;
      v_fim := v_ini + v_litros;

      INSERT INTO "Leitura" (data, bico_id, combustivel_id, leitura_inicial, leitura_final, litros_vendidos,
                             preco_litro, valor_total, usuario_id, turno_id, posto_id)
      VALUES ((v_dia::text || ' 00:00:00+00')::timestamptz, v_bico.id, v_bico.combustivel_id, v_ini, v_fim, v_litros,
              v_bico.preco_jan, round(v_litros * v_bico.preco_jan, 2), 1, 1, v_posto)
      ON CONFLICT (bico_id, data) DO NOTHING;
    END LOOP;
  END LOOP;

  ---------------------------------------------------------------------------------------------
  -- Compras: uma por combustível, em 15/01
  ---------------------------------------------------------------------------------------------
  INSERT INTO "Compra" (data, combustivel_id, fornecedor_id, quantidade_litros, valor_total, custo_por_litro,
                        numero_nf, observacoes, posto_id)
  SELECT timestamptz '2026-01-15 00:00:00+00', c.id, v_forn, v.litros, round(v.litros * v.custo, 2), v.custo,
         'DEMO-BR-' || c.codigo, 'Compra de demonstração do Posto BR — dado inventado', v_posto
    FROM (VALUES ('GC', 18000.000, 5.3900), ('GA', 3000.000, 5.3600),
                 ('ET', 5000.000, 4.1500), ('S10', 1800.000, 5.4200)) AS v(codigo, litros, custo)
    JOIN "Combustivel" c ON c.codigo = v.codigo AND c.posto_id = v_posto
   WHERE NOT EXISTS (SELECT 1 FROM "Compra" x
                      WHERE x.posto_id = v_posto AND x.combustivel_id = c.id
                        AND x.data = timestamptz '2026-01-15 00:00:00+00');

  ---------------------------------------------------------------------------------------------
  -- Despesas do mês (competência 31/01, pagas)
  ---------------------------------------------------------------------------------------------
  INSERT INTO "Despesa" (descricao, categoria, valor, data, status, data_pagamento, posto_id, categoria_id, recorrente)
  SELECT d.descricao, d.categoria, d.valor, date '2026-01-31', 'pago', date '2026-01-31', v_posto,
         (SELECT id FROM "CategoriaFinanceira" WHERE nome = d.categoria AND posto_id IS NULL LIMIT 1), d.recorrente
    FROM (VALUES ('Salários da equipe BR',        'Folha de Pagamento', 7200.00, true),
                 ('Encargos sociais',             'Encargos Sociais',   1380.00, true),
                 ('Energia elétrica',             'Energia Elétrica',   1350.00, true),
                 ('Aluguel do terreno',           'Aluguel',            2500.00, true),
                 ('Frete de combustível',         'Outros',             3100.00, false),
                 ('Honorários do contador',       'Contabilidade',       800.00, true)) AS d(descricao, categoria, valor, recorrente)
   WHERE NOT EXISTS (SELECT 1 FROM "Despesa" x
                      WHERE x.posto_id = v_posto AND x.descricao = d.descricao AND x.data = date '2026-01-31');

  ---------------------------------------------------------------------------------------------
  -- Fechamentos dos dias 1 a 15: dois envios (Carla 55 %, Diego 45 %), com falta/sobra pequena
  ---------------------------------------------------------------------------------------------
  v_n := 0;
  FOREACH v_dia IN ARRAY v_dias LOOP
    CONTINUE WHEN extract(day FROM v_dia) > 15;

    SELECT COALESCE(SUM(valor_total), 0) INTO v_total
      FROM "Leitura" WHERE posto_id = v_posto AND data = (v_dia::text || ' 00:00:00+00')::timestamptz;
    CONTINUE WHEN v_total = 0;

    SELECT id INTO v_fech FROM "Fechamento"
     WHERE posto_id = v_posto AND turno_id = 1 AND data = (v_dia::text || ' 00:00:00+00')::timestamptz;
    IF v_fech IS NOT NULL THEN
      CONTINUE;   -- já existe (segunda execução, ou gravado pelo ensaio): não mexe
    END IF;

    INSERT INTO "Fechamento" (data, total_vendas, total_recebido, diferenca, status, observacoes, usuario_id, turno_id, posto_id)
    VALUES ((v_dia::text || ' 00:00:00+00')::timestamptz, v_total, 0, NULL, 'FECHADO',
            'Fechamento de demonstração do Posto BR — dado inventado', 1, 1, v_posto)
    RETURNING id INTO v_fech;

    FOR k IN 1..2 LOOP
      v_share := CASE WHEN k = 1 THEN round(v_total * 0.55, 2) ELSE v_total - round(v_total * 0.55, 2) END;
      -- falta (positivo) ou sobra (negativo) de até ~R$ 19, fixa por dia e frentista
      v_falta := (((extract(day FROM v_dia)::int * (k * 6 + 7) + k * 11) % 25) - 5)::numeric(10, 2);
      f_pix  := round(v_share * 0.30, 2);
      f_deb  := round(v_share * 0.18, 2);
      f_cred := round(v_share * 0.24, 2);
      f_nota := round(v_share * 0.05, 2);
      f_moe  := round(v_share * 0.01, 2);
      f_din  := v_share - f_pix - f_deb - f_cred - f_nota - f_moe - v_falta;
      f_conf := f_pix + f_deb + f_cred + f_nota + f_moe + f_din;

      INSERT INTO "FechamentoFrentista" (fechamento_id, frentista_id, valor_dinheiro, valor_moedas, valor_pix,
                                         valor_cartao_credito, valor_cartao_debito, valor_nota, baratao, valor_cartao,
                                         valor_conferido, encerrante, diferenca_calculada, posto_id,
                                         data_hora_envio, observacoes)
      VALUES (v_fech, v_frent[k], f_din, f_moe, f_pix, f_cred, f_deb, f_nota, 0.00, 0.00,
              f_conf, v_share, v_share - f_conf, v_posto,
              (v_dia::text || CASE WHEN k = 1 THEN ' 14:05:00-03' ELSE ' 22:05:00-03' END)::timestamptz,
              'Envio de demonstração')
      ON CONFLICT (fechamento_id, frentista_id) DO NOTHING;
    END LOOP;

    -- Recebimentos por forma: a soma dos dois envios em cada balde
    INSERT INTO "Recebimento" (fechamento_id, forma_pagamento_id, maquininha_id, valor, observacoes)
    SELECT v_fech, fp.id, NULL, s.valor, 'Demonstração'
      FROM (SELECT 'Dinheiro' AS forma, SUM(valor_dinheiro) AS valor FROM "FechamentoFrentista" WHERE fechamento_id = v_fech
            UNION ALL SELECT 'Pix', SUM(valor_pix) FROM "FechamentoFrentista" WHERE fechamento_id = v_fech
            UNION ALL SELECT 'Cartão de Crédito', SUM(valor_cartao_credito) FROM "FechamentoFrentista" WHERE fechamento_id = v_fech
            UNION ALL SELECT 'Cartão de Débito', SUM(valor_cartao_debito) FROM "FechamentoFrentista" WHERE fechamento_id = v_fech
            UNION ALL SELECT 'Convênio/Nota', SUM(valor_nota) FROM "FechamentoFrentista" WHERE fechamento_id = v_fech
            UNION ALL SELECT 'Moedas', SUM(valor_moedas) FROM "FechamentoFrentista" WHERE fechamento_id = v_fech) s
      JOIN "FormaPagamento" fp ON fp.nome = s.forma AND fp.posto_id = v_posto;

    -- Consolida o pai como a API faz (ReconsolidaFechamento): recebido = Σ conferido,
    -- diferenca = concentrador − conferido.
    UPDATE "Fechamento" f
       SET total_recebido = s.recebido, diferenca = f.total_vendas - s.recebido
      FROM (SELECT SUM(valor_conferido) AS recebido FROM "FechamentoFrentista" WHERE fechamento_id = v_fech) s
     WHERE f.id = v_fech;

    v_n := v_n + 1;
  END LOOP;

  RAISE NOTICE 'Posto BR = id %; fechamentos novos nesta execução: %', v_posto, v_n;
END
$demo$;

COMMIT;
