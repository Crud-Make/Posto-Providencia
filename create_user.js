import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kilndogpsffkgkealkaq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbG5kb2dwc2Zma2drZWFsa2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODg4MDUsImV4cCI6MjA3OTk2NDgwNX0.04nyCSgm0_dnD9aAJ_kHpv3OxRVr_V6lkM9-Cu_ZlXA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const email = 'teste@admin.com';
    const password = 'password123';

    console.log('Tentando cadastrar usuário...');
    const { data: auth, error: authErr } = await supabase.auth.signUp({ email, password });
    
    if (authErr && !authErr.message.includes('already registered')) {
        console.error('Erro Auth:', authErr.message);
    } else {
        console.log('Auth OK.');
    }

    console.log('Inserindo na tabela Usuario...');
    const { data: user, error: userErr } = await supabase
        .from('Usuario')
        .insert([{ email, nome: 'Admin Teste', senha: password, role: 'ADMIN', ativo: true }])
        .select();

    if (userErr && userErr.code !== '23505') {
        console.error('Erro Tabela:', userErr.message);
    } else {
        console.log('Tabela OK.', user);
    }
}

run();
