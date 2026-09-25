<?php

declare(strict_types=1);

namespace App\Estoque\Http\Requests;

use App\Compartilhado\LeFrentistaDoToken;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `GET /api/postos/{posto}/vendas?inicio=…&fim=…` — instantes ISO-8601 (o PWA manda a meia-noite
 * LOCAL de hoje e a de amanhã, em UTC). No máximo 2 dias de janela: é a tela "vendas de hoje", não
 * relatório.
 */
final class VendasDoFrentistaRequest extends FormRequest
{
    use LeFrentistaDoToken;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'inicio' => ['required', 'date'],
            'fim' => ['required', 'date', 'after:inicio', 'before_or_equal:'.$this->limite()],
        ];
    }

    public function inicio(): CarbonImmutable
    {
        return new CarbonImmutable($this->string('inicio')->toString());
    }

    public function fim(): CarbonImmutable
    {
        return new CarbonImmutable($this->string('fim')->toString());
    }

    private function limite(): string
    {
        $inicio = strtotime($this->string('inicio')->toString());

        return $inicio === false ? 'inicio' : gmdate('Y-m-d\TH:i:s\Z', $inicio + 2 * 86400);
    }
}
