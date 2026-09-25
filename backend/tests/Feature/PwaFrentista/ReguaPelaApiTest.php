<?php

declare(strict_types=1);

use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\Tanque;
use App\Compartilhado\Posto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\withToken;

require_once __DIR__.'/Cenario.php';

/*
|--------------------------------------------------------------------------
| Régua dos tanques pelo PWA, pela API (#101, fatia 2)
|--------------------------------------------------------------------------
| O que se prende aqui: o upsert por (tanque, dia) substitui, como no PWA; a janela de escrita da
| policy vale no servidor; o tanque tem de ser do posto (no Supabase não havia essa trava); as
| medições do dia são só as dos tanques do posto (o PWA de hoje lê as de todos os postos).
*/

function tanqueDoPwa(Posto $posto, string $combustivel = 'Gasolina Comum'): Tanque
{
    $comb = Combustivel::factory()->create(['posto_id' => $posto->id, 'nome' => $combustivel, 'codigo' => 'G'.$posto->id]);

    return Tanque::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $comb->id]);
}

/** @return array<string, mixed> */
function medicao(Tanque $tanque, string $volume = '5000', string $data = DIA_PWA): array
{
    return ['tanque_id' => $tanque->id, 'data' => $data, 'volume_fisico' => $volume];
}

it('lista os tanques do posto, por id, com nome e código do combustível', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $tanque = tanqueDoPwa($posto);
    ['posto' => $outro] = postoDoPwa();
    tanqueDoPwa($outro);

    withToken(tokenDoFrentista($posto, $frentista))->getJson("/api/postos/{$posto->id}/regua/tanques")
        ->assertOk()
        ->assertExactJson(['data' => [['id' => $tanque->id, 'combustivel' => ['nome' => 'Gasolina Comum', 'codigo' => 'G'.$posto->id]]]]);
});

it('grava a medição, e medir de novo no mesmo dia SUBSTITUI (upsert por tanque e dia)', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $tanque = tanqueDoPwa($posto);
    $token = tokenDoFrentista($posto, $frentista);

    withToken($token)->putJson("/api/postos/{$posto->id}/regua/medicoes", medicao($tanque, '5000'))
        ->assertOk()
        ->assertExactJson(['data' => ['tanque_id' => $tanque->id, 'data' => DIA_PWA, 'volume_fisico' => '5000.00']]);
    DB::table('HistoricoTanque')->where('tanque_id', $tanque->id)->update(['volume_livro' => '4990.00']);
    withToken($token)->putJson("/api/postos/{$posto->id}/regua/medicoes", medicao($tanque, '4800.5'))
        ->assertOk()
        ->assertJsonPath('data.volume_fisico', '4800.50');
    withToken($token)->putJson("/api/postos/{$posto->id}/regua/medicoes", medicao($tanque, '4800.5'))->assertOk();

    $linhas = DB::table('HistoricoTanque')->where('tanque_id', $tanque->id)->get();
    expect($linhas)->toHaveCount(1)
        ->and((array) $linhas[0])->toMatchArray(['volume_fisico' => '4800.50', 'volume_livro' => '4990.00']);

    withToken($token)->getJson("/api/postos/{$posto->id}/regua/medicoes?data=".DIA_PWA)
        ->assertExactJson(['data' => [['tanque_id' => $tanque->id, 'data' => DIA_PWA, 'volume_fisico' => '4800.50']]]);
});

it('fora da janela de escrita é 422 fora_da_janela e nada é gravado', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $tanque = tanqueDoPwa($posto);
    $token = tokenDoFrentista($posto, $frentista);

    foreach (['2025-12-30', now('UTC')->addDays(2)->format('Y-m-d')] as $dia) {
        withToken($token)->putJson("/api/postos/{$posto->id}/regua/medicoes", medicao($tanque, '100', $dia))
            ->assertUnprocessable()
            ->assertJsonPath('erro.codigo', 'fora_da_janela');
    }

    withToken($token)->putJson("/api/postos/{$posto->id}/regua/medicoes", medicao($tanque, '100', now('UTC')->addDay()->format('Y-m-d')))->assertOk();
    expect(DB::table('HistoricoTanque')->where('tanque_id', $tanque->id)->count())->toBe(1);
});

it('isolamento: tanque de OUTRO posto é 422 tanque_invalido, e a medição dele não aparece aqui', function (): void {
    ['posto' => $jorro, 'frentista' => $frentista] = postoDoPwa();
    tanqueDoPwa($jorro);
    ['posto' => $br] = postoDoPwa();
    $doBr = tanqueDoPwa($br);
    DB::table('HistoricoTanque')->insert(['tanque_id' => $doBr->id, 'data' => DIA_PWA, 'volume_fisico' => '777.00']);
    $token = tokenDoFrentista($jorro, $frentista);

    withToken($token)->putJson("/api/postos/{$jorro->id}/regua/medicoes", medicao($doBr, '1'))
        ->assertUnprocessable()
        ->assertJsonPath('erro.codigo', 'tanque_invalido');
    withToken($token)->getJson("/api/postos/{$jorro->id}/regua/medicoes?data=".DIA_PWA)->assertExactJson(['data' => []]);
    withToken($token)->putJson("/api/postos/{$br->id}/regua/medicoes", medicao($doBr, '1'))->assertForbidden();

    expect(DB::table('HistoricoTanque')->where('tanque_id', $doBr->id)->value('volume_fisico'))->toBe('777.00');
});

it('volume fora do CHECK (negativo, número JSON, acima do teto) é 422 corpo_invalido', function (mixed $volume): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $tanque = tanqueDoPwa($posto);

    withToken(tokenDoFrentista($posto, $frentista))
        ->putJson("/api/postos/{$posto->id}/regua/medicoes", ['tanque_id' => $tanque->id, 'data' => DIA_PWA, 'volume_fisico' => $volume])
        ->assertUnprocessable()
        ->assertJsonPath('erro.codigo', 'corpo_invalido');
})->with([
    'negativo' => ['-1'],
    'número JSON' => [5000],
    'acima do teto' => ['100000000'],
    'três casas' => ['1.234'],
    'nulo' => [null],
]);

it('isolamento das rotas da régua: sem token 401, token de gerente 401, frentista de outro posto 403', function (string $metodo, string $caminho): void {
    exigeFrentistaDoPosto($metodo, $caminho, ['tanque_id' => 1, 'data' => DIA_PWA, 'volume_fisico' => '1']);
})->with([
    'tanques' => ['GET', 'regua/tanques'],
    'medições do dia' => ['GET', 'regua/medicoes?data='.DIA_PWA],
    'gravar medição' => ['PUT', 'regua/medicoes'],
]);
