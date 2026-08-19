import { supabase } from '../lib/supabase';
import { criarAcessoEncerrante } from '@posto/api-core';

/**
 * Tudo que o app do dono faz contra o banco.
 *
 * @remarks É a mesma implementação que o PWA do frentista usa — vem inteira de
 *          `packages/api-core`, não é cópia. Estas operações escrevem `Leitura`
 *          e reconsolidam `Fechamento.total_vendas`/`diferenca`; duas versões
 *          divergindo produziriam dois números para o mesmo dia, e é sobre esse
 *          número que se cobra o caixa do frentista.
 *
 *          O cliente é injetado aqui porque a configuração (`.env`, auth) é de
 *          cada app.
 */
export const api = criarAcessoEncerrante(supabase);
