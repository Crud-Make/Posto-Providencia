import { supabase } from './supabase';

// ============================================
// TIPOS
// ============================================

export interface Posto {
    id: number;
    nome: string;
    cnpj: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    telefone: string | null;
    email: string | null;
    ativo: boolean;
}

/**
 * Serviço para gerenciar postos
 */
export const postoService = {
    async getAll(): Promise<Posto[]> {
        const { data, error } = await supabase
            .from('Posto')
            .select('*')
            .eq('ativo', true)
            .order('nome');

        if (error) {
            console.error('Error fetching postos:', error);
            return [];
        }
        return data || [];
    },

    async getById(id: number): Promise<Posto | null> {
        const { data, error } = await supabase
            .from('Posto')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching posto:', error);
            return null;
        }
        return data;
    }
};

export interface Frentista {
    id: number;
    nome: string;
    cpf: string | null;
    telefone: string | null;
    data_admissao: string | null;
    ativo: boolean;
    user_id: string | null;
    turno_id?: number | null;
    posto_id: number;
}

export interface Turno {
    id: number;
    nome: string;
    horario_inicio: string;
    horario_fim: string;
}

export interface Usuario {
    id: number;
    nome: string;
    email: string;
    role: string;
    posto_id?: number;
}

export interface Fechamento {
    id: number;
    data: string;
    usuario_id: string;
    turno_id: number;
    status: string;
    total_vendas?: number;
    total_recebido?: number;
    diferenca?: number;
    observacoes?: string;
    posto_id: number;
}

export interface Cliente {
    id: number;
    nome: string;
    documento?: string;
    posto_id?: number;
    ativo: boolean;
}

export interface NotaFrentistaInput {
    cliente_id: number;
    valor: number;
}

export interface FechamentoFrentista {
    id: number;
    fechamento_id: number;
    frentista_id: number;
    valor_cartao: number;
    valor_cartao_debito: number;
    valor_cartao_credito: number;
    valor_dinheiro: number;
    valor_pix: number;
    valor_nota: number;
    valor_conferido: number;
    diferenca: number;
    observacoes: string | null;
}

export interface SubmitClosingData {
    data: string;
    turno_id: number;
    valor_cartao_debito: number;
    valor_cartao_credito: number;
    valor_nota: number;
    valor_pix: number;
    valor_dinheiro: number;
    valor_encerrante: number;
    falta_caixa: number;
    observacoes: string;
    posto_id: number;
    notas?: NotaFrentistaInput[];
}

// ============================================
// SERVIÇOS
// ============================================

/**
 * Busca o frentista associado ao usuário logado
 */
export const frentistaService = {
    async getByUserId(userId: string): Promise<Frentista | null> {
        const { data, error } = await supabase
            .from('Frentista')
            .select('*')
            .eq('user_id', userId)
            .eq('ativo', true)
            .single();

        if (error) {
            console.error('Error fetching frentista:', error);
            return null;
        }

        return data;
    },

    async update(id: number, updates: Partial<Frentista>): Promise<Frentista | null> {
        const { data, error } = await supabase
            .from('Frentista')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating frentista:', error);
            return null;
        }
        return data;
    },
};

/**
 * Busca o perfil de usuário na tabela Usuario
 */
export const usuarioService = {
    async getByEmail(email: string): Promise<Usuario | null> {
        const { data, error } = await supabase
            .from('Usuario')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }

        return data;
    },
};

/**
 * Serviço para gerenciar clientes
 */
export const clienteService = {
    async getAll(postoId?: number): Promise<Cliente[]> {
        let query = supabase
            .from('Cliente')
            .select('*')
            .eq('ativo', true);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.order('nome');

        if (error) {
            console.error('Error fetching clientes:', error);
            return [];
        }

        return data || [];
    },

    async search(text: string, postoId?: number): Promise<Cliente[]> {
        let query = supabase
            .from('Cliente')
            .select('*')
            .eq('ativo', true)
            .ilike('nome', `%${text}%`);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.limit(20);

        if (error) {
            console.error('Error searching clientes:', error);
            return [];
        }

        return data || [];
    }
};

