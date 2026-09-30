<?php

declare(strict_types=1);

use App\Cadastro\Domain\Fornecedor;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\json;
use function Pest\Laravel\withToken;

require_once __DIR__.'/../PwaFrentista/Cenario.php';

/*
|--------------------------------------------------------------------------
| Cadastro de fornecedores pelo painel (#103)
|--------------------------------------------------------------------------
| Achado do ensaio Jorro+BR (30/09/2026): o Posto BR não tinha fornecedor e a API só LIA a lista —
| nenhuma compra podia ser registrada no posto novo. O posto é o da rota; o CNPJ é conferido pelos
| DV (numérico ou alfanumérico) e é único no posto; desativar é `ativo: false`; nada se apaga.
*/

/** Um CNPJ válido diferente a cada chamada (base aleatória + DV calculado). */
function cnpjFn(): string
{
    $base = str_pad((string) random_int(10_000_000, 99_999_999), 8, '0', STR_PAD_LEFT).'0001';
    foreach ([0, 1] as $_) {
        $soma = 0;
        $peso = strlen($base) - 7;
        foreach (str_split($base) as $c) {
            $soma += ((int) $c) * $peso;
            $peso = $peso === 2 ? 9 : $peso - 1;
        }
        $base .= ($soma % 11) < 2 ? '0' : (string) (11 - $soma % 11);
    }

    return $base;
}

/**
 * @param  array<string, mixed>  $troca
 * @return array<string, mixed>
 */
function corpoDeFornecedorFn(array $troca = []): array
{
    return array_merge(['nome' => 'Distribuidora Sertão', 'cnpj' => cnpjFn(), 'contato' => '(75) 99999-0000', 'ativo' => true], $troca);
}

function fornecedorFn(Posto $posto, string $cnpj = '11.222.333/0001-81', bool $ativo = true): Fornecedor
{
    return Fornecedor::factory()->create(['posto_id' => $posto->id, 'cnpj' => $cnpj, 'nome' => 'Fornecedor antigo', 'ativo' => $ativo]);
}

it('sem token 401, operador 403 e gerente de OUTRO posto 403 — e nada muda', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $antigo = fornecedorFn($br);
    $pedidos = [
        ['POST', "/api/postos/{$br->id}/fornecedores", corpoDeFornecedorFn()],
        ['PUT', "/api/postos/{$br->id}/fornecedores/{$antigo->id}", corpoDeFornecedorFn(['nome' => 'Invasor'])],
    ];

    foreach ($pedidos as [$metodo, $url, $corpo]) {
        json($metodo, $url, $corpo)->assertUnauthorized();
    }
    $doJorro = tokenDoGerente($jorro);
    foreach ($pedidos as [$metodo, $url, $corpo]) {
        withToken($doJorro)->json($metodo, $url, $corpo)->assertForbidden();
    }
    app('auth')->forgetGuards();

    $email = 'op.fn.'.bin2hex(random_bytes(3)).'@teste.com';
    $operador = Usuario::factory()->create(['email' => $email, 'role' => Role::Operador, 'senha' => 'senha-do-operador-1']);
    UsuarioPosto::factory()->create(['usuario_id' => $operador->id, 'posto_id' => $br->id, 'role' => PapelNoPosto::Operador]);
    $token = Pest\Laravel\postJson('/api/login', ['email' => $email, 'senha' => 'senha-do-operador-1'])->json('token');
    withToken(is_string($token) ? $token : '')->postJson("/api/postos/{$br->id}/fornecedores", corpoDeFornecedorFn())->assertForbidden();

    expect(DB::table('Fornecedor')->where('posto_id', $br->id)->count())->toBe(1)
        ->and(DB::table('Fornecedor')->where('id', $antigo->id)->value('nome'))->toBe('Fornecedor antigo');
});

it('cria no posto da ROTA (posto_id do corpo é ignorado), com o CNPJ formatado e o contato', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $outro] = postoDoPwa();

    $resposta = withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/fornecedores", [
        'nome' => ' Distribuidora Sertão ', 'cnpj' => '11222333000181', 'contato' => ' (75) 3275-0000 ', 'ativo' => true, 'posto_id' => $outro->id,
    ]);

    $resposta->assertCreated()
        ->assertJsonPath('data.nome', 'Distribuidora Sertão')
        ->assertJsonPath('data.cnpj', '11.222.333/0001-81')
        ->assertJsonPath('data.contato', '(75) 3275-0000')
        ->assertJsonPath('data.ativo', true);
    expect(DB::table('Fornecedor')->where('id', $resposta->json('data.id'))->value('posto_id'))->toBe($br->id);
});

