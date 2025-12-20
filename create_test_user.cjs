const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
    const email = 'teste@admin.com';
    const password = 'password123';
    const nome = 'Administrador Teste';

    console.log('--- Criando usuário no Supabase Auth ---');
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('Usuário já existe no Auth.');
        } else {
            console.error('Erro no Auth:', authError.message);
        }
    } else {
        console.log('Usuário criado no Auth com sucesso.');
    }

    console.log('--- Criando perfil na tabela Usuario ---');
    const { data: userData, error: userError } = await supabase
        .from('Usuario')
        .insert([
            {
                email: email,
                nome: nome,
                senha: password,
                role: 'ADMIN',
                ativo: true
            }
        ])
        .select();

    if (userError) {
        if (userError.code === '23505') {
            console.log('Perfil de usuário já existe na tabela Usuario.');
        } else {
            console.error('Erro ao criar perfil:', userError.message);
        }
    } else {
        console.log('Perfil criado com sucesso:', userData);
    }
}

createTestUser();
