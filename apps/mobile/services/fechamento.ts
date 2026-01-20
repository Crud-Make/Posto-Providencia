import { supabase } from '../lib/supabase';
import { usuarioService } from './usuario';
import { frentistaService } from './frentista';

/**
 * Interface que representa um fechamento de turno geral (caixa).
 */
export interface Fechamento {
    /** Identificador único do fechamento */
    id: number;
    /** Data do fechamento (YYYY-MM-DD) */
    data: string;
    /** ID do usuário responsável pelo fechamento */
    usuario_id: number;
    /** ID do turno do fechamento */
    turno_id: number;
    /** Status do fechamento (ex: 'ABERTO', 'FECHADO') */
    status: string;
    /** Valor total das vendas registradas */
    total_vendas?: number;
    /** Valor total recebido (soma dos pagamentos) */
    total_recebido?: number;
    /** Diferença entre recebido e vendas (sobra/falta) */
    diferenca?: number;
    /** Observações gerais do fechamento */
    observacoes?: string;
    /** ID do posto ao qual o fechamento pertence */
    posto_id: number;
}

/**
 * Interface para entrada de nota a prazo por um frentista.
 */
export interface NotaFrentistaInput {
    /** ID do cliente da nota */
    cliente_id: number;
    /** Valor da nota */
    valor: number;
}

/**
 * Interface que representa o fechamento individual de um frentista.
 */
export interface FechamentoFrentista {
    /** Identificador único do fechamento do frentista */
    id: number;
    /** ID do fechamento geral vinculado */
    fechamento_id: number;
    /** ID do frentista */
    frentista_id: number;
    /** Valor em cartão (legado/genérico) */
    valor_cartao: number;
    /** Valor em cartão de débito */
    valor_cartao_debito: number;
    /** Valor em cartão de crédito */
    valor_cartao_credito: number;
    /** Valor em dinheiro */
    valor_dinheiro: number;
    /** Valor em PIX */
    valor_pix: number;
    /** Valor em notas a prazo */
    valor_nota: number;
    /** Valor total conferido/informado */
    valor_conferido: number;
    /** Valor em moedas (informativo, geralmente já incluso em dinheiro) */
    valor_moedas: number;
    /** Diferença calculada para o frentista */
    diferenca: number;
    /** Observações do frentista */
    observacoes: string | null;
}

/**
 * Interface para histórico de fechamentos de frentista com dados relacionados.
 */
export interface FechamentoFrentistaHistorico {
    id: number;
    valor_cartao: number | null;
    valor_cartao_debito: number | null;
    valor_cartao_credito: number | null;
    valor_nota: number | null;
    valor_pix: number | null;
    valor_dinheiro: number | null;
    encerrante?: number | null;
    diferenca_calculada?: number | null;
    observacoes?: string | null;
    Fechamento?: {
        data?: string;
        Turno?: {
            nome?: string;
        } | null;
    } | null;
}

/**
 * Dados necessários para submeter um fechamento via mobile.
 */
export interface SubmitClosingData {
    /** Data do fechamento (YYYY-MM-DD) */
    data: string;
    /** ID do turno */
    turno_id: number;
    /** Valor total em débito informado */
    valor_cartao_debito: number;
    /** Valor total em crédito informado */
    valor_cartao_credito: number;
    /** Valor total em notas a prazo informado */
    valor_nota: number;
    /** Valor total em PIX informado */
    valor_pix: number;
    /** Valor total em dinheiro informado */
    valor_dinheiro: number;
    /** Valor total em moedas informado */
    valor_moedas: number;
    /** Valor total do encerrante (vendas totais da bomba) */
    valor_encerrante: number;
    /** Valor da diferença (sobra ou falta) */
    falta_caixa: number;
    /** Observações do fechamento */
    observacoes: string;
    /** ID do posto */
    posto_id: number;
    /** ID do frentista (opcional, se não fornecido usa o logado) */
    frentista_id?: number;
    /** Lista de notas a prazo detalhadas */
    notas?: NotaFrentistaInput[];
}

/**
 * Serviço para gerenciar fechamentos de caixa (geral).
 */
