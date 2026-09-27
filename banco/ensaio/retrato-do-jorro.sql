-- Retrato do Posto Jorro (posto_id = 1): uma linha por tabela que tem a coluna posto_id, com a
-- contagem e um md5 do conteúdo. Igual antes e depois = o Jorro não mudou. Usado pelo
-- scripts/semeia-ensaio-dois-postos.sh e pelo §3 da skill validar-mvp-dois-postos:
--   psql -Atq -f banco/ensaio/retrato-do-jorro.sql > antes.txt   (e depois, e diff)
-- AcessoFrentista não tem posto_id: entra pelos frentistas do Jorro. UsuarioPosto fica FORA: é quem
-- tem acesso ao posto, não dado do posto, e o seed vincula o Elias ao Jorro de propósito.
SELECT format(
    'SELECT %L || '' | '' || count(*) || '' | '' || coalesce(md5(string_agg(t::text, '','' ORDER BY t::text)), ''-'') FROM %I t WHERE posto_id = 1',
    table_name, table_name)
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'posto_id' AND table_name <> 'UsuarioPosto'
ORDER BY table_name
\gexec
SELECT 'AcessoFrentista | ' || count(*) || ' | ' || coalesce(md5(string_agg(a::text, ',' ORDER BY a::text)), '-')
FROM "AcessoFrentista" a JOIN "Frentista" f ON f.id = a.frentista_id WHERE f.posto_id = 1;
