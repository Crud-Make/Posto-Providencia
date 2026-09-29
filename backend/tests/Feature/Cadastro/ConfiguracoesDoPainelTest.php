<?php

declare(strict_types=1);

use App\Cadastro\Domain\FormaPagamento;
use App\Compartilhado\Posto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\json;
use function Pest\Laravel\withToken;

require_once __DIR__.'/../PwaFrentista/Cenario.php';

/*
|--------------------------------------------------------------------------
| Configurações do painel pela API (#103): formas de pagamento e parâmetros
|--------------------------------------------------------------------------
| Porte do que a tela gravava no Supabase (`useFormaPagamento`, `useParametros`): criar, editar e
| desativar forma de pagamento (nome, tipo, taxa em %, ativo); ler e salvar a tolerância de
| divergência e os dias de estoque crítico/baixo. O que muda por ser multi-tenant: o posto é o da
| rota (o INSERT do Supabase caía no posto 1 sem posto ativo), e salvar parâmetro é UPSERT por
| (chave, posto) — o UPDATE puro do Supabase falhava num posto sem as linhas, como o BR.
*/

/** Forma de pagamento do `$posto` (fora do escopo de qualquer PostoAtual). */
function formaCf(Posto $posto, string $nome = 'Pix', bool $ativo = true): FormaPagamento
{
    return FormaPagamento::factory()->create(['posto_id' => $posto->id, 'nome' => $nome, 'tipo' => 'venda', 'taxa' => 0, 'ativo' => $ativo]);
}

/**
 * @param  array<string, mixed>  $troca
 * @return array<string, mixed>
 */
function corpoDeFormaCf(array $troca = []): array
{
    return array_merge(['nome' => 'Crédito', 'tipo' => 'cartao_credito', 'taxa' => '3.50', 'ativo' => true], $troca);
}

/**
 * @param  array<string, mixed>  $troca
 * @return array<string, mixed>
 */
function corpoDeParametrosCf(array $troca = []): array
{
    return array_merge(['tolerancia_divergencia' => '50.00', 'dias_estoque_critico' => 3, 'dias_estoque_baixo' => 7], $troca);
}

/**
 * Os parâmetros gravados do posto, como o banco os tem.
 *
 * @return array<array-key, mixed>
 */
function parametrosCf(Posto $posto): array
{
    return DB::table('Configuracao')->where('posto_id', $posto->id)->orderBy('chave')->pluck('valor', 'chave')->all();
}

it('sem token 401, operador 403 e gerente de OUTRO posto 403 — e nada muda', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $forma = formaCf($br);
    $pedidos = [
        ['POST', "/api/postos/{$br->id}/formas-pagamento", corpoDeFormaCf()],
        ['PUT', "/api/postos/{$br->id}/formas-pagamento/{$forma->id}", corpoDeFormaCf(['nome' => 'Invasora'])],
        ['GET', "/api/postos/{$br->id}/parametros", []],
        ['PUT', "/api/postos/{$br->id}/parametros", corpoDeParametrosCf()],
    ];

    foreach ($pedidos as [$metodo, $url, $corpo]) {
        json($metodo, $url, $corpo)->assertUnauthorized();
    }
    $doJorro = tokenDoGerente($jorro);
    foreach ($pedidos as [$metodo, $url, $corpo]) {
        withToken($doJorro)->json($metodo, $url, $corpo)->assertForbidden();
    }

    expect(DB::table('FormaPagamento')->where('posto_id', $br->id)->pluck('nome')->all())->toBe(['Pix'])
        ->and(parametrosCf($br))->toBe([]);
});

it('cria forma de pagamento no posto da rota — posto_id do corpo é ignorado', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $outro] = postoDoPwa();

    $resposta = withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/formas-pagamento", corpoDeFormaCf(['nome' => ' Crédito ', 'posto_id' => $outro->id]));

    $resposta->assertCreated()
        ->assertJsonPath('data.nome', 'Crédito')
        ->assertJsonPath('data.tipo', 'cartao_credito')
        ->assertJsonPath('data.taxa', '3.50')
        ->assertJsonPath('data.ativo', true);
    expect(DB::table('FormaPagamento')->where('nome', 'Crédito')->pluck('posto_id')->all())->toBe([$br->id]);
});

it('nome repetido no posto (inclusive inativa) é 422 nome_repetido; o mesmo nome em outro posto passa', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    formaCf($br, 'Crédito', false);

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/formas-pagamento", corpoDeFormaCf())
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'nome_repetido');
    app('auth')->forgetGuards();
    withToken(tokenDoGerente($jorro))->postJson("/api/postos/{$jorro->id}/formas-pagamento", corpoDeFormaCf())->assertCreated();
});

