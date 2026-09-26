<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\FechamentoFrentista;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * "Quem já enviou hoje" na tela do PWA (#101, fatia 2) — o porte de `buscarEnviosDoDia` do PWA, com
 * uma diferença de propósito: **o valor conferido só sai no envio do PRÓPRIO frentista do token.**
 *
 * A lista existe para o frentista não enviar em dobro e ver em que dia o registro caiu: para isso
 * bastam nome e hora de cada colega. Pelo Supabase o PWA via o `valor_conferido` de todo mundo; pela
 * API, o de outro frentista sai `null` (dado de caixa do B não é do A — pergunta 4 do Design Doc).
 *
 * Os envios são os de {@see SessoesDoDia} (o posto é o `PostoAtual`), em ordem de envio, como no PWA.
 * O nome vem da tabela `Frentista` por query builder: o model é de Cadastro (CA-7).
 */
final readonly class EnviosDoDiaParaOFrentista
{
    public function __construct(private SessoesDoDia $sessoes) {}

    /** @return list<array{id: int, frentista_id: int, frentista: array{nome: string}|null, data_hora_envio: ?string, valor_conferido: ?string}> */
    public function __invoke(CarbonImmutable $dia, int $frentistaDoToken): array
    {
        $envios = ($this->sessoes)($dia)->sortBy([['data_hora_envio', 'asc'], ['id', 'asc']])->values();
        $nomes = DB::table('Frentista')->whereIn('id', $envios->pluck('frentista_id')->unique()->all())->pluck('nome', 'id');

        return array_values($envios->map(static function (FechamentoFrentista $envio) use ($nomes, $frentistaDoToken): array {
            $nome = $nomes->get($envio->frentista_id);

            return [
                'id' => $envio->id,
                'frentista_id' => $envio->frentista_id,
                'frentista' => is_string($nome) ? ['nome' => $nome] : null,
                'data_hora_envio' => $envio->data_hora_envio?->utc()->toIso8601ZuluString(),
                'valor_conferido' => $envio->frentista_id === $frentistaDoToken ? $envio->valor_conferido : null,
            ];
        })->all());
    }
}
