<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Frentista;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um frentista na tela de escolha do PWA, ANTES do PIN (#101). Só `id` e `nome`: a rota é pública,
 * e nada além do necessário para achar o próprio nome sai dela.
 *
 * @mixin Frentista
 */
final class FrentistaParaEscolherResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'nome' => $this->nome];
    }
}