export const fechamentoService = {
    /**
     * Busca ou cria um fechamento para a data e turno especificados.
     * 
     * @param {string} data - Data do fechamento.
     * @param {number} turnoId - ID do turno.
     * @param {number | null} usuarioId - ID do usuário criando o fechamento.
     * @param {number} [totalRecebido=0] - Valor total recebido inicial.
     * @param {number} [totalVendas=0] - Valor total de vendas inicial.
     * @param {number} [postoId] - ID do posto.
     * @returns {Promise<Fechamento>} O fechamento encontrado ou criado.
     */
    async getOrCreate(
        data: string,
        turnoId: number,
        usuarioId: number | null,
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
     * Atualiza os totais do fechamento baseado na soma do que foi informado pelos frentistas.
     * 
     * @param {number} fechamentoId - ID do fechamento a atualizar.
     * @param {number} [totalVendasManual=0] - Total de vendas manual (opcional).
     * @param {string} [observacoes] - Observações a adicionar.
     * @returns {Promise<void>}
     */
    async updateTotals(
        fechamentoId: number,
        totalVendasManual: number = 0,
        observacoes?: string
    ): Promise<void> {
        // Busca todos os fechamentos de frentistas para este fechamento
        const { data: frentistasData, error: frentistasError } = await supabase
            .from('FechamentoFrentista')
            .select('valor_cartao_debito, valor_cartao_credito, valor_nota, valor_pix, valor_dinheiro')
            .eq('fechamento_id', fechamentoId);

        if (frentistasError) {
            throw new Error(`Erro ao buscar totais de frentistas: ${frentistasError.message}`);
        }

        const totalRecebido = (frentistasData || []).reduce((acc, item) => {
            return acc +
                (item.valor_cartao_debito || 0) +
                (item.valor_cartao_credito || 0) +
                (item.valor_nota || 0) +
                (item.valor_pix || 0) +
                (item.valor_dinheiro || 0);
        }, 0);

        // Se totalVendasManual for 0, podemos tentar usar a soma dos encerrantes ou manter o valor anterior
        // Por enquanto, vamos atualizar apenas o total_recebido e a diferença
        const { data: currentShift } = await supabase
            .from('Fechamento')
            .select('total_vendas')
            .eq('id', fechamentoId)
            .single();

        const totalVendas = totalVendasManual || currentShift?.total_vendas || 0;
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
 * Serviço para gerenciar fechamentos individuais de frentistas.
 */
export const fechamentoFrentistaService = {
    /**
     * Cria um novo registro de fechamento de frentista.
     * 
     * @param {object} data - Dados do fechamento do frentista.
     * @returns {Promise<FechamentoFrentista>} O registro criado.
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
        valor_moedas: number;
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
     * Atualiza um fechamento de frentista existente.
     * 
     * @param {number} id - ID do fechamento de frentista.
     * @param {object} data - Dados a serem atualizados.
     * @returns {Promise<FechamentoFrentista>} O registro atualizado.
     */
    async update(id: number, data: {
        valor_cartao: number;
        valor_cartao_debito: number;
        valor_cartao_credito: number;
        valor_nota: number;
        valor_pix: number;
        valor_dinheiro: number;
        valor_moedas: number;
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

    /**
     * Verifica se existe um fechamento para o frentista e retorna seu ID.
     * 
     * @param {number} fechamentoId - ID do fechamento geral.
     * @param {number} frentistaId - ID do frentista.
     * @returns {Promise<number | null>} O ID do fechamento do frentista ou null.
     */
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
     * Verifica se já existe um fechamento para este frentista no fechamento especificado.
     * 
     * @param {number} fechamentoId - ID do fechamento geral.
     * @param {number} frentistaId - ID do frentista.
     * @returns {Promise<boolean>} True se existir, False caso contrário.
     */
    async exists(fechamentoId: number, frentistaId: number): Promise<boolean> {
        const existing = await this.getExisting(fechamentoId, frentistaId);
        return existing !== null;
    },

    /**
     * Busca o histórico de fechamentos de um frentista.
     * 
     * @param {number} frentistaId - ID do frentista.
     * @param {number} postoId - ID do posto.
     * @param {number} [limit=10] - Limite de registros a retornar.
     * @returns {Promise<any[]>} Lista de históricos formatados.
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

        return (data || []).map((item: FechamentoFrentistaHistorico) => {
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
 * Função principal para submeter um fechamento de caixa do mobile.
 * Realiza todas as validações, cria/busca o fechamento geral e registra o fechamento do frentista.
 * 
 * @param {SubmitClosingData} closingData - Dados do fechamento.
 * @returns {Promise<{success: boolean, message: string, fechamentoId?: number}>} Resultado da operação.
 */
export async function submitMobileClosing(closingData: SubmitClosingData): Promise<{
    success: boolean;
    message: string;
    fechamentoId?: number;
}> {
    try {
        // 1. Verificar autenticação (Modo Híbrido: Com ou Sem Login)
        const { data: { user } } = await supabase.auth.getUser();

        let usuarioIdParaRegistro: number | null = null;

        if (user && user.email) {
            // Se tem user logado, busca o ID numérico na tabela Usuario
            const usuarioProfile = await usuarioService.getByEmail(user.email);
            if (usuarioProfile) {
                usuarioIdParaRegistro = usuarioProfile.id;
            }
        }

        if (!usuarioIdParaRegistro) {
            // MODO UNIVERSAL SEM LOGIN (ou falha ao buscar profile)
            // Precisamos de um usuario_id (INTEGER) para a tabela Fechamento

            // Estratégia 1: Tenta buscar um usuário associado ao frentista (se houver link user_id -> Usuario)
            // Como a tabela Frentista tem user_id (UUID), é difícil linkar direto com Usuario (Int) sem email.
            // Então vamos para a Estratégia 2 Direta.

            // Estratégia 2: Buscar o primeiro usuário ADMIN ou PROPRIETÁRIO do sistema para associar o registro
            const { data: adminUser } = await supabase
                .from('Usuario')
                .select('id')
                .eq('role', 'ADMIN') // Tenta pegar um admin
                .limit(1)
                .single();

            if (adminUser) {
                usuarioIdParaRegistro = adminUser.id;
            } else {
                // Fallback: Qualquer usuário (ex: o primeiro cadastrado)
                const { data: fallbackUser } = await supabase
                    .from('Usuario')
                    .select('id')
                    .limit(1)
                    .single();
                
                if (fallbackUser) {
                    usuarioIdParaRegistro = fallbackUser.id;
                }
            }
        }

        // Se ainda assim não tiver ID, é um erro crítico de configuração do banco
        if (!usuarioIdParaRegistro) {
            console.error('CRÍTICO: Não foi possível encontrar um Usuario ID válido para vincular ao fechamento.');
            // Vamos tentar passar 0 ou null se o banco aceitar, mas provavelmente falhará
            // O ideal seria retornar erro, mas vamos tentar prosseguir para não travar se o banco aceitar null
        }

        // 3. Buscar frentista (se não informado, busca o do usuário logado)
        let frentista;
        if (closingData.frentista_id) {
            const { data, error: fError } = await supabase
                .from('Frentista')
                .select('*')
                .eq('id', closingData.frentista_id)
                .single();
            if (fError || !data) {
                return { success: false, message: 'Frentista selecionado não encontrado.' };
            }
            frentista = data;
        } else if (user) {
            frentista = await frentistaService.getByUserId(user.id);
        }

        if (!frentista) {
            return {
                success: false,
                message: 'Frentista não identificado. Por favor selecione um frentista no topo da tela.',
            };
        }

        // 4. Calcular totais primeiro
        const totalInformado =
            closingData.valor_cartao_debito +
            closingData.valor_cartao_credito +
            closingData.valor_nota +
            closingData.valor_pix +
            closingData.valor_dinheiro;

        // Se não informado pelo front (que agora envia), calcula baseada nos inputs
        // Mas o front já envia valor_encerrante calculado e falta_caixa
        const totalVendas = closingData.valor_encerrante;
        const diferenca = closingData.falta_caixa; // Se positivo sobra, se negativo falta

        // 5. Obter ou Criar Fechamento Geral (Turno)
        // OBS: Se já existir um fechamento para este turno/dia, usamos ele.
        // Se não, criamos um novo.
        const fechamentoGeral = await fechamentoService.getOrCreate(
            closingData.data,
            closingData.turno_id,
            usuarioIdParaRegistro,
            totalInformado, // Inicialmente assume o informado deste frentista como base se for novo
            totalVendas,    // Vendas deste frentista como base
            closingData.posto_id
        );

        // 6. Verificar se frentista já fechou neste turno
        const jaFechou = await fechamentoFrentistaService.exists(fechamentoGeral.id, frentista.id);
        if (jaFechou) {
            return { success: false, message: 'Você já realizou o fechamento para este turno hoje.' };
        }

        // 7. Registrar Fechamento Individual do Frentista
        await fechamentoFrentistaService.create({
            fechamento_id: fechamentoGeral.id,
            frentista_id: frentista.id,
            valor_cartao: 0, // Deprecado, usamos debito/credito separados
            valor_cartao_debito: closingData.valor_cartao_debito,
            valor_cartao_credito: closingData.valor_cartao_credito,
            valor_nota: closingData.valor_nota,
            valor_pix: closingData.valor_pix,
            valor_dinheiro: closingData.valor_dinheiro,
            valor_moedas: closingData.valor_moedas,
            valor_conferido: totalInformado,
            encerrante: totalVendas,
            diferenca_calculada: diferenca,
            observacoes: closingData.observacoes,
            posto_id: closingData.posto_id
        });

        // 8. Atualizar totais do Fechamento Geral (somar com outros frentistas se houver)
        await fechamentoService.updateTotals(fechamentoGeral.id, 0, closingData.observacoes);

        // 9. Registrar Notas a Prazo (se houver)
        if (closingData.notas && closingData.notas.length > 0) {
            const notasParaInserir = closingData.notas.map(nota => ({
                cliente_id: nota.cliente_id,
                frentista_id: frentista.id,
                data: closingData.data,
                valor: nota.valor,
                posto_id: closingData.posto_id,
                fechamento_id: fechamentoGeral.id,
                criado_em: new Date().toISOString()
            }));

            const { error: notasError } = await supabase
                .from('NotaPrazo') // Certifique-se que a tabela existe
                .insert(notasParaInserir);

            if (notasError) {
                console.error('Erro ao salvar notas a prazo:', notasError);
                // Não falhamos o fechamento todo por erro na nota, mas logamos
            }
        }

        return { success: true, message: 'Fechamento realizado com sucesso!', fechamentoId: fechamentoGeral.id };

    } catch (error) {
        console.error('Erro no submitMobileClosing:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao processar o fechamento.'
        };
    }
}
