import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kilndogpsffkgkealkaq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbG5kb2dwc2Zma2drZWFsa2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODg4MDUsImV4cCI6MjA3OTk2NDgwNX0.04nyCSgm0_dnD9aAJ_kHpv3OxRVr_V6lkM9-Cu_ZlXA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFechamentoSave() {
    console.log('🔍 Testando salvamento de Fechamento...\n');

    // 1. Testar criação de um fechamento de teste
    const testData = {
        data: '2026-01-01',
        usuario_id: 1,
        turno_id: 1,
        status: 'RASCUNHO',
        posto_id: 1,
        diferenca: 0,
        total_recebido: 0,
        total_vendas: 0
    };

    console.log('📋 Dados de teste:', testData);

    try {
        console.log('\n✨ Tentando criar fechamento...');
        const { data: created, error: createError } = await supabase
            .from('Fechamento')
            .insert(testData)
            .select()
            .single();

        if (createError) {
            console.error('❌ ERRO ao criar:', createError);
            console.error('Código:', createError.code);
            console.error('Mensagem:', createError.message);
            console.error('Detalhes:', createError.details);
            console.error('Hint:', createError.hint);

            // Verificar políticas RLS
            console.log('\n🔒 Verificando políticas RLS...');
            const { data: policies, error: policiesError } = await supabase
                .rpc('get_policies', { table_name: 'Fechamento' })
                .select();

            if (policiesError) {
                console.log('⚠️  Não foi possível verificar políticas RLS');
            } else {
                console.log('Políticas:', policies);
            }

            return;
        }

        console.log('✅ Fechamento criado com sucesso!');
        console.log('ID:', created.id);

        // 2. Testar atualização
        console.log('\n🔄 Tentando atualizar fechamento...');
        const { data: updated, error: updateError } = await supabase
            .from('Fechamento')
            .update({ status: 'FECHADO', total_vendas: 100 })
            .eq('id', created.id)
            .select()
            .single();

        if (updateError) {
            console.error('❌ ERRO ao atualizar:', updateError);
            return;
        }

        console.log('✅ Fechamento atualizado com sucesso!');
        console.log('Status:', updated.status);

        // 3. Limpar teste
        console.log('\n🧹 Limpando dados de teste...');
        const { error: deleteError } = await supabase
            .from('Fechamento')
            .delete()
            .eq('id', created.id);

        if (deleteError) {
            console.error('⚠️  Erro ao limpar:', deleteError);
        } else {
            console.log('✅ Dados de teste removidos');
        }

        console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO! O banco está funcionando corretamente.');

    } catch (err) {
        console.error('❌ ERRO CRÍTICO:', err);
    }

    // 4. Verificar se existem fechamentos para 2026-01-01
    console.log('\n📊 Verificando fechamentos existentes para 2026-01-01...');
    const { data: existing, error: queryError } = await supabase
        .from('Fechamento')
        .select('*')
        .gte('data', '2026-01-01T00:00:00')
        .lte('data', '2026-01-01T23:59:59');

    if (queryError) {
        console.error('❌ Erro ao buscar:', queryError);
    } else {
        console.log(`Encontrados ${existing?.length || 0} fechamentos`);
        if (existing && existing.length > 0) {
            console.log('Fechamentos:', existing);
        }
    }
}

testFechamentoSave();
