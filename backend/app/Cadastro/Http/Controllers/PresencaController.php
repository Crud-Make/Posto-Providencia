<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\PresencasDoPosto;
use App\Cadastro\Http\Resources\PresencaResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final readonly class PresencaController
{
    public function __construct(private PresencasDoPosto $presencas) {}

    public function index(): AnonymousResourceCollection
    {
        return PresencaResource::collection(($this->presencas)());
    }
}
