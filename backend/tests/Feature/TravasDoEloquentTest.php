<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bomba;
use App\Compartilhado\Posto;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\MissingAttributeException;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Http\Client\StrayRequestException;
use Illuminate\Support\Facades\Http;

/*
| Canários das travas de runtime (AppServiceProvider::boot e Tests\TestCase::setUp).
| Cada teste faz de propósito o que a trava proíbe e exige a exceção. Se alguém desligar a
| trava, o teste falha — em vez de o erro silencioso voltar sem ninguém notar.
*/

// Sujeito é Bomba→bicos porque Posto (Compartilhado) não tem relação de saída. Sem PostoAtual
// definido, o escopo não filtra e o creating grava posto_id NULL, que a coluna aceita.
it('lazy loading em coleção lança (N+1)', function (): void {
    Bomba::factory()->count(2)->create();

    $bombas = Bomba::query()->get();

    expect(fn () => $bombas->first()?->bicos)->toThrow(LazyLoadingViolationException::class);
});

it('ler coluna que ficou fora do select lança em vez de devolver null', function (): void {
    $criado = Posto::factory()->create();

    $parcial = Posto::query()->select('id')->findOrFail($criado->id);

    expect(fn () => $parcial->nome)->toThrow(MissingAttributeException::class);
});

it('campo fora do $fillable lança em vez de sumir do INSERT', function (): void {
    expect(fn () => new Posto(['nome' => 'Posto X', 'coluna_que_nao_existe' => 1]))
        ->toThrow(MassAssignmentException::class);
});

it('HTTP sem Http::fake() lança em vez de sair para a rede', function (): void {
    expect(fn () => Http::get('https://graph.facebook.com/v1/mensagens'))
        ->toThrow(StrayRequestException::class);
});
