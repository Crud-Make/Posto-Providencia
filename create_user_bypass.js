import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kilndogpsffkgkealkaq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbG5kb2dwc2Zma2drZWFsa2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODg4MDUsImV4cCI6MjA3OTk2NDgwNX0.04nyCSgm0_dnD9aAJ_kHpv3OxRVr_V6lkM9-Cu_ZlXA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const email = 'teste@admin.com';
    const password = 'password123';

    console.log('Tentando login para verificar se funciona mesmo sem confirmação...');
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authErr) {
        console.error('Erro Login:', authErr.message);
        if (authErr.message.includes('Email not confirmed')) {
            console.log('Confirmado: Email não está confirmado no Supabase.');
        }
    } else {
        console.log('Login OK! O problema pode ser outro.');
    }
}

run();
