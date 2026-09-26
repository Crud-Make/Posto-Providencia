import type { ResultAsync } from 'neverthrow';
import { hojeIso } from '@posto/utils';
import { conferirDepoisDeGravar, executar, supabase, validar, type ErroDeApi } from '@frentista/shared/api';
import {
  listaDeProdutosSchema,
  vendaCriadaSchema,
  vendasDeHojeSchema,
  type NovaVenda,
  type Produto,
  type VendaCriada,
  type VendaDeHoje,
} from '../model/schema';

/** Produtos ativos do posto, por nome. */
export function buscarProdutosAtivos(postoId: number): ResultAsync<Produto[], ErroDeApi> {
  return executar(() =>
    supabase
      .from('Produto')
      .select('id, nome, preco_venda, estoque_atual, categoria, unidade_medida')
      .eq('posto_id', postoId)
      .eq('ativo', true)
      .order('nome'),
  )
    .andThen(validar(listaDeProdutosSchema, 'Produto (ativos do posto)'))
    .map((linhas) => linhas ?? []);
}

/**
 * Registra uma venda de produto pelo frentista.
 *
 * @remarks `data` é o instante real (`toISOString()`, UTC) — coluna de INSTANTE, não de
 *          calendário. É por isso que `buscarVendasDeHoje` recorta em meia-noite local.
 *
 *          O formato da linha devolvida NUNCA derruba a venda já gravada (revisão do lote 1,
 *          22/09/2026): a tela mostraria erro e o frentista registraria a venda de novo —
 *          venda e baixa de estoque em dobro. Fora do formato vira aviso no console e `Ok(null)`.
 * @returns A venda criada, ou `null` se o banco a devolveu fora do formato.
 */
export function registrarVenda(venda: NovaVenda): ResultAsync<VendaCriada | null, ErroDeApi> {
  return executar(() =>
    supabase
      .from('VendaProduto')
      .insert({
        ...venda,
        data: new Date().toISOString(),
      })
      .select()
      .single(),
  ).map(conferirDepoisDeGravar(vendaCriadaSchema, 'VendaProduto (registrada)'));
}

/** Vendas de produtos de hoje do frentista, da mais nova para a mais antiga. */
export function buscarVendasDeHoje(frentistaId: number): ResultAsync<VendaDeHoje[], ErroDeApi> {
  // `VendaProduto.data` é gravada com `toISOString()` (instante UTC real). O
  // recorte precisa ser a meia-noite LOCAL convertida para UTC: com `T00:00:00Z`
  // sobre a data local, uma venda às 21h30 (00h30Z do dia seguinte) caía fora de "hoje".
  const inicio = new Date(`${hojeIso()}T00:00:00`);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return executar(() =>
    supabase
      .from('VendaProduto')
      .select(`
        id, quantidade, valor_unitario, valor_total, data,
        produto:Produto(nome, categoria)
      `)
      .eq('frentista_id', frentistaId)
      .gte('data', inicio.toISOString())
      .lt('data', fim.toISOString())
      .order('data', { ascending: false }),
  )
    .andThen(validar(vendasDeHojeSchema, 'VendaProduto (de hoje)'))
    .map((linhas) => linhas ?? []);
}
