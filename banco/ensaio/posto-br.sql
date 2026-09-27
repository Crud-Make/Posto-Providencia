-- Ensaio do MVP com dois postos: cria o Posto BR com catálogo próprio e as contas do ensaio.
--
-- NÃO RODAR À MÃO e NUNCA em produção: quem roda é `scripts/semeia-ensaio-dois-postos.sh`, que só
-- aceita o Postgres local de um container `posto-pg-*` e gera os hashes (bcrypt, o mesmo do
-- `Hash::check` do Laravel) das senhas que passa aqui como variáveis do psql.
--
-- O catálogo do BR é DE ENSAIO: 4 combustíveis, 4 tanques, 6 bombas × 4 bicos = 24 bicos (o número
-- que o dono confirmou em 26/09; o Jorro tem 6), um bico de cada combustível por bomba. A divisão real
-- por bomba ainda não veio do Elias — o que o ensaio mede é a tela de Fechamento com 24 linhas.
-- Preços diferentes dos do Jorro de propósito: número igual nos dois postos esconde vazamento. Os
-- preços, nomes e capacidades reais do BR também ainda não vieram.
--
-- O JORRO NÃO MUDA (decisão do dono, 26/09): nenhuma linha de posto_id = 1 é criada, alterada ou
-- apagada — nem PIN de frentista do Jorro. A única linha que cita o Jorro é o vínculo do Elias em
-- `UsuarioPosto` (é a conta decidida em 24/09; não toca dado do posto). `retrato-do-jorro.sql`
-- tira o retrato antes e depois para provar.
--
-- Contas (`Usuario.role` + `UsuarioPosto.role`, ver PapelNoPosto):
--   * ADMIN já existente sem senha: ganha senha (ADMIN passa no PostoPolicy de todo posto);
--   * Elias (postoprovidenciaa@gmail.com): GERENTE, vínculo `gerente` no Jorro E no BR;
--   * gerente.br@ensaio.local: GERENTE só no BR — é quem prova o 403 ao pedir o Jorro.
-- PIN: nenhum. Cada frentista cadastra a própria chave no primeiro acesso do PWA (decisão do dono,
-- 27/09) — o ensaio testa esse cadastro.

\set ON_ERROR_STOP on

SELECT EXISTS (SELECT 1 FROM "Posto" WHERE nome = 'Posto BR') AS ja_existe \gset
\if :ja_existe
    \echo 'Posto BR já existe neste banco — nada feito. Para refazer, recrie o volume do compose.'
    \quit
\endif

BEGIN;

INSERT INTO "Posto" (nome, cidade, estado, ativo)
VALUES ('Posto BR', 'Tucano', 'BA', true)
RETURNING id AS posto_br \gset

INSERT INTO "Combustivel" (nome, codigo, cor, preco_venda, preco_custo, posto_id) VALUES
    ('Gasolina Comum',     'GC',  '#E53935', 6.89, 0, :posto_br),
    ('Gasolina Aditivada', 'GA',  '#1E88E5', 7.09, 0, :posto_br),
    ('Etanol',             'ET',  '#43A047', 4.89, 0, :posto_br),
    ('Diesel S10',         'S10', '#FDD835', 7.29, 0, :posto_br);

INSERT INTO "Tanque" (nome, combustivel_id, capacidade, estoque_atual, posto_id)
SELECT 'Tanque ' || c.codigo, c.id, 20000, 0, :posto_br
FROM "Combustivel" c WHERE c.posto_id = :posto_br;

INSERT INTO "Bomba" (nome, posto_id)
SELECT 'BR BOMBA ' || lpad(n::text, 2, '0'), :posto_br FROM generate_series(1, 6) n;

