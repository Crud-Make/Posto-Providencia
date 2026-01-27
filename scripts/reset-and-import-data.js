#!/usr/bin/env node

/**
 * Script para zerar o banco de dados e importar dados da planilha Excel
 * Uso: node scripts/reset-and-import-data.js
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Caminho da planilha (pode ser passado como argumento ou usa o padrão)
const PLANILHA_PATH = process.argv[2] || path.join(__dirname, '../docs/data/planilha.xlsx');

/**
 * Função para limpar todas as tabelas do banco
 */
async function limparBancoDeDados() {
    console.log('\n🗑️  Iniciando limpeza do banco de dados...\n');

    const tabelas = [
        // Ordem de exclusão respeitando foreign keys
        'TokenAbastecimento',
        'PromocaoBaratencia',
        'ClienteBaratencia',
        'PushToken',
        'ItemVenda',
        'Venda',
        'RecebimentoFechamento',
        'Fechamento',
        'Leitura',
        'DespesaOperacional',
        'CompraCombustivel',
        'HistoricoTanque',
        'Tanque',
        'Bico',
        'Bomba',
        'Produto',
        'Frentista',
        'UsuarioPosto',
        'Posto',
        'Combustivel',
        'Usuario'
    ];

    for (const tabela of tabelas) {
        try {
            const { error } = await supabase.from(tabela).delete().neq('id', 0);

            if (error) {
                console.log(`⚠️  ${tabela}: ${error.message}`);
            } else {
                console.log(`✅ ${tabela}: Limpa`);
            }
        } catch (err) {
            console.log(`⚠️  ${tabela}: ${err.message}`);
        }
    }

    console.log('\n✨ Limpeza concluída!\n');
}

/**
 * Função para ler a planilha Excel
 */
function lerPlanilha() {
    console.log('📊 Lendo planilha Excel...\n');

    try {
        const workbook = XLSX.readFile(PLANILHA_PATH);
        const sheetNames = workbook.SheetNames;

        console.log(`📄 Abas encontradas: ${sheetNames.join(', ')}\n`);

        const dados = {};

        for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            dados[sheetName] = jsonData;
            console.log(`   ${sheetName}: ${jsonData.length} registros`);
        }

        return dados;
    } catch (error) {
        console.error('❌ Erro ao ler planilha:', error.message);
        process.exit(1);
    }
}

/**
 * Função para inserir dados no banco
 */
