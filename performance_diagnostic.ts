
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kilndogpsffkgkealkaq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbG5kb2dwc2Zma2drZWFsa2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODg4MDUsImV4cCI6MjA3OTk2NDgwNX0.04nyCSgm0_dnD9aAJ_kHpv3OxRVr_V6lkM9-Cu_ZlXA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnostic() {
    const tables = [
        'Leitura',
        'Fechamento',
        'FechamentoFrentista',
        'Produto',
        'MovimentacaoEstoque',
        'Venda',
        'Recebimento',
        'Estoque'
    ];

    console.log("--- DATABASE DIAGNOSTIC ---");
    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`Error counting ${table}:`, error.message);
        } else {
            console.log(`${table}: ${count} rows`);
        }
    }

    // Check query time for Dashboard data (Leitura)
    console.log("\n--- QUERY PERFORMANCE ---");
    const start = Date.now();
    const { data: leituras, error: lError } = await supabase
        .from('Leitura')
        .select(`
            *,
            bico:Bico(
                *,
                combustivel:Combustivel(*),
                bomba:Bomba(*)
            )
        `)
        .limit(100);
    const end = Date.now();
    console.log(`Leitura query (limit 100) took: ${end - start}ms`);
    if (lError) console.error("Leitura query error:", lError.message);

    const startProducts = Date.now();
    const { data: products, error: pError } = await supabase
        .from('Produto')
        .select('*')
        .eq('ativo', true);
    const endProducts = Date.now();
    console.log(`Produto query took: ${endProducts - startProducts}ms`);
    if (pError) console.error("Produto query error:", pError.message);
}

diagnostic();