-- Cada bomba: bico 1 GC, 2 GA, 3 ET, 4 S10. Numeração dos bicos 1..24 no posto.
INSERT INTO "Bico" (numero, bomba_id, combustivel_id, tanque_id, posto_id)
SELECT (b.ordem - 1) * 4 + lado, b.id, c.id, t.id, :posto_br
FROM (SELECT id, row_number() OVER (ORDER BY id) AS ordem FROM "Bomba" WHERE posto_id = :posto_br) b
CROSS JOIN generate_series(1, 4) AS lado
JOIN "Combustivel" c ON c.posto_id = :posto_br
    AND c.codigo = (ARRAY['GC', 'GA', 'ET', 'S10'])[lado]
JOIN "Tanque" t ON t.posto_id = :posto_br AND t.combustivel_id = c.id;

INSERT INTO "Turno" (nome, horario_inicio, horario_fim, posto_id) VALUES
    ('Manhã', '06:00', '14:00', :posto_br),
    ('Tarde', '14:00', '22:00', :posto_br),
    ('Noite', '22:00', '06:00', :posto_br);

-- Mesmos nomes, tipos e taxas do Jorro: o fechamento casa forma de pagamento por posto.
INSERT INTO "FormaPagamento" (nome, tipo, taxa, posto_id)
SELECT nome, tipo, taxa, :posto_br FROM "FormaPagamento" WHERE posto_id = 1 AND ativo;

INSERT INTO "Frentista" (nome, data_admissao, turno_id, posto_id)
SELECT f.nome, now() - interval '30 days', t.id, :posto_br
FROM (VALUES ('Ana (BR)', 'Manhã'), ('Bruno (BR)', 'Tarde'), ('Carla (BR)', 'Noite')) f(nome, turno)
JOIN "Turno" t ON t.posto_id = :posto_br AND t.nome = f.turno;

UPDATE "Usuario" SET senha = :'h_dono', "updatedAt" = now()
WHERE role = 'ADMIN' AND ativo AND senha IS NULL;

INSERT INTO "Usuario" (email, nome, senha, role) VALUES
    ('postoprovidenciaa@gmail.com', 'Elias',            :'h_elias', 'GERENTE'),
    ('gerente.br@ensaio.local',     'Gerente só do BR', :'h_so_br', 'GERENTE')
ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha, role = 'GERENTE', ativo = true, "updatedAt" = now();

INSERT INTO "UsuarioPosto" (usuario_id, posto_id, role, ativo)
SELECT u.id, v.posto_id, 'gerente', true
FROM (VALUES ('postoprovidenciaa@gmail.com', 1), ('postoprovidenciaa@gmail.com', :posto_br),
             ('gerente.br@ensaio.local', :posto_br)) v(email, posto_id)
JOIN "Usuario" u USING (email)
ON CONFLICT (usuario_id, posto_id) DO UPDATE SET role = 'gerente', ativo = true;

COMMIT;

-- O que o script imprime para o ensaio (sem hash).
\echo '--- POSTO'
SELECT id, nome FROM "Posto" ORDER BY id;
\echo '--- CATALOGO_BR'
SELECT (SELECT count(*) FROM "Combustivel" WHERE posto_id = :posto_br) AS combustiveis,
       (SELECT count(*) FROM "Tanque"      WHERE posto_id = :posto_br) AS tanques,
       (SELECT count(*) FROM "Bomba"       WHERE posto_id = :posto_br) AS bombas,
       (SELECT count(*) FROM "Bico"        WHERE posto_id = :posto_br) AS bicos,
       (SELECT count(*) FROM "Turno"       WHERE posto_id = :posto_br) AS turnos,
       (SELECT count(*) FROM "FormaPagamento" WHERE posto_id = :posto_br) AS formas;
\echo '--- FRENTISTAS_DO_BR (sem chave — cadastram no PWA)'
SELECT f.id, f.nome, EXISTS (SELECT 1 FROM "AcessoFrentista" a WHERE a.frentista_id = f.id) AS tem_chave
FROM "Frentista" f WHERE f.posto_id = :posto_br ORDER BY f.id;
\echo '--- ADMINS_COM_SENHA_DO_DONO'
SELECT email FROM "Usuario" WHERE role = 'ADMIN' AND senha = :'h_dono';
