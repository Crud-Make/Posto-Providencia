<?php

declare(strict_types=1);

namespace App\Compras\Application;

use App\Compartilhado\JanelaDoBanco;
use App\Compartilhado\PostoAtual;
use App\Compras\Domain\CustoPorLitro;
use App\Compras\Domain\RecusaDaCompra;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * As travas do "Salvar" que no Supabase ou não existiam ou eram policy — e que o Laravel, superuser,
 * não herda. Tudo é conferido ANTES de gravar qualquer linha: o painel de hoje grava combustível por
 * combustível e, quando o terceiro falha, os dois primeiros já ficaram lançados.
 *
 * - fornecedor, combustível e tanque têm de ser DESTE posto (no Supabase não havia trava de posto);
 * - o tanque tem de ser do combustível do item;
 * - com régua a gravar, o dia tem de estar na janela de escrita (policies
 *   `historico_tanque_insert_janela`/`_update_janela`). Compra sozinha não tem janela — a policy
 *   de `Compra` é "Permitir tudo";
 * - o custo por litro tem de caber em `numeric(10,4)` (senão o Postgres recusaria no meio da gravação).
 *
 * `Fornecedor`, `Combustivel` e `Tanque` são de Cadastro: aqui se leem por query builder (CA-7).
 */
final readonly class ConfereRegistro
{
    public function __construct(private PostoAtual $postoAtual) {}

    public function __invoke(RegistroDeclarado $registro): ?RecusaDaCompra
    {
        return $this->fornecedor($registro)
            ?? $this->combustiveis($registro)
            ?? $this->tanques($registro)
            ?? $this->janela($registro)
            ?? $this->custos($registro);
    }

    private function fornecedor(RegistroDeclarado $registro): ?RecusaDaCompra
    {
        if ($registro->compras() === []) {
            return null;
        }

        $fornecedor = $registro->fornecedorId;
        $existe = $fornecedor !== null
            && DB::table('Fornecedor')->where('id', $fornecedor)->where('posto_id', $this->postoId())->exists();

        return $existe ? null : new RecusaDaCompra(
            'fornecedor_invalido',
            $fornecedor === null ? 'Selecione um fornecedor para registrar as compras.' : 'Fornecedor '.$fornecedor.' não é deste posto.',
        );
    }

    private function combustiveis(RegistroDeclarado $registro): ?RecusaDaCompra
    {
        $pedidos = array_map(static fn (ItemDoRegistro $item): int => $item->combustivelId, $registro->itens);
        $doPosto = self::inteiros(DB::table('Combustivel')->where('posto_id', $this->postoId())->whereIn('id', $pedidos)->pluck('id')->all());
        $fora = array_values(array_diff($pedidos, $doPosto));

        return $fora === [] ? null : new RecusaDaCompra('combustivel_invalido', 'Combustível '.$fora[0].' não é deste posto.');
    }

    private function tanques(RegistroDeclarado $registro): ?RecusaDaCompra
    {
        $reguas = $registro->reguas();
        $tanques = DB::table('Tanque')
            ->where('posto_id', $this->postoId())
            ->whereIn('id', array_map(static fn (ItemDoRegistro $item): ?int => $item->tanqueId, $reguas))
            ->get(['id', 'combustivel_id']);
        $doPosto = [];
        foreach ($tanques as $tanque) {
            $doPosto[] = self::inteiros([$tanque->id ?? null, $tanque->combustivel_id ?? null]);
        }

        foreach ($reguas as $item) {
            if (! in_array([$item->tanqueId, $item->combustivelId], $doPosto, true)) {
                return new RecusaDaCompra('tanque_invalido', 'Tanque '.$item->tanqueId.' não é deste posto nem do combustível '.$item->combustivelId.'.');
            }
        }

        return null;
    }

    private function janela(RegistroDeclarado $registro): ?RecusaDaCompra
    {
        if ($registro->reguas() === [] || JanelaDoBanco::aceita($registro->dia)) {
            return null;
        }

        return new RecusaDaCompra(
            'fora_da_janela',
            'O dia '.$registro->dia->utc()->format('d/m/Y').' está fora da janela de escrita da régua (de 31/12/2025 até amanhã).',
        );
    }

    private function custos(RegistroDeclarado $registro): ?RecusaDaCompra
    {
        foreach ($registro->compras() as $item) {
            if ($item->litros !== null && $item->valorTotal !== null
                && ! CustoPorLitro::cabeNaColuna(CustoPorLitro::de($item->valorTotal, $item->litros))) {
                return new RecusaDaCompra('custo_fora_do_limite', 'O custo por litro do combustível '.$item->combustivelId.' passa de R$ 999.999,9999.');
            }
        }

        return null;
    }

    /**
     * @param  array<mixed>  $valores
     * @return list<int>
     */
    private static function inteiros(array $valores): array
    {
        return array_values(array_map(static fn (mixed $valor): int => is_int($valor) ? $valor : (is_numeric($valor) ? (int) $valor : 0), $valores));
    }

    private function postoId(): int
    {
        return $this->postoAtual->id() ?? throw new RuntimeException('ConfereRegistro exige PostoAtual definido.');
    }
}
