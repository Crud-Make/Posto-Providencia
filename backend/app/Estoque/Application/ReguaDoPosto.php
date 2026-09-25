<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Compartilhado\PostoAtual;
use App\Estoque\Domain\MedicaoDeTanque;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * A tela de régua do PWA pela API (#101, fatia 2): os tanques do posto e as medições já gravadas num
 * dia — o porte de `buscarTanques` e `buscarMedicoesDoDia`.
 *
 * `Tanque` e `Combustivel` são de Cadastro: aqui se leem por query builder, só as colunas que a tela
 * usa (CA-7). `HistoricoTanque` não tem `posto_id`, então as medições são filtradas pelos tanques do
 * posto — o PWA de hoje lê as medições do dia de TODOS os postos (`.eq('data', …)` sem posto).
 */
final readonly class ReguaDoPosto
{
    public function __construct(private PostoAtual $postoAtual) {}

    /** @return list<array{id: int, combustivel: array{nome: string, codigo: ?string}|null}> */
    public function tanques(): array
    {
        return array_values(DB::table('Tanque')
            ->leftJoin('Combustivel', 'Combustivel.id', '=', 'Tanque.combustivel_id')
            ->where('Tanque.posto_id', $this->postoId())
            ->orderBy('Tanque.id')
            ->get(['Tanque.id', 'Combustivel.nome', 'Combustivel.codigo'])
            ->map(static fn (object $linha): array => self::tanque((array) $linha))
            ->all());
    }

    /** @return Collection<int, MedicaoDeTanque> */
    public function medicoes(CarbonImmutable $dia): Collection
    {
        return MedicaoDeTanque::query()
            ->whereIn('tanque_id', $this->idsDosTanques())
            ->where('data', $dia->utc()->format('Y-m-d'))
            ->orderBy('tanque_id')
            ->get();
    }

    public function tanqueEhDoPosto(int $tanqueId): bool
    {
        return $this->idsDosTanques()->where('id', $tanqueId)->exists();
    }

    private function idsDosTanques(): Builder
    {
        return DB::table('Tanque')->select('id')->where('posto_id', $this->postoId());
    }

    private function postoId(): int
    {
        return $this->postoAtual->id() ?? throw new RuntimeException('ReguaDoPosto exige PostoAtual definido.');
    }

    /**
     * @param  array<string, mixed>  $linha
     * @return array{id: int, combustivel: array{nome: string, codigo: ?string}|null}
     */
    private static function tanque(array $linha): array
    {
        $id = $linha['id'];
        $nome = $linha['nome'];
        $codigo = $linha['codigo'];

        return [
            'id' => is_int($id) ? $id : (int) (is_numeric($id) ? $id : 0),
            'combustivel' => is_string($nome) ? ['nome' => $nome, 'codigo' => is_string($codigo) ? $codigo : null] : null,
        ];
    }
}
