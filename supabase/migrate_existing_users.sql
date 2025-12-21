INSERT INTO "Usuario" (email, nome, senha, role, ativo)
SELECT 
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'nome',
    initcap(replace(split_part(u.email, '@', 1), '.', ' '))
  ) as nome,
  'supabase_auth' as senha,
  'FRENTISTA' as role,
  true as ativo
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM "Usuario" usr WHERE usr.email = u.email
);

INSERT INTO "Frentista" (nome, cpf, telefone, user_id, ativo, data_admissao)
SELECT 
  COALESCE(
    u.raw_user_meta_data->>'nome',
    initcap(replace(split_part(u.email, '@', 1), '.', ' '))
  ) as nome,
  -- Gera um CPF temporário único baseado no hash do email para evitar duplicidade
  -- Formato: 000.XXX.YYY-00
  '000.' || 
  lpad((abs(hashtext(u.id::text)) % 999)::text, 3, '0') || '.' || 
  lpad((abs(hashtext(u.email)) % 999)::text, 3, '0') || '-00' as cpf,
  COALESCE(u.raw_user_meta_data->>'telefone', '(00) 00000-0000') as telefone,
  u.id as user_id,
  true as ativo,
  CURRENT_DATE as data_admissao
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM "Frentista" f WHERE f.user_id = u.id
);

SELECT 
  u.email,
  usr.id as usuario_id,
  usr.nome as usuario_nome,
  f.id as frentista_id,
  f.nome as frentista_nome,
  f.cpf as frentista_cpf,
  f.ativo as frentista_ativo
FROM auth.users u
LEFT JOIN "Usuario" usr ON usr.email = u.email
LEFT JOIN "Frentista" f ON f.user_id = u.id
ORDER BY u.created_at DESC;
