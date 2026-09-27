<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Pessoas\Domain\RecusaDoPrimeiroAcesso;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * O PRIMEIRO ACESSO do frentista no PWA (#101, decisão do dono de 27/09/2026): cada frentista cria a
 * própria chave (PIN). Zerar continua sendo do gerente (`frentista:pin`, {@see DefinePinDoFrentista}).
 *
 * Só grava se o frentista é DESTE posto, está ativo e ainda não tem linha em `AcessoFrentista`. A
 * criação é ATÔMICA pelo PK `frentista_id`: `INSERT … ON CONFLICT DO NOTHING` (o `insertOrIgnore`),
 * não "confere e depois insere" — dois pedidos simultâneos para o mesmo frentista não gravam dois
 * PINs: o segundo não insere nada e recebe `ja_tem_chave`, e o hash do primeiro fica.
 *
 * O sucesso já devolve a sessão, pela MESMA emissão do login ({@see EntrarComoFrentista}) — não há
 * segundo lugar que emita token de frentista.
 */
final readonly class CriaChaveDoFrentista
{
    public function __construct(private EntrarComoFrentista $entrar) {}

    /**
     * @param  string  $pin  já no formato {@see DefinePinDoFrentista::FORMATO} e confirmado (FormRequest)
     * @return array{token: string, vence_em: CarbonImmutable, frentista: array{id: int, nome: string}}|RecusaDoPrimeiroAcesso
     */
    public function __invoke(int $postoId, int $frentistaId, string $pin): array|RecusaDoPrimeiroAcesso
    {
        $doPosto = DB::table('Frentista')
            ->where('id', $frentistaId)
            ->where('posto_id', $postoId)
            ->where('ativo', true)
            ->exists();

        if (! $doPosto) {
            return RecusaDoPrimeiroAcesso::naoEncontrado();
        }

        $agora = CarbonImmutable::now();
        $criou = DB::table('AcessoFrentista')->insertOrIgnore([
            'frentista_id' => $frentistaId,
            'pin_hash' => Hash::make($pin),
            'createdAt' => $agora,
            'updatedAt' => $agora,
        ]);

        if ($criou === 0) {
            return RecusaDoPrimeiroAcesso::jaTemChave();
        }

        // `null` só se o frentista foi desativado entre as duas linhas: a chave fica, a sessão não.
        return ($this->entrar)($postoId, $frentistaId, $pin) ?? RecusaDoPrimeiroAcesso::naoEncontrado();
    }
}
