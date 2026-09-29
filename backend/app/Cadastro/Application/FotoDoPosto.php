<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Compartilhado\Posto;
use Illuminate\Support\Carbon;

/**
 * A foto da fachada do posto (decisão do dono, 27/09/2026): o gerente ou admin do posto troca pelo
 * painel; os cartões da tela de entrada e a escolha de posto do PWA mostram.
 *
 * A foto mora no banco como data URL JPEG (CHECK `posto_foto_tamanho`, banco/init/13). Quem a
 * mostra NÃO recebe o data URL: recebe o {@see caminho()} da rota pública, versionado por
 * `foto_atualizada_em`, e a rota devolve os bytes do JPEG com cache eterno — foto nova, URL nova.
 */
final readonly class FotoDoPosto
{
    public const string PREFIXO = 'data:image/jpeg;base64,';

    /** Grava (ou, com `null`, remove) a foto e carimba a versão. Devolve o caminho público. */
    public function troca(int $postoId, ?string $foto): ?string
    {
        $posto = Posto::query()->findOrFail($postoId);
        $posto->foto = $foto;
        $posto->foto_atualizada_em = $foto === null ? null : Carbon::now();
        $posto->save();

        return self::caminho($posto->id, $posto->foto_atualizada_em);
    }

    /** Os bytes do JPEG de um posto ATIVO, ou `null` se não há posto, ativo ou foto. */
    public function jpeg(int $postoId): ?string
    {
        $foto = Posto::query()->whereKey($postoId)->where('ativo', true)->value('foto');
        if (! is_string($foto) || ! str_starts_with($foto, self::PREFIXO)) {
            return null;
        }

        $bytes = base64_decode(substr($foto, strlen(self::PREFIXO)), strict: true);

        return $bytes === false || $bytes === '' ? null : $bytes;
    }

    /** `/api/postos/{id}/foto?v={unix}` — ou `null` quando o posto não tem foto. */
    public static function caminho(int $postoId, ?Carbon $atualizadaEm): ?string
    {
        return $atualizadaEm === null ? null : '/api/postos/'.$postoId.'/foto?v='.$atualizadaEm->getTimestamp();
    }
}
