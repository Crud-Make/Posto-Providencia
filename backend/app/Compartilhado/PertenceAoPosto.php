<?php

declare(strict_types=1);

namespace App\Compartilhado;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Todo model de domínio com `posto_id` usa este trait.
 *
 * Faz duas coisas, e só duas:
 * 1. escopo global: com {@see PostoAtual} definido, toda consulta ganha `posto_id = <atual>`;
 * 2. ao criar sem `posto_id`, preenche com o posto atual.
 *
 * É o filtro por posto que a RLS nunca teve (mapa de 17/09, §5): nenhuma policy alcançável
 * pelos apps filtrava `posto_id`. `posto_id` NULL é tratado como "não é deste posto".
 *
 * A relação `posto()` fica em cada model, não aqui: trait não carrega relação. O {@see Posto}
 * mora neste mesmo namespace, sem relação de volta — Compartilhado não conhece Domain (Deptrac).
 *
 * @mixin Model
 */
trait PertenceAoPosto
{
    public static function bootPertenceAoPosto(): void
    {
        static::addGlobalScope('posto', function (Builder $consulta): void {
            $posto = app(PostoAtual::class)->id();
            if ($posto !== null) {
                $consulta->where($consulta->qualifyColumn('posto_id'), $posto);
            }
        });

        static::creating(function (Model $model): void {
            if ($model->getAttribute('posto_id') === null) {
                $model->setAttribute('posto_id', app(PostoAtual::class)->id());
            }
        });
    }
}