/**
 * Busca turnos disponíveis
 */
export const turnoService = {
    async getAll(postoId?: number): Promise<Turno[]> {
        let query = supabase
            .from('Turno')
            .select('*');

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.order('horario_inicio');

        if (error) {
            console.error('Error fetching turnos:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Identifica o turno atual baseado na hora
     */
    async getCurrentTurno(postoId?: number): Promise<Turno | null> {
        const turnos = await this.getAll(postoId);
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Encontra o turno que contém a hora atual
        for (const turno of turnos) {
            const start = turno.horario_inicio;
            const end = turno.horario_fim;

            // Caso especial: turno da noite que cruza meia-noite
            if (start > end) {
                if (currentTime >= start || currentTime < end) {
                    return turno;
                }
            } else {
                if (currentTime >= start && currentTime < end) {
                    return turno;
                }
            }
        }

        return turnos[0] || null; // Fallback para primeiro turno
    },
};

/**
 * Gerencia fechamentos de caixa
 */
export const fechamentoService = {
    /**
     * Busca ou cria um fechamento para a data e turno especificados
     */
    async getOrCreate(
        data: string,
        turnoId: number,
        usuarioId: number,
        totalRecebido: number = 0,
        totalVendas: number = 0,
        postoId?: number
    ): Promise<Fechamento> {
        // Primeiro tenta buscar um fechamento existente
        let query = supabase
            .from('Fechamento')
            .select('*')
            .eq('data', data)
            .eq('turno_id', turnoId);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data: existing, error: searchError } = await query.single();

        if (existing && !searchError) {
            return existing;
        }

        // Se não existe, cria um novo com totais
        const { data: created, error: createError } = await supabase
            .from('Fechamento')
            .insert({
                data,
                turno_id: turnoId,
                usuario_id: usuarioId,
                status: 'FECHADO',
                total_recebido: totalRecebido,
                total_vendas: totalVendas,
                diferenca: totalRecebido - totalVendas,
                posto_id: postoId
            })
            .select()
            .single();

        if (createError) {
            throw new Error(`Erro ao criar fechamento: ${createError.message}`);
        }

        return created;
    },

    /**
     * Atualiza os totais do fechamento
     */
    async updateTotals(
        fechamentoId: number,
        totalRecebido: number,
        totalVendas: number,
        observacoes?: string
    ): Promise<void> {
        const diferenca = totalRecebido - totalVendas;

        const { error } = await supabase
            .from('Fechamento')
            .update({
                total_recebido: totalRecebido,
                total_vendas: totalVendas,
                diferenca,
                status: 'FECHADO',
                observacoes,
            })
            .eq('id', fechamentoId);

        if (error) {
            throw new Error(`Erro ao atualizar fechamento: ${error.message}`);
        }
    },
};

/**
 * Gerencia fechamentos individuais de frentistas
 */
export const fechamentoFrentistaService = {
    /**
     * Cria um fechamento de frentista
     */
    async create(data: {
        fechamento_id: number;
        frentista_id: number;
        valor_cartao: number;
        valor_cartao_debito: number;
        valor_cartao_credito: number;
        valor_nota: number;
        valor_pix: number;
        valor_dinheiro: number;
        valor_conferido: number;
        encerrante?: number;
        diferenca_calculada?: number;
        observacoes?: string;
        posto_id?: number;
    }): Promise<FechamentoFrentista> {
        const { data: created, error } = await supabase
            .from('FechamentoFrentista')
            .insert(data)
            .select()
            .single();

        if (error) {
            throw new Error(`Erro ao criar fechamento frentista: ${error.message}`);
        }

        return created;
    },

    /**
     * Atualiza um fechamento de frentista existente
     */
    async update(id: number, data: {
        valor_cartao: number;
        valor_cartao_debito: number;
        valor_cartao_credito: number;
        valor_nota: number;
        valor_pix: number;
        valor_dinheiro: number;
        valor_conferido: number;
        encerrante?: number;
        diferenca_calculada?: number;
        observacoes?: string;
    }): Promise<FechamentoFrentista> {
        const { data: updated, error } = await supabase
            .from('FechamentoFrentista')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Erro ao atualizar fechamento frentista: ${error.message}`);
        }

        return updated;
    },

    async getExisting(fechamentoId: number, frentistaId: number): Promise<number | null> {
        const { data, error } = await supabase
            .from('FechamentoFrentista')
            .select('id')
            .eq('fechamento_id', fechamentoId)
            .eq('frentista_id', frentistaId)
            .single();

        if (error || !data) return null;
        return data.id;
    },

    /**
     * Verifica se já existe um fechamento para este frentista no fechamento especificado
     */
    async exists(fechamentoId: number, frentistaId: number): Promise<boolean> {
        const existing = await this.getExisting(fechamentoId, frentistaId);
        return existing !== null;
    },

    /**
     * Busca histórico de fechamentos do frentista
     */
    async getHistorico(frentistaId: number, postoId: number, limit = 10): Promise<{
        id: number;
        data: string;
        turno: string;
        totalInformado: number;
        encerrante: number;
        diferenca: number;
        status: 'ok' | 'divergente';
        observacoes?: string;
    }[]> {
        const { data, error } = await supabase
            .from('FechamentoFrentista')
            .select(`
                *,
                fechamento:fechamento_id (
                    data,
                    turno:turno_id (nome)
                )
            `)
            .eq('frentista_id', frentistaId)
            .eq('posto_id', postoId)
            .order('id', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Erro ao buscar histórico:', error);
            return [];
        }

        return (data || []).map((item: any) => {
            const totalInformado = (item.valor_cartao || 0) + (item.valor_nota || 0) + (item.valor_pix || 0) + (item.valor_dinheiro || 0);
            // Se valor_cartao for 0 mas tiver debito/credito, usa eles
            const cartaoReal = (item.valor_cartao || 0) || ((item.valor_cartao_debito || 0) + (item.valor_cartao_credito || 0));
            const totalCorrigido = cartaoReal + (item.valor_nota || 0) + (item.valor_pix || 0) + (item.valor_dinheiro || 0);
            const encerrante = item.encerrante || 0;
            const diferenca = item.diferenca_calculada || (encerrante - totalInformado);

            return {
                id: item.id,
                data: item.Fechamento?.data || '',
                turno: item.Fechamento?.Turno?.nome || 'N/A',
                totalInformado: totalCorrigido,
                encerrante,
                diferenca,
                status: diferenca === 0 ? 'ok' as const : 'divergente' as const,
                observacoes: item.observacoes || undefined,
            };
        });
    },
};

/**
 * Função principal para submeter um fechamento de caixa do mobile
 */
export async function submitMobileClosing(closingData: SubmitClosingData): Promise<{
    success: boolean;
    message: string;
    fechamentoId?: number;
}> {
    try {
        // 1. Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return {
                success: false,
                message: 'Usuário não autenticado. Por favor, faça login novamente.',
            };
        }

        // 2. Buscar perfil do usuário na tabela Usuario
        const usuario = await usuarioService.getByEmail(user.email!);
        if (!usuario) {
            return {
                success: false,
                message: 'Perfil de usuário não encontrado no sistema.',
            };
        }

        // 3. Buscar frentista associado ao usuário
        const frentista = await frentistaService.getByUserId(user.id);

        if (!frentista) {
            return {
                success: false,
                message: 'Frentista não encontrado. Entre em contato com o administrador.',
            };
        }

        // 4. Calcular totais primeiro
        const totalInformado =
            closingData.valor_cartao_debito +
            closingData.valor_cartao_credito +
            closingData.valor_nota +
            closingData.valor_pix +
            closingData.valor_dinheiro;

        const postoId = frentista.posto_id;

        const valorCartaoTotal = closingData.valor_cartao_debito + closingData.valor_cartao_credito;

        const valorConferido = totalInformado - closingData.falta_caixa;
        const diferenca = closingData.falta_caixa; // Diferença é a falta

        // 5. Buscar ou criar fechamento do dia/turno (agora com totais)
        const fechamento = await fechamentoService.getOrCreate(
            closingData.data,
            closingData.turno_id,
            usuario.id,
            totalInformado, // total_recebido
            totalInformado, // total_vendas (mesmo valor por enquanto)
            postoId
        );

        // 6. Verificar se este frentista já enviou fechamento
        const existingFrentistaClosing = await fechamentoFrentistaService.getExisting(
            fechamento.id,
            frentista.id
        );

        // Debug: Mostrar valores que serão salvos
        console.log('=== DEBUG SUBMISSÃO ===');
        console.log('closingData recebido:', closingData);
        console.log('totalInformado:', totalInformado);
        console.log('valorCartaoTotal:', valorCartaoTotal);
        console.log('valorConferido:', valorConferido);
        console.log('===');

        let fechamentoFrentistaId: number;

        if (existingFrentistaClosing) {
            // Atualiza o registro existente com os novos valores
            const updated = await fechamentoFrentistaService.update(existingFrentistaClosing, {
                valor_cartao: valorCartaoTotal,
                valor_cartao_debito: closingData.valor_cartao_debito,
                valor_cartao_credito: closingData.valor_cartao_credito,
                valor_nota: closingData.valor_nota,
                valor_pix: closingData.valor_pix,
                valor_dinheiro: closingData.valor_dinheiro,
                valor_conferido: valorConferido,
                encerrante: closingData.valor_encerrante,
                diferenca_calculada: closingData.valor_encerrante - totalInformado,
                observacoes: closingData.observacoes || undefined,
            });
            fechamentoFrentistaId = updated.id;
        } else {
            // 7. Criar fechamento do frentista
            const created = await fechamentoFrentistaService.create({
                fechamento_id: fechamento.id,
                frentista_id: frentista.id,
                posto_id: closingData.posto_id,
                valor_cartao: valorCartaoTotal,
                valor_cartao_debito: closingData.valor_cartao_debito,
                valor_cartao_credito: closingData.valor_cartao_credito,
                valor_nota: closingData.valor_nota,
                valor_pix: closingData.valor_pix,
                valor_dinheiro: closingData.valor_dinheiro,
                valor_conferido: valorConferido,
                encerrante: closingData.valor_encerrante,
                diferenca_calculada: closingData.valor_encerrante - totalInformado,
                observacoes: closingData.observacoes || undefined,
            });
            fechamentoFrentistaId = created.id;
        }

        // Salvar notas se houver
        if (closingData.notas && closingData.notas.length > 0) {
            const notasParaInserir = closingData.notas.map(nota => ({
                fechamento_frentista_id: fechamentoFrentistaId,
                frentista_id: frentista.id,
                cliente_id: nota.cliente_id,
                valor: nota.valor,
                posto_id: postoId,
                status: 'pendente',
                data: closingData.data
            }));

            const { error: errorNotas } = await supabase
                .from('NotaFrentista')
                .insert(notasParaInserir);

            if (errorNotas) {
                console.error('Erro ao salvar notas individuais:', errorNotas);
            }
        }

        // 8. Atualizar totais do fechamento geral
        // Nota: Aqui estamos assumindo que o total de vendas será atualizado depois
        // quando o gestor fizer o fechamento completo no painel
        await fechamentoService.updateTotals(
            fechamento.id,
            totalInformado,
            fechamento.total_vendas || 0,
            closingData.observacoes
        );

        // 9. Atualizar turno atual do frentista
        await frentistaService.update(frentista.id, {
            turno_id: closingData.turno_id
        });

        return {
            success: true,
            message: existingFrentistaClosing ? 'Fechamento atualizado com sucesso!' : 'Fechamento enviado com sucesso!',
            fechamentoId: fechamento.id,
        };
    } catch (error) {
        console.error('Error submitting mobile closing:', error);
        return {
            success: false,
            message: `Erro ao enviar fechamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        };
    }
}

// ============================================
// NOVOS SERVIÇOS (Vendas e Escala)
// ============================================

export interface Produto {
    id: number;
    nome: string;
    preco_venda: number;
    estoque_atual: number;
    categoria: string;
    ativo: boolean;
}

export interface Escala {
    id: number;
    frentista_id: number;
    data: string;
    tipo: 'FOLGA' | 'TRABALHO';
    turno_id?: number | null;
    observacao?: string | null;
}

export interface VendaProduto {
    id: number;
    frentista_id: number;
    produto_id: number;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    data: string;
    fechamento_frentista_id?: number;
    Produto?: { nome: string };
}

export const produtoService = {
    async getAll(postoId?: number) {
        let query = supabase
            .from('Produto')
            .select('*')
            .eq('ativo', true);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.order('nome');
        if (error) throw error;
        return data as Produto[];
    },

    async getById(id: number) {
        const { data, error } = await supabase.from('Produto').select('*').eq('id', id).single();
        if (error) throw error;
        return data as Produto;
    }
};

export const vendaProdutoService = {
    async create(venda: {
        frentista_id: number,
        produto_id: number,
        quantidade: number,
        valor_unitario: number,
        posto_id?: number
    }) {
        const valor_total = venda.quantidade * venda.valor_unitario;

        // 1. Insert Venda
        const { data, error } = await supabase.from('VendaProduto').insert({
            frentista_id: venda.frentista_id,
            produto_id: venda.produto_id,
            quantidade: venda.quantidade,
            valor_unitario: venda.valor_unitario,
            valor_total: valor_total,
            posto_id: venda.posto_id || 1
        }).select().single();

        if (error) throw error;

        // 2. Decrement Stock
        const { data: prod } = await supabase.from('Produto').select('estoque_atual').eq('id', venda.produto_id).single();
        if (prod) {
            const newStock = (prod.estoque_atual || 0) - venda.quantidade;
            await supabase.from('Produto').update({ estoque_atual: newStock }).eq('id', venda.produto_id);

            // 3. Register Movement
            await supabase.from('MovimentacaoEstoque').insert({
                produto_id: venda.produto_id,
                tipo: 'SAIDA',
                quantidade: venda.quantidade,
                observacao: `Venda Mobile (ID: ${data.id})`,
                responsavel: `Frentista ID ${venda.frentista_id}`
            });
        }

        return data;
    },

    async getByFrentistaToday(frentistaId: number) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('VendaProduto')
            .select('*, Produto(nome)')
            .eq('frentista_id', frentistaId)
            .gte('data', start.toISOString())
            .lte('data', end.toISOString())
            .order('data', { ascending: false });

        if (error) throw error;
        return data as VendaProduto[];
    }
};

export const escalaService = {
    async getMyNextFolga(frentistaId: number) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('Escala')
            .select('*')
            .eq('frentista_id', frentistaId)
            .eq('tipo', 'FOLGA')
            .gte('data', today)
            .order('data', { ascending: true })
            .limit(1);

        if (error) throw error;
        return data?.[0] as Escala | undefined;
    },

    async getMyUpcomingFolgas(frentistaId: number) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('Escala')
            .select('*')
            .eq('frentista_id', frentistaId)
            .eq('tipo', 'FOLGA')
            .gte('data', today)
            .order('data', { ascending: true })
            .limit(5);

        if (error) throw error;
        return data as Escala[];
    }
}
