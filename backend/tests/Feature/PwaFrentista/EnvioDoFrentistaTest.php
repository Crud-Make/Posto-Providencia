<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Fechamento\Domain\FechamentoFrentista;
use App\Fechamento\Domain\Leitura;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\postJson;
use function Pest\Laravel\withToken;

require_once __DIR__.'/Cenario.php';

/*
|--------------------------------------------------------------------------
| POST /api/postos/{posto}/envios — o fechamento de turno do frentista (#101, fatia 1)
|--------------------------------------------------------------------------
| O que se prende aqui: o pai do dia nasce como o PWA o cria hoje; o filho é gravado com os valores
| como vieram; o pai é reconsolidado com a MESMA conta do `consolidarFechamento` (números exatos);
| o frentista é o do TOKEN; o mesmo envio chegando duas vezes não duplica; e um segundo envio do
| mesmo frentista no mesmo dia é recusado (409), como a tela do PWA já faz.
*/

/**
 * @param  list<Bico>  $bicos
 * @param  list<string>  $valores
 */
function leiturasDoDia(array $bicos, array $valores): void
{
    foreach ($valores as $i => $valor) {
        Leitura::factory()->create([
            'bico_id' => $bicos[$i]->id,
            'combustivel_id' => $bicos[$i]->combustivel_id,
            'posto_id' => $bicos[$i]->posto_id,
            'data' => DIA_PWA.' 00:00:00+00',
            'valor_total' => $valor,
        ]);
    }
}

/** @return array<string, mixed> */
function paiDoEnvio(int $fechamentoId): array
{
    return (array) DB::table('Fechamento')->where('id', $fechamentoId)->first();
}

it('grava o envio, cria o pai do dia como o PWA cria e deixa o dia NÃO apurado sem encerrante', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa(bicos: 2);

    $resposta = withToken(tokenDoFrentista($posto, $frentista))
        ->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())
        ->assertCreated()
        ->assertJsonPath('data.frentista_id', $frentista->id)
        ->assertJsonPath('data.repetido', false)
        ->assertJsonPath('data.consolidacao', [
            'apurado' => false, 'total_vendas' => null, 'total_recebido' => '3688.65', 'diferenca' => null,
        ]);

    $pai = paiDoEnvio(idDaResposta($resposta->json('data.fechamento_id')));
    expect($pai['posto_id'])->toBe($posto->id)
        ->and($pai['turno_id'])->toBe(1)
        ->and($pai['usuario_id'])->toBe(1)
        ->and($pai['status'])->toBe('ABERTO')
        ->and($pai['total_vendas'])->toBeNull()
        ->and($pai['diferenca'])->toBeNull()
        ->and($pai['total_recebido'])->toBe('3688.65');

    $linha = (array) DB::table('FechamentoFrentista')->where('id', $resposta->json('data.id'))->first();
    expect($linha)->toMatchArray([
        'frentista_id' => $frentista->id, 'posto_id' => $posto->id, 'encerrante' => '3700.00',
        'valor_pix' => '845.10', 'valor_dinheiro' => '1234.56', 'valor_moedas' => '12.30', 'baratao' => '37.45',
        'valor_nota' => '150.00', 'valor_cartao_debito' => '410.25', 'valor_cartao_credito' => '998.99',
        'valor_cartao' => '0.00', 'valor_conferido' => '3688.65', 'diferenca_calculada' => '11.35',
        'observacoes' => 'Fechamento via PWA Frentista', 'chave_envio' => '5b0a1d8e-2f4c-4e1a-9c3b-7d6e5f4a3b21',
    ])->and($linha['data_hora_envio'])->not->toBeNull();
});

