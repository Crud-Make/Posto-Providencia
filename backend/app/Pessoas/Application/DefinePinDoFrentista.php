<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Pessoas\Domain\AcessoFrentista;
use Illuminate\Support\Facades\DB;

/**
 * Define (ou troca) o PIN de um frentista — é o que o comando `frentista:pin` chama (#101).
 *
 * O PIN é de 4 a 6 dígitos e vai para o banco só como hash (cast `hashed` do
 * {@see AcessoFrentista}). Trocar o PIN derruba as sessões abertas daquele frentista: quem trocou
 * porque o PIN vazou não quer o token antigo valendo até o fim do turno.
 */
final readonly class DefinePinDoFrentista
{
    /** 4 a 6 dígitos: curto para digitar com a mão suja de combustível, e só dígito no teclado numérico. */
    public const string FORMATO = '/^\d{4,6}$/';

    /** @return bool `false` quando o PIN está fora do formato ou o frentista não existe (nada é gravado) */
    public function __invoke(int $frentistaId, string $pin): bool
    {
        if (preg_match(self::FORMATO, $pin) !== 1 || ! DB::table('Frentista')->where('id', $frentistaId)->exists()) {
            return false;
        }

        DB::transaction(function () use ($frentistaId, $pin): void {
            $acesso = AcessoFrentista::query()->find($frentistaId) ?? new AcessoFrentista(['frentista_id' => $frentistaId]);
            $acesso->fill(['pin_hash' => $pin])->save();
            $acesso->tokens()->delete();
        });

        return true;
    }
}
