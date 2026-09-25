<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\withToken;

require_once __DIR__.'/Cenario.php';

/*
|--------------------------------------------------------------------------
| Leituras e foto do PWA do frentista pela API (#101, fatia 2)
|--------------------------------------------------------------------------
| O que se prende aqui: a lista de escolha (pública, antes do PIN) expõe só id e nome; o perfil, a
| foto, o histórico e o valor do envio são do frentista do TOKEN — o A não lê nem troca nada do B;
| o frentista do Jorro recebe 403 no BR; o token do gerente não abre nenhuma destas rotas.
*/

const FOTO_PWA = 'data:image/jpeg;base64,/9j/AAAA';

it('a lista de escolha é pública e traz só id e nome dos ATIVOS do posto, por nome', function (): void {
    ['posto' => $posto, 'frentista' => $ana] = postoDoPwa();
    DB::table('Frentista')->where('id', $ana->id)->update(['nome' => 'Ana', 'foto' => FOTO_PWA, 'telefone' => '75999990000']);
    $bia = frentistaDoPwa($posto, pin: null);
    DB::table('Frentista')->where('id', $bia->id)->update(['nome' => 'Bia']);
    $inativo = frentistaDoPwa($posto, ativo: false, pin: null);
    ['posto' => $outro, 'frentista' => $deFora] = postoDoPwa();

    $resposta = getJson("/api/postos/{$posto->id}/frentistas/escolha")
        ->assertOk()
        ->assertExactJson(['data' => [['id' => $ana->id, 'nome' => 'Ana'], ['id' => $bia->id, 'nome' => 'Bia']]]);

    expect($resposta->getContent())->not->toContain('base64')
        ->and($resposta->getContent())->not->toContain('75999990000')
        ->and($inativo->id)->not->toBe($ana->id)
        ->and($outro->id)->not->toBe($posto->id)
        ->and($deFora->id)->not->toBe($bia->id);
});

it('perfil: o frentista do token vê a PRÓPRIA foto; não há id na rota para alcançar a do colega', function (): void {
    ['posto' => $posto, 'frentista' => $a] = postoDoPwa();
    $b = frentistaDoPwa($posto);
    DB::table('Frentista')->where('id', $b->id)->update(['foto' => FOTO_PWA]);

    withToken(tokenDoFrentista($posto, $a))->getJson("/api/postos/{$posto->id}/frentistas/eu")
        ->assertOk()
        ->assertExactJson(['data' => ['id' => $a->id, 'nome' => $a->nome, 'foto' => null]]);
    withToken(tokenDoFrentista($posto, $b))->getJson("/api/postos/{$posto->id}/frentistas/eu")
        ->assertJsonPath('data.foto', FOTO_PWA);
});

it('foto: o frentista troca e apaga só a PRÓPRIA — frentista_id no corpo é ignorado', function (): void {
    ['posto' => $posto, 'frentista' => $a] = postoDoPwa();
    $b = frentistaDoPwa($posto);
    $token = tokenDoFrentista($posto, $a);

    withToken($token)->putJson("/api/postos/{$posto->id}/frentistas/eu/foto", ['foto' => FOTO_PWA, 'frentista_id' => $b->id])
        ->assertOk()
        ->assertJsonPath('data.id', $a->id)
        ->assertJsonPath('data.foto', FOTO_PWA);

    expect(DB::table('Frentista')->where('id', $a->id)->value('foto'))->toBe(FOTO_PWA)
        ->and(DB::table('Frentista')->where('id', $b->id)->value('foto'))->toBeNull();

    withToken($token)->putJson("/api/postos/{$posto->id}/frentistas/eu/foto", ['foto' => null])->assertOk();
    expect(DB::table('Frentista')->where('id', $a->id)->value('foto'))->toBeNull();
});

it('foto fora do CHECK da coluna (não JPEG, acima de 40.000, ausente) é 422 e nada muda', function (mixed $foto): void {
    ['posto' => $posto, 'frentista' => $a] = postoDoPwa();

    withToken(tokenDoFrentista($posto, $a))->putJson("/api/postos/{$posto->id}/frentistas/eu/foto", is_array($foto) ? $foto : ['foto' => $foto])
        ->assertUnprocessable();

    expect(DB::table('Frentista')->where('id', $a->id)->value('foto'))->toBeNull();
})->with([
    'png' => ['data:image/png;base64,AAAA'],
    'grande' => ['data:image/jpeg;base64,'.str_repeat('A', 40000)],
    'número' => [123],
    'sem o campo' => [[]],
]);

