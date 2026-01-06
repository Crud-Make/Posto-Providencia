-- ============================================
-- TRIGGER: Auto-criar Frentista e Usuario ao registrar novo usuário
-- ============================================
-- Este trigger garante que todo novo usuário no auth.users
-- automaticamente tenha registros nas tabelas Usuario e Frentista

-- 1. Criar função que será executada pelo trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_usuario_id INTEGER;
  nome_extraido TEXT;
BEGIN
  -- Extrai o nome do email (parte antes do @)
  nome_extraido := split_part(NEW.email, '@', 1);
  nome_extraido := replace(nome_extraido, '.', ' ');
  nome_extraido := initcap(nome_extraido);

  -- 1. Criar registro na tabela Usuario
  INSERT INTO "Usuario" (email, nome, role, ativo)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', nome_extraido),
    'FRENTISTA',
    true
  )
  RETURNING id INTO new_usuario_id;

  -- 2. Criar registro na tabela Frentista vinculado ao usuário
  INSERT INTO "Frentista" (
    nome,
    cpf,
    telefone,
    user_id,
    ativo
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'nome', nome_extraido),
    COALESCE(NEW.raw_user_meta_data->>'cpf', 
      -- Gera CPF aleatório: XXX.XXX.XXX-XX
      lpad(floor(random() * 999)::text, 3, '0') || '.' || 
      lpad(floor(random() * 999)::text, 3, '0') || '.' || 
      lpad(floor(random() * 999)::text, 3, '0') || '-' || 
      lpad(floor(random() * 99)::text, 2, '0')
    ),
    COALESCE(NEW.raw_user_meta_data->>'telefone', '(00) 00000-0000'),
    NEW.id,
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar o trigger que dispara a função
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Para testar, crie um novo usuário no painel do Supabase (Authentication > Users > Add User)
-- Depois rode esta query para ver se funcionou:

SELECT 
  u.id as auth_user_id,
  u.email,
  usr.id as usuario_id,
  usr.nome as usuario_nome,
  f.id as frentista_id,
  f.nome as frentista_nome,
  f.ativo
FROM auth.users u
LEFT JOIN "Usuario" usr ON usr.email = u.email
LEFT JOIN "Frentista" f ON f.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 5;
