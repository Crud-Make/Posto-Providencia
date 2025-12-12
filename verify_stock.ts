
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kilndogpsffkgkealkaq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbG5kb2dwc2Zma2drZWFsa2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODg4MDUsImV4cCI6MjA3OTk2NDgwNX0.04nyCSgm0_dnD9aAJ_kHpv3OxRVr_V6lkM9-Cu_ZlXA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyStock() {
    console.log("🔍 Verificando ESTOQUE no Supabase...");
    // Usando a sintaxe correta baseada no api.ts: combustivel:Combustivel
    const { data: estoque, error } = await supabase
        .from('Estoque')
        .select(`
      id,
      quantidade_atual,
      capacidade_tanque,
      combustivel:Combustivel (
        nome,
        codigo,
        preco_venda
      )
    `)
        .order('id');

    if (error) {
        console.error("❌ Erro ao buscar estoque:", error);
        // Tenta uma query mais simples para debug
        console.log("Tentando query simples sem join...");
        const { data: simples } = await supabase.from('Estoque').select('*');
        console.table(simples);
        return;
    }

    console.log("\n📊 SITUAÇÃO ATUAL DO ESTOQUE (Do Banco de Dados):");
    console.table(estoque.map(e => {
        // @ts-ignore
        const comb = e.combustivel;
        return {
            'Produto': comb?.nome || 'N/A',
            'Qtd Atual (L)': e.quantidade_atual,
            '% Tanque': Math.round((e.quantidade_atual / e.capacidade_tanque) * 100) + '%',
            'Preço Venda (R$)': comb?.preco_venda ? `R$ ${comb.preco_venda}` : 'Sem Preço'
        };
    }));

    console.log("\n🔍 Verificando COMPRAS (para verificar custo médio)...");
    const { data: compras, error: errorCompras } = await supabase
        .from('Compra')
        .select(`*`)
        .limit(5);

    if (errorCompras) {
        console.error("❌ Erro buscar compras:", errorCompras);
    } else {
        console.log(`\n📦 COMPRAS REGISTRADAS: ${compras.length}`);
        if (compras.length === 0) {
            console.log("👉 Tabela 'Compra' está VAZIA. Por isso não existe Custo Médio calculado!");
            console.log("   Solução: Registre uma compra na tela 'Custo, Estoque e Venda' para alimentar este dado.");
        }
    }
}

verifyStock();
