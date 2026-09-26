<?php

declare(strict_types=1);

namespace App\Estoque\Http\Requests;

use App\Estoque\Application\MesDoPainel;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `GET /api/postos/{posto}/tanques/painel?mes=AAAA-MM&historico_desde=AAAA-MM-DD` (painel-pela-api.md §11).
 *
 * Os dois dias vêm do cliente, como hoje: o mês corrente e "30 dias atrás" são do relógio LOCAL do
 * painel (`hojeIso`, `paraIsoLocal`), e o servidor roda em UTC. Autorização fica na rota.
 */
final class PainelDeTanquesRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'mes' => ['required', 'date_format:Y-m'],
            'historico_desde' => ['required', 'date_format:Y-m-d'],
        ];
    }

    public function mes(): MesDoPainel
    {
        return MesDoPainel::de($this->string('mes')->toString());
    }

    public function historicoDesde(): string
    {
        return $this->string('historico_desde')->toString();
    }
}