async function inserirDados(dados) {
    console.log('\n📥 Iniciando importação de dados...\n');

    // 1. Inserir Usuários
    if (dados['Usuarios'] && dados['Usuarios'].length > 0) {
        console.log('👤 Inserindo Usuários...');
        const usuarios = dados['Usuarios'].map(u => ({
            email: u.email || u.Email,
            nome: u.nome || u.Nome,
            senha: u.senha || 'senha123', // Senha padrão se não informada
            role: u.role || u.Role || 'OPERADOR',
            ativo: u.ativo !== undefined ? u.ativo : true
        }));

        const { data, error } = await supabase.from('Usuario').insert(usuarios).select();
        if (error) {
            console.error('❌ Erro ao inserir usuários:', error.message);
        } else {
            console.log(`✅ ${data.length} usuários inseridos`);
        }
    }

    // 2. Inserir Combustíveis
    if (dados['Combustiveis'] && dados['Combustiveis'].length > 0) {
        console.log('⛽ Inserindo Combustíveis...');
        const combustiveis = dados['Combustiveis'].map(c => ({
            nome: c.nome || c.Nome,
            codigo: c.codigo || c.Codigo,
            cor: c.cor || c.Cor || '#000000',
            preco_venda: parseFloat(c.preco_venda || c.PrecoVenda || 0),
            ativo: c.ativo !== undefined ? c.ativo : true
        }));

        const { data, error } = await supabase.from('Combustivel').insert(combustiveis).select();
        if (error) {
            console.error('❌ Erro ao inserir combustíveis:', error.message);
        } else {
            console.log(`✅ ${data.length} combustíveis inseridos`);
        }
    }

    // 3. Inserir Postos
    if (dados['Postos'] && dados['Postos'].length > 0) {
        console.log('🏪 Inserindo Postos...');
        const postos = dados['Postos'].map(p => ({
            nome: p.nome || p.Nome,
            endereco: p.endereco || p.Endereco,
            telefone: p.telefone || p.Telefone,
            cnpj: p.cnpj || p.CNPJ,
            ativo: p.ativo !== undefined ? p.ativo : true
        }));

        const { data, error } = await supabase.from('Posto').insert(postos).select();
        if (error) {
            console.error('❌ Erro ao inserir postos:', error.message);
        } else {
            console.log(`✅ ${data.length} postos inseridos`);
        }
    }

    // 4. Inserir Frentistas
    if (dados['Frentistas'] && dados['Frentistas'].length > 0) {
        console.log('👨‍🔧 Inserindo Frentistas...');

        // Buscar posto_id (assumindo que existe pelo menos 1 posto)
        const { data: postos } = await supabase.from('Posto').select('id').limit(1);
        const postoId = postos && postos.length > 0 ? postos[0].id : null;

        if (!postoId) {
            console.error('❌ Nenhum posto encontrado para associar frentistas');
        } else {
            const frentistas = dados['Frentistas'].map(f => ({
                nome: f.nome || f.Nome,
                cpf: f.cpf || f.CPF,
                telefone: f.telefone || f.Telefone,
                posto_id: postoId,
                ativo: f.ativo !== undefined ? f.ativo : true
            }));

            const { data, error } = await supabase.from('Frentista').insert(frentistas).select();
            if (error) {
                console.error('❌ Erro ao inserir frentistas:', error.message);
            } else {
                console.log(`✅ ${data.length} frentistas inseridos`);
            }
        }
    }

    // 5. Inserir Produtos
    if (dados['Produtos'] && dados['Produtos'].length > 0) {
        console.log('📦 Inserindo Produtos...');

        const { data: postos } = await supabase.from('Posto').select('id').limit(1);
        const postoId = postos && postos.length > 0 ? postos[0].id : null;

        if (!postoId) {
            console.error('❌ Nenhum posto encontrado para associar produtos');
        } else {
            const produtos = dados['Produtos'].map(p => ({
                nome: p.nome || p.Nome,
                codigo: p.codigo || p.Codigo,
                preco_venda: parseFloat(p.preco_venda || p.PrecoVenda || 0),
                preco_custo: parseFloat(p.preco_custo || p.PrecoCusto || 0),
                estoque: parseInt(p.estoque || p.Estoque || 0),
                posto_id: postoId,
                ativo: p.ativo !== undefined ? p.ativo : true
            }));

            const { data, error } = await supabase.from('Produto').insert(produtos).select();
            if (error) {
                console.error('❌ Erro ao inserir produtos:', error.message);
            } else {
                console.log(`✅ ${data.length} produtos inseridos`);
            }
        }
    }

    console.log('\n✨ Importação concluída!\n');
}

/**
 * Função principal
 */
async function main() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  🔄 RESET E IMPORTAÇÃO DE DADOS           ║');
    console.log('║  Posto Providência - Sistema de Gestão    ║');
    console.log('╚════════════════════════════════════════════╝');

    try {
        // Passo 1: Limpar banco
        await limparBancoDeDados();

        // Passo 2: Ler planilha
        const dados = lerPlanilha();

        // Passo 3: Inserir dados
        await inserirDados(dados);

        console.log('╔════════════════════════════════════════════╗');
        console.log('║  ✅ PROCESSO CONCLUÍDO COM SUCESSO!       ║');
        console.log('╚════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('\n❌ Erro durante o processo:', error);
        process.exit(1);
    }
}

// Executar
main();