it('reconsolida o pai com a conta do consolidarFechamento — três frentistas e o encerrante completo', function (): void {
    ['posto' => $posto, 'frentista' => $primeiro, 'bicos' => $bicos] = postoDoPwa(bicos: 4);
    $segundo = frentistaDoPwa($posto);
    $terceiro = frentistaDoPwa($posto);
    leiturasDoDia($bicos, ['4321.09', '2718.28', '1414.21', '1732.05']);

    // Os mesmos três turnos do teste de caracterização (tests/Unit/Fechamento/ConsolidacaoDoDiaTest).
    $envios = [
        [$primeiro, corpoDoEnvio()],
        [$segundo, corpoDoEnvio([
            'chave' => '0f7d2c1b-9a8e-4d3c-8b2a-1e0f9d8c7b6a', 'valor_dinheiro' => '0.10', 'valor_moedas' => '0.20',
            'valor_pix' => '1718.35', 'valor_cartao' => '250.00', 'valor_cartao_debito' => '0.00',
            'valor_cartao_credito' => '0.00', 'valor_nota' => '0.00', 'baratao' => '0.00',
            'valor_conferido' => '1968.65', 'encerrante' => '1968.65', 'diferenca_calculada' => '0.00',
        ])],
        [$terceiro, corpoDoEnvio([
            'chave' => '3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a', 'valor_dinheiro' => '2999.99', 'valor_moedas' => '0.01',
            'valor_pix' => '0.00', 'valor_cartao_debito' => '1500.50', 'valor_cartao_credito' => '700.49',
            'valor_nota' => '89.90', 'baratao' => '0.00', 'valor_conferido' => '5290.89', 'encerrante' => '5300.00',
            'diferenca_calculada' => '9.11',
        ])],
    ];

    $ultima = null;
    foreach ($envios as [$frentista, $corpo]) {
        $ultima = withToken(tokenDoFrentista($posto, $frentista))
            ->postJson("/api/postos/{$posto->id}/envios", $corpo)
            ->assertCreated();
    }

    // Esperado tirado do TypeScript: totaisDoDia(10185.63, [3 sessões]) =
    // { totalVendas: 10185.63, totalRecebido: 10948.19, diferenca: -762.56 } (SOBRA).
    $ultima->assertJsonPath('data.consolidacao', [
        'apurado' => true, 'total_vendas' => '10185.63', 'total_recebido' => '10948.19', 'diferenca' => '-762.56',
    ]);
    $pai = paiDoEnvio(idDaResposta($ultima->json('data.fechamento_id')));
    expect([$pai['total_vendas'], $pai['total_recebido'], $pai['diferenca']])->toBe(['10185.63', '10948.19', '-762.56'])
        ->and(DB::table('Fechamento')->where('posto_id', $posto->id)->count())->toBe(1);
});

it('o frentista é o do TOKEN: frentista_id no corpo é ignorado (A não lança como B)', function (): void {
    ['posto' => $posto, 'frentista' => $a] = postoDoPwa();
    $b = frentistaDoPwa($posto);

    $resposta = withToken(tokenDoFrentista($posto, $a))
        ->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio(['frentista_id' => $b->id]))
        ->assertCreated();

    expect($resposta->json('data.frentista_id'))->toBe($a->id)
        ->and(FechamentoFrentista::query()->withoutGlobalScopes()->where('frentista_id', $b->id)->exists())->toBeFalse();
});

it('isolamento: o frentista do Jorro não envia no BR (403) e nada é gravado lá', function (): void {
    ['posto' => $jorro, 'frentista' => $frentista] = postoDoPwa();
    ['posto' => $br] = postoDoPwa();
    $token = tokenDoFrentista($jorro, $frentista);

    withToken($token)->postJson("/api/postos/{$br->id}/envios", corpoDoEnvio())->assertForbidden();
    withToken($token)->postJson("/api/postos/{$br->id}/presenca")->assertForbidden();

    expect(DB::table('Fechamento')->where('posto_id', $br->id)->exists())->toBeFalse()
        ->and(DB::table('FechamentoFrentista')->where('frentista_id', $frentista->id)->exists())->toBeFalse();
});

it('idempotência: o mesmo envio chegando duas vezes grava UMA linha e a segunda resposta é 200 repetido', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $token = tokenDoFrentista($posto, $frentista);

    $primeira = withToken($token)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())->assertCreated();
    $segunda = withToken($token)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())
        ->assertOk()
        ->assertJsonPath('data.repetido', true)
        ->assertJsonPath('data.consolidacao', null);

    expect($segunda->json('data.id'))->toBe($primeira->json('data.id'))
        ->and(DB::table('FechamentoFrentista')->where('frentista_id', $frentista->id)->count())->toBe(1)
        ->and(paiDoEnvio(idDaResposta($primeira->json('data.fechamento_id')))['total_recebido'])->toBe('3688.65');
});

