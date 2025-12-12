
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kilndogpsffkgkealkaq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbG5kb2dwc2Zma2drZWFsa2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODg4MDUsImV4cCI6MjA3OTk2NDgwNX0.04nyCSgm0_dnD9aAJ_kHpv3OxRVr_V6lkM9-Cu_ZlXA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function resetStock() {
    console.log("🧹 Zerando ESTOQUE no Supabase...");

    // Como não podemos fazer update sem where por segurança (em alguns casos), vamos listar e atualizar um por um ou usar um where genérico se permitido
    // Tentando update em massa
    const { data, error } = await supabase
        .from('Estoque')
        .update({ quantidade_atual: 0 })
        .gt('id', 0) // Clausula where valida para pegar todos
        .select();

    if (error) {
        console.error("❌ Erro ao zerar estoque:", error);
        return;
    }

    console.log(`✅ Sucesso! ${data.length} tanques foram zerados.`);
    console.table(data.map(e => ({
        id: e.id,
        combustivel_id: e.combustivel_id,
        nova_quantidade: e.quantidade_atual
    })));
}

resetStock();
