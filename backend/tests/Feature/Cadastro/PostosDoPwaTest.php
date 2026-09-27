<?php

declare(strict_types=1);

use App\Compartilhado\Posto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;

/*
|--------------------------------------------------------------------------
| A escolha do posto no PWA do frentista (#101, decisão do dono de 26/09/2026)
|--------------------------------------------------------------------------
| `GET /api/postos` é pública (vem antes do PIN) e por isso expõe o mínimo: `id` e `nome` dos postos
| ATIVOS, por id. O que se prende: inativo não sai, cnpj/endereço/telefone/e-mail não saem, sem token
| responde 200, a ordem é por id (não por nome nem por inserção).
|
| Cada teste desativa os postos que o banco local já traz (seed de cadastros) DENTRO da transação do
| `DatabaseTransactions`: assim a resposta é exata e o rollback devolve o banco como estava.
*/

function soOsPostosDoTeste(): void
{
    DB::table('Posto')->update(['ativo' => false]);
}

it('é pública: sem token responde 200 com id e nome dos postos ATIVOS', function (): void {
    soOsPostosDoTeste();
    $jorro = Posto::factory()->create(['nome' => 'Posto Jorro']);
    $br = Posto::factory()->create(['nome' => 'Posto BR']);
    Posto::factory()->create(['nome' => 'Posto Fechado', 'ativo' => false]);

    getJson('/api/postos')
        ->assertOk()
        ->assertExactJson(['data' => [
            ['id' => $jorro->id, 'nome' => 'Posto Jorro'],
            ['id' => $br->id, 'nome' => 'Posto BR'],
        ]]);
});

it('não expõe nada do cadastro do posto além de id e nome', function (): void {
    soOsPostosDoTeste();
    $br = Posto::factory()->create([
        'nome' => 'Posto BR',
        'cnpj' => '12.345.678/0001-90',
        'endereco' => 'Rua do Posto, 100',
        'cidade' => 'Tucano',
        'telefone' => '75999990000',
        'email' => 'contato@posto-br.test',
    ]);

    $resposta = getJson('/api/postos')->assertOk();

    expect($resposta->json('data'))->toBe([['id' => $br->id, 'nome' => 'Posto BR']]);
    $corpo = (string) $resposta->getContent();
    foreach (['12.345.678/0001-90', 'Rua do Posto', 'Tucano', '75999990000', 'posto-br.test', 'cnpj', 'email', 'telefone', 'ativo'] as $sensivel) {
        expect($corpo)->not->toContain($sensivel);
    }
});

it('ordena por id, não pelo nome', function (): void {
    soOsPostosDoTeste();
    $primeiro = Posto::factory()->create(['nome' => 'Zeta']);
    $segundo = Posto::factory()->create(['nome' => 'Alfa']);

    expect(getJson('/api/postos')->assertOk()->json('data.*.id'))->toBe([$primeiro->id, $segundo->id]);
});

it('sem posto ativo devolve lista vazia, não erro', function (): void {
    soOsPostosDoTeste();

    getJson('/api/postos')->assertOk()->assertExactJson(['data' => []]);
});