it('a mesma chave com outro valor é 409 chave_reutilizada, e o gravado não muda', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $token = tokenDoFrentista($posto, $frentista);
    withToken($token)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())->assertCreated();

    withToken($token)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio(['valor_pix' => '845.11']))
        ->assertConflict()
        ->assertJsonPath('erro.codigo', 'chave_reutilizada');

    expect(DB::table('FechamentoFrentista')->where('frentista_id', $frentista->id)->value('valor_pix'))->toBe('845.10');
});

it('segundo envio do mesmo frentista no mesmo dia, com outra chave, é 409 ja_enviado', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $token = tokenDoFrentista($posto, $frentista);
    withToken($token)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())->assertCreated();

    withToken($token)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio(['chave' => 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d']))
        ->assertConflict()
        ->assertJsonPath('erro.codigo', 'ja_enviado');

    expect(DB::table('FechamentoFrentista')->where('frentista_id', $frentista->id)->count())->toBe(1);
});

it('a chave de um envio de OUTRO frentista não devolve a linha dele: 409', function (): void {
    ['posto' => $posto, 'frentista' => $a] = postoDoPwa();
    $b = frentistaDoPwa($posto);
    withToken(tokenDoFrentista($posto, $a))->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())->assertCreated();

    withToken(tokenDoFrentista($posto, $b))->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())
        ->assertConflict()
        ->assertJsonPath('erro.codigo', 'chave_reutilizada');
});

it('fora da janela de escrita (depois de amanhã) é 422 fora_da_janela e não cria pai', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $depoisDeAmanha = now('UTC')->addDays(2)->format('Y-m-d');

    withToken(tokenDoFrentista($posto, $frentista))
        ->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio(['data' => $depoisDeAmanha]))
        ->assertUnprocessable()
        ->assertJsonPath('erro.codigo', 'fora_da_janela');

    expect(DB::table('Fechamento')->where('posto_id', $posto->id)->exists())->toBeFalse();
});

it('dinheiro como número JSON, chave que não é UUID ou data errada: 422 corpo_invalido', function (array $troca, string $campo): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();

    withToken(tokenDoFrentista($posto, $frentista))
        ->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio($troca))
        ->assertUnprocessable()
        ->assertJsonPath('erro.codigo', 'corpo_invalido')
        ->assertJsonValidationErrors([$campo], 'erro.campos');
})->with([
    'número' => [['valor_pix' => 845.1], 'valor_pix'],
    'três casas' => [['valor_pix' => '845.100'], 'valor_pix'],
    'chave' => [['chave' => 'nao-e-uuid'], 'chave'],
    'data' => [['data' => '07/01/2026'], 'data'],
]);

it('sem token, ou com token que não existe, é 401', function (): void {
    ['posto' => $posto] = postoDoPwa();

    postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())->assertUnauthorized();
    withToken('1|token-que-nao-existe')->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())->assertUnauthorized();
});

it('trava conhecida até a #93: o dia já aberto por OUTRO posto no turno 1 recusa o envio (500) sem gravar nada', function (): void {
    ['posto' => $jorro, 'frentista' => $frentista] = postoDoPwa();
    ['posto' => $br, 'frentista' => $doBr] = postoDoPwa();
    withToken(tokenDoFrentista($br, $doBr))->postJson("/api/postos/{$br->id}/envios", corpoDoEnvio())->assertCreated();

    // O unique de produção é (data, turno_id), sem posto_id (01-esquema-base.sql:757): o pai do BR
    // ocupa o dia. A migration multi-tenant da #93 troca o unique; até lá, falha alta e nada gravado.
    withToken(tokenDoFrentista($jorro, $frentista))
        ->postJson("/api/postos/{$jorro->id}/envios", corpoDoEnvio(['chave' => '9e8d7c6b-5a49-4382-9170-6f5e4d3c2b1a']))
        ->assertServerError();

    expect(DB::table('FechamentoFrentista')->where('frentista_id', $frentista->id)->exists())->toBeFalse();
});
