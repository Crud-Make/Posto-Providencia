import { supabase } from '../lib/supabase';

export const api = {
    // Buscar Frentistas do Posto Ativo
    async getFrentistas(postoId: number) {
        const { data, error } = await supabase
            .from('Frentista')
            .select('id, nome')
            .eq('posto_id', postoId)
            .eq('ativo', true)
            .order('nome');

        if (error) throw new Error(error.message);
        return data;
    },

    // Identificar ou Criar um Fechamento Diário Consolidador
    async getOrCreateFechamento(postoId: number, dataStr: string, turnoId: number, usuarioId: number = 1) {
        // 1. Tentar achar o fechamento desse turno nesse dia
        const { data: fechamentos, error: fetchError } = await supabase
            .from('Fechamento')
            .select('id')
            .eq('posto_id', postoId)
            .eq('data', dataStr)
            .eq('turno_id', turnoId);

        if (fetchError) throw new Error(fetchError.message);

        // Se já existe, retorna o ID dele
        if (fechamentos && fechamentos.length > 0) {
            return fechamentos[0].id;
        }

        // Se não existir, Cria o Fechamento principal zerado
        const { data: novoFechamento, error: insertError } = await supabase
            .from('Fechamento')
            .insert({
                posto_id: postoId,
                data: dataStr,
                turno_id: turnoId,
                total_vendas: 0,
                total_recebido: 0,
                diferenca: 0,
                status: 'pendente',
                usuario_id: usuarioId
            })
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);
        return novoFechamento.id;
    },

    // Enviar os dados do Frentista para a tabela
    async submitFrentistaClosing(payload: any) {
        const { data, error } = await supabase
            .from('FechamentoFrentista')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
};