it('envios do dia: nome e hora de todos, o valor conferido só do próprio frentista', function (): void {
    ['posto' => $posto, 'frentista' => $a] = postoDoPwa();
    $b = frentistaDoPwa($posto);
    $tokenA = tokenDoFrentista($posto, $a);
    withToken($tokenA)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())->assertCreated();
    $tokenB = tokenDoFrentista($posto, $b);
    withToken($tokenB)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio([
        'chave' => '0f6a2c1e-9b8d-4e7f-a1b2-c3d4e5f6a7b8', 'valor_conferido' => '100.00',
    ]))->assertCreated();

    withToken($tokenA)->getJson("/api/postos/{$posto->id}/envios?data=".DIA_PWA)
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.frentista_id', $a->id)
        ->assertJsonPath('data.0.frentista', ['nome' => $a->nome])
        ->assertJsonPath('data.0.valor_conferido', '3688.65')
        ->assertJsonPath('data.1.frentista_id', $b->id)
        ->assertJsonPath('data.1.frentista', ['nome' => $b->nome])
        ->assertJsonPath('data.1.valor_conferido', null)
        ->assertJsonStructure(['data' => [['id', 'frentista_id', 'frentista', 'data_hora_envio', 'valor_conferido']]]);

    withToken($tokenB)->getJson("/api/postos/{$posto->id}/envios?data=".DIA_PWA)
        ->assertJsonPath('data.0.valor_conferido', null)
        ->assertJsonPath('data.1.valor_conferido', '100.00');
    withToken($tokenA)->getJson("/api/postos/{$posto->id}/envios?data=2026-01-08")->assertExactJson(['data' => []]);
    withToken($tokenA)->getJson("/api/postos/{$posto->id}/envios?data=07/01/2026")->assertUnprocessable();
});

it('histórico: só os envios do frentista do token, deste posto, do mais novo ao mais antigo', function (): void {
    ['posto' => $posto, 'frentista' => $a] = postoDoPwa();
    $b = frentistaDoPwa($posto);
    $tokenA = tokenDoFrentista($posto, $a);
    withToken($tokenA)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())->assertCreated();
    withToken($tokenA)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio([
        'data' => '2026-01-08', 'chave' => '1c2d3e4f-5a6b-4c7d-8e9f-a0b1c2d3e4f5',
    ]))->assertCreated();
    withToken(tokenDoFrentista($posto, $b))->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio([
        'chave' => '2d3e4f5a-6b7c-4d8e-9f0a-b1c2d3e4f5a6',
    ]))->assertCreated();

    withToken($tokenA)->getJson("/api/postos/{$posto->id}/historico")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.fechamento', ['data' => '2026-01-08', 'turno_id' => 1])
        ->assertJsonPath('data.1.fechamento', ['data' => DIA_PWA, 'turno_id' => 1])
        ->assertJsonPath('data.1.encerrante', '3700.00')
        ->assertJsonPath('data.1.valor_pix', '845.10')
        ->assertJsonPath('data.1.valor_conferido', '3688.65')
        ->assertJsonPath('data.1.diferenca_calculada', '11.35')
        ->assertJsonPath('data.1.observacoes', 'Fechamento via PWA Frentista');
});

it('isolamento das leituras: sem token 401, token de gerente 401, frentista de outro posto 403', function (string $metodo, string $caminho): void {
    exigeFrentistaDoPosto($metodo, $caminho, ['foto' => null]);
})->with([
    'perfil' => ['GET', 'frentistas/eu'],
    'foto' => ['PUT', 'frentistas/eu/foto'],
    'envios do dia' => ['GET', 'envios?data='.DIA_PWA],
    'histórico' => ['GET', 'historico'],
]);

it('o frentista do Jorro não lê nem troca nada no BR (403), e a foto do BR não muda', function (): void {
    ['posto' => $jorro, 'frentista' => $frentista] = postoDoPwa();
    ['posto' => $br, 'frentista' => $doBr] = postoDoPwa();
    $token = tokenDoFrentista($jorro, $frentista);

    withToken($token)->getJson("/api/postos/{$br->id}/frentistas/eu")->assertForbidden();
    withToken($token)->putJson("/api/postos/{$br->id}/frentistas/eu/foto", ['foto' => FOTO_PWA])->assertForbidden();
    withToken($token)->getJson("/api/postos/{$br->id}/historico")->assertForbidden();

    expect(DB::table('Frentista')->whereIn('id', [$frentista->id, $doBr->id])->whereNotNull('foto')->exists())->toBeFalse();
});

it('o token do frentista não abre a rota de sessões do gerente (a lista do painel)', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();

    withToken(tokenDoFrentista($posto, $frentista))->getJson("/api/postos/{$posto->id}/sessoes?data=".DIA_PWA)->assertUnauthorized();
});
