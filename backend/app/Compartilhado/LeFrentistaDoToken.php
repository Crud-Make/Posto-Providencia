<?php

declare(strict_types=1);

namespace App\Compartilhado;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Para os FormRequests das rotas do PWA do frentista (#101): o frentista do TOKEN, que o middleware
 * `frentista.do.posto` deixou nos atributos da requisição como inteiro. É daqui — e nunca do corpo
 * nem da query — que sai de quem é o dado lido ou gravado: o frentista A não lê nem grava como o B.
 *
 * Mora em Compartilhado porque três módulos têm rota do frentista (Cadastro, Fechamento, Estoque) e
 * nenhum módulo depende de outro. Lê o primitivo, sem conhecer classe de Pessoas.
 *
 * @phpstan-require-extends FormRequest
 */
trait LeFrentistaDoToken
{
    public function frentistaId(): int
    {
        $id = $this->attributes->get('frentista_id');

        return is_int($id) ? $id : abort(500, 'Guard fora de ordem: sem frentista.');
    }
}
