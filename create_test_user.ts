import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!; // Idealmente service_role, mas vamos tentar com a anon se o RLS permitir ou via SQL se falhar

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
    const email = 'teste@admin.com';
    const password = 'password123';
    const nome = 'Administrador Teste';

    console.log('--- Criando usuário no Supabase Auth ---');
    // Nota: signUp pode estar desabilitado ou exigir confirmação. 
    // Como somos o dev, vamos tentar.
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('Usuário já existe no Auth.');
        } else {
            console.error('Erro no Auth:', authError.message);
            return;
        }
    } else {
        console.log('Usuário criado no Auth com sucesso.');
    }

    console.log('--- Criando perfil na tabela Usuario ---');
    const { data: userData, error: userError } = await supabase
        .from('Usuario')
        .insert([
            {
                email,
                nome,
                senha: password, // O app parece salvar a senha em texto claro na tabela Usuario (não recomendado, mas é o que está no tipo)
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