it('aceita o CNPJ ALFANUMÉRICO (IN RFB 2.229/2024) e guarda em maiúsculas', function (): void {
    ['posto' => $br] = postoDoPwa();

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/fornecedores", corpoDeFornecedorFn(['cnpj' => '12abc34501de35']))
        ->assertCreated()->assertJsonPath('data.cnpj', '12.ABC.345/01DE-35');
});

it('CNPJ com DV errado, tamanho errado ou todo igual é 422 cnpj_invalido — e nada é gravado', function (string $cnpj): void {
    ['posto' => $br] = postoDoPwa();

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/fornecedores", corpoDeFornecedorFn(['cnpj' => $cnpj]))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'cnpj_invalido');
    expect(DB::table('Fornecedor')->where('posto_id', $br->id)->count())->toBe(0);
})->with([
    'DV errado' => ['11.222.333/0001-82'],
    'curto' => ['11.222.333/0001'],
    'todo zero' => ['00.000.000/0000-00'],
    'letra no DV' => ['12ABC34501DEA5'],
]);

it('CNPJ repetido no posto é 422 cnpj_repetido — mesmo escrito sem máscara e mesmo inativo; em OUTRO posto passa', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    fornecedorFn($br, '11222333000181', false); // cadastro antigo, sem pontuação e inativo

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/fornecedores", corpoDeFornecedorFn(['cnpj' => '11.222.333/0001-81']))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'cnpj_repetido');
    app('auth')->forgetGuards();
    withToken(tokenDoGerente($jorro))->postJson("/api/postos/{$jorro->id}/fornecedores", corpoDeFornecedorFn(['cnpj' => '11.222.333/0001-81']))
        ->assertCreated();
});

it('edita nome, contato e desativa; o próprio CNPJ não conta como repetido', function (): void {
    ['posto' => $br] = postoDoPwa();
    $antigo = fornecedorFn($br);

    withToken(tokenDoGerente($br))->putJson("/api/postos/{$br->id}/fornecedores/{$antigo->id}", [
        'nome' => 'Nome novo', 'cnpj' => '11.222.333/0001-81', 'contato' => null, 'ativo' => false,
    ])->assertOk()->assertJsonPath('data.nome', 'Nome novo')->assertJsonPath('data.contato', null)->assertJsonPath('data.ativo', false);

    expect(DB::table('Fornecedor')->where('id', $antigo->id)->value('ativo'))->toBeFalse();
});

it('trocar para o CNPJ de OUTRO fornecedor do posto é 422 cnpj_repetido', function (): void {
    ['posto' => $br] = postoDoPwa();
    fornecedorFn($br, '11.222.333/0001-81');
    $segundo = fornecedorFn($br, '12.ABC.345/01DE-35');

    withToken(tokenDoGerente($br))->putJson("/api/postos/{$br->id}/fornecedores/{$segundo->id}", corpoDeFornecedorFn(['cnpj' => '11222333000181']))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'cnpj_repetido');
    expect(DB::table('Fornecedor')->where('id', $segundo->id)->value('cnpj'))->toBe('12.ABC.345/01DE-35');
});

it('fornecedor de OUTRO posto pela rota deste é 404, e ele não muda', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $doJorro = fornecedorFn($jorro);

    withToken(tokenDoGerente($br))->putJson("/api/postos/{$br->id}/fornecedores/{$doJorro->id}", corpoDeFornecedorFn(['nome' => 'Invasor']))
        ->assertNotFound();
    expect(DB::table('Fornecedor')->where('id', $doJorro->id)->value('nome'))->toBe('Fornecedor antigo');
});

it('recusa de forma é 422 corpo_invalido', function (array $troca): void {
    ['posto' => $br] = postoDoPwa();

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/fornecedores", corpoDeFornecedorFn($troca))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'corpo_invalido');
})->with([
    'sem nome' => [['nome' => '']],
    'sem CNPJ' => [['cnpj' => '']],
    'CNPJ em número' => [['cnpj' => 11222333000181]],
    'ativo em string' => [['ativo' => 'true']],
    'nome longo demais' => [['nome' => str_repeat('x', 81)]],
]);

it('o fornecedor criado já serve para registrar a compra no posto (o que travava no ensaio)', function (): void {
    ['posto' => $br] = postoDoPwa();
    $id = withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/fornecedores", corpoDeFornecedorFn())->json('data.id');

    $lista = withToken(tokenDoGerente($br))->getJson("/api/postos/{$br->id}/fornecedores")->assertOk()->json('data');
    expect(collect(is_array($lista) ? $lista : [])->pluck('id')->all())->toContain($id);
});
