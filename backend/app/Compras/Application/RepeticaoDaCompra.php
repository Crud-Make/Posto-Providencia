<?php

declare(strict_types=1);

namespace App\Compras\Application;

use App\Compras\Domain\Compra;
use App\Compras\Domain\RecusaDaCompra;
use Illuminate\Database\Eloquent\Collection;

/**
 * A idempotência do "Salvar" do Registro de Compras, no desenho da do carrinho do PWA:
 *
 * - nenhuma `Compra` com esta chave → `null` (é salvar novo);
 * - compras com esta chave, do MESMO posto, dia e fornecedor, com os MESMOS combustíveis, litros e
 *   valores → é o mesmo salvar chegando de novo: devolve o que foi gravado, `repetido`, e NÃO soma
 *   os litros no estoque outra vez;
 * - qualquer diferença → `chave_reutilizada` (409). A chave é de uma tentativa só.
 *
 * A chave é olhada em TODAS as compras, sem o escopo de posto (o índice é do banco inteiro): a chave
 * de outro posto é conflito, não devolve as linhas dele.
 *
 * Um salvar SEM compra (só régua) não deixa chave: repeti-lo regrava a mesma régua, que é upsert.
 */
final readonly class RepeticaoDaCompra
{
    public function pelaChave(RegistroDeclarado $registro, int $postoId): RegistroGravado|RecusaDaCompra|null
    {
        $linhas = Compra::query()->withoutGlobalScope('posto')->where('chave_compra', $registro->chave)->orderBy('id')->get();

        if ($linhas->isEmpty()) {
            return null;
        }

        return $this->mesmoSalvar($linhas, $registro, $postoId)
            ? new RegistroGravado($linhas, GravaReguaDoPainel::doDia($registro), true)
            : new RecusaDaCompra('chave_reutilizada', 'Esta chave de compra já foi usada para outro registro.');
    }

    /** @param  Collection<int, Compra>  $linhas */
    private function mesmoSalvar(Collection $linhas, RegistroDeclarado $registro, int $postoId): bool
    {
        $pedidas = [];
        foreach ($registro->compras() as $item) {
            $pedidas[$item->combustivelId] = $item;
        }

        if ($linhas->count() !== count($pedidas)) {
            return false;
        }

        return $linhas->every(fn (Compra $linha): bool => $this->mesmaLinha($linha, $pedidas[$linha->combustivel_id] ?? null, $registro, $postoId));
    }

    private function mesmaLinha(Compra $linha, ?ItemDoRegistro $item, RegistroDeclarado $registro, int $postoId): bool
    {
        return $item !== null
            && $item->litros !== null
            && $item->valorTotal !== null
            && $linha->posto_id === $postoId
            && $linha->fornecedor_id === $registro->fornecedorId
            && $linha->data->utc()->format('Y-m-d') === $registro->diaIso()
            && self::igual($linha->valor_total, $item->valorTotal)
            && self::igual($linha->quantidade_litros, self::naColuna($item->litros));
    }

    /** Os litros como `numeric(15,2)` os guardou: metade para longe do zero, na 2ª casa. */
    private static function naColuna(string $litros): string
    {
        return is_numeric($litros) ? bcadd($litros, '0.005', 2) : $litros;
    }

    private static function igual(string $gravado, string $pedido): bool
    {
        return is_numeric($gravado) && is_numeric($pedido) && bccomp($gravado, $pedido, 3) === 0;
    }
}