it('edita e desativa (ativo: false) — nada é apagado; a forma antiga de tipo "venda" continua aceita', function (): void {
    ['posto' => $br] = postoDoPwa();
    $forma = formaCf($br);
    $token = tokenDoGerente($br);
    $url = "/api/postos/{$br->id}/formas-pagamento/{$forma->id}";

    withToken($token)->putJson($url, corpoDeFormaCf(['nome' => 'Pix', 'tipo' => 'venda', 'taxa' => '0.99']))
        ->assertOk()->assertJsonPath('data.taxa', '0.99')->assertJsonPath('data.tipo', 'venda');
    withToken($token)->putJson($url, corpoDeFormaCf(['nome' => 'Pix', 'tipo' => 'venda', 'ativo' => false]))
        ->assertOk()->assertJsonPath('data.ativo', false);

    expect(DB::table('FormaPagamento')->where('id', $forma->id)->value('ativo'))->toBeFalse();
});

it('ISOLAMENTO: forma do BR é 404 pela rota do Jorro, e nada muda', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $forma = formaCf($br);

    withToken(tokenDoGerente($jorro))->putJson("/api/postos/{$jorro->id}/formas-pagamento/{$forma->id}", corpoDeFormaCf(['nome' => 'X']))->assertNotFound();

    expect(DB::table('FormaPagamento')->where('id', $forma->id)->value('nome'))->toBe('Pix');
});

it('recusa de forma da forma de pagamento é 422 corpo_invalido', function (array $troca): void {
    ['posto' => $br] = postoDoPwa();

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/formas-pagamento", corpoDeFormaCf($troca))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'corpo_invalido');
    expect(DB::table('FormaPagamento')->where('posto_id', $br->id)->count())->toBe(0);
})->with([
    'nome vazio' => [['nome' => '']],
    'tipo desconhecido' => [['tipo' => 'cheque']],
    'taxa negativa' => [['taxa' => '-1']],
    'taxa acima de 100' => [['taxa' => '100.01']],
    'taxa com 3 casas' => [['taxa' => '1.999']],
    'ativo em string' => [['ativo' => 'true']],
]);

it('parâmetros: posto sem linhas lê null e o salvar CRIA as três (upsert), sem tocar em outro posto', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    DB::table('Configuracao')->insert(['chave' => 'tolerancia_divergencia', 'valor' => '10.00', 'posto_id' => $jorro->id]);
    $token = tokenDoGerente($br);

    withToken($token)->getJson("/api/postos/{$br->id}/parametros")->assertOk()->assertExactJson(['data' => [
        'tolerancia_divergencia' => null, 'dias_estoque_critico' => null, 'dias_estoque_baixo' => null,
    ]]);
    withToken($token)->putJson("/api/postos/{$br->id}/parametros", corpoDeParametrosCf())->assertOk()->assertExactJson(['data' => [
        'tolerancia_divergencia' => '50.00', 'dias_estoque_critico' => '3', 'dias_estoque_baixo' => '7',
    ]]);

    expect(parametrosCf($br))->toBe(['dias_estoque_baixo' => '7', 'dias_estoque_critico' => '3', 'tolerancia_divergencia' => '50.00'])
        ->and(parametrosCf($jorro))->toBe(['tolerancia_divergencia' => '10.00']);
});

it('parâmetros: salvar de novo ATUALIZA a mesma linha, sem duplicar', function (): void {
    ['posto' => $br] = postoDoPwa();
    $token = tokenDoGerente($br);
    $url = "/api/postos/{$br->id}/parametros";

    withToken($token)->putJson($url, corpoDeParametrosCf())->assertOk();
    withToken($token)->putJson($url, corpoDeParametrosCf(['tolerancia_divergencia' => '25.5', 'dias_estoque_baixo' => 10]))->assertOk();

    expect(DB::table('Configuracao')->where('posto_id', $br->id)->count())->toBe(3)
        ->and(parametrosCf($br))->toBe(['dias_estoque_baixo' => '10', 'dias_estoque_critico' => '3', 'tolerancia_divergencia' => '25.50']);
});

it('recusa de forma dos parâmetros é 422 corpo_invalido', function (array $troca): void {
    ['posto' => $br] = postoDoPwa();

    withToken(tokenDoGerente($br))->putJson("/api/postos/{$br->id}/parametros", corpoDeParametrosCf($troca))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'corpo_invalido');
    expect(parametrosCf($br))->toBe([]);
})->with([
    'tolerância negativa' => [['tolerancia_divergencia' => '-1']],
    'tolerância em texto' => [['tolerancia_divergencia' => 'cinquenta']],
    'dias zero' => [['dias_estoque_critico' => 0]],
    'dias decimal' => [['dias_estoque_baixo' => 1.5]],
]);
