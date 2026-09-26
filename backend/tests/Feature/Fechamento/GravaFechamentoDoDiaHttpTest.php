<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\FormaPagamento;
use App\Cadastro\Domain\Frentista;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\FechamentoFrentista;
use App\Fechamento\Domain\Leitura;
use App\Fechamento\Domain\Recebimento;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\putJson;
use function Pest\Laravel\withToken;

/*
|--------------------------------------------------------------------------
| PUT /api/postos/{posto}/fechamento — o lado HTTP da escrita (#103 P11)
|--------------------------------------------------------------------------
| O banco resultante é o mesmo de GravaFechamentoDoDiaTest (o Command); aqui se prova a porta:
| guard (401/403), forma do corpo (422 corpo_invalido), recusa de domínio (422 fora_da_janela /
| totais_inconsistentes) e o shape da resposta, igual ao do GET da P7.
*/

const SEGREDO_P11 = 'segredo-de-teste-da-escrita';

const DIA_P11 = '2026-01-05';

function b64urlP11(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenP11(string $sub): string
{
    $c = b64urlP11((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64urlP11((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $c.'.'.$p.'.'.b64urlP11(hash_hmac('sha256', $c.'.'.$p, SEGREDO_P11, binary: true));
}

/** Identidade como o sistema cria (trigger em auth.users), com o papel pedido no posto. */
function usuarioP11(string $sub, int $postoId, Role $role, ?PapelNoPosto $papel): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $u = Usuario::query()->where('auth_user_id', $sub)->sole();
    $u->forceFill(['role' => $role, 'ativo' => true])->save();

    if ($papel !== null) {
        UsuarioPosto::factory()->create(['usuario_id' => $u->id, 'posto_id' => $postoId, 'role' => $papel, 'ativo' => true]);
    }

    return $u->refresh();
}

/**
 * @return array{posto: Posto, combustivel: Combustivel, bico: Bico, frentista: Frentista, forma: FormaPagamento}
 */
function cenarioP11(): array
{
    $posto = Posto::factory()->create();
    app(PostoAtual::class)->definir($posto->id);   // as factories ganham posto_id pelo trait

    if (DB::table('Turno')->where('id', 1)->doesntExist()) {
        DB::table('Turno')->insert([
            'id' => 1, 'nome' => 'Manhã', 'horario_inicio' => '06:00:00', 'horario_fim' => '14:00:00',
            'ativo' => true, 'posto_id' => $posto->id,
        ]);
    }

    $combustivel = Combustivel::factory()->create();
    $bomba = Bomba::factory()->create();

    return [
        'posto' => $posto,
        'combustivel' => $combustivel,
        'bico' => Bico::factory()->create(['bomba_id' => $bomba->id, 'combustivel_id' => $combustivel->id]),
        'frentista' => Frentista::factory()->create(),
        'forma' => FormaPagamento::factory()->create(),
    ];
}

/**
 * Um dia coerente: 100 L a R$ 6,00 (R$ 600,00), uma sessão de R$ 600,00 em dinheiro, um
 * recebimento, e totais que batem (diferença 0). Cada parte pode ser sobrescrita.
 *
 * @param  array{posto: Posto, combustivel: Combustivel, bico: Bico, frentista: Frentista, forma: FormaPagamento}  $c
 * @param  array<string, mixed>  $leitura
 * @param  array<string, mixed>  $sessao
 * @param  array<string, mixed>  $totais
 * @return array<string, mixed>
 */
function corpoP11(array $c, array $leitura = [], array $sessao = [], array $totais = []): array
{
    return [
        'leituras' => [array_merge([
            'bico_id' => $c['bico']->id, 'combustivel_id' => $c['combustivel']->id,
            'leitura_inicial' => '1000.000', 'leitura_final' => '1100.000', 'litros_vendidos' => '100.000',
            'preco_litro' => '6.00', 'valor_total' => '600.00',
        ], $leitura)],
        'sessoes' => [array_merge([
            'frentista_id' => $c['frentista']->id,
            'valor_cartao' => '0.00', 'valor_cartao_debito' => '0.00', 'valor_cartao_credito' => '0.00',
            'valor_dinheiro' => '600.00', 'valor_moedas' => '0.00', 'valor_pix' => '0.00', 'valor_nota' => '0.00',
            'baratao' => '0.00', 'encerrante' => '600.00', 'valor_conferido' => '600.00',
            'diferenca_calculada' => '0.00', 'observacoes' => '',
        ], $sessao)],
        'frentistas_conhecidos' => [],
        'recebimentos' => [['forma_pagamento_id' => $c['forma']->id, 'valor' => '600.00']],
        'totais' => array_merge(['total_vendas' => '600.00', 'total_recebido' => '600.00', 'diferenca' => '0.00'], $totais),
        'observacoes' => 'gravado pela API',
    ];
}

function urlP11(int $postoId, string $dia = DIA_P11): string
{
    return "/api/postos/{$postoId}/fechamento?data={$dia}";
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_P11]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

it('sem token: 401', function (): void {
    $c = cenarioP11();

    putJson(urlP11($c['posto']->id), corpoP11($c))->assertUnauthorized();
});

it('operador com vínculo: 403 — ver não basta, a escrita exige gerir', function (): void {
    $c = cenarioP11();
    $operador = usuarioP11('c1110000-0000-4000-8000-000000000001', $c['posto']->id, Role::Operador, PapelNoPosto::Operador);

    withToken(tokenP11((string) $operador->auth_user_id))
        ->getJson(urlP11($c['posto']->id))->assertOk();                       // vê
    withToken(tokenP11((string) $operador->auth_user_id))
        ->putJson(urlP11($c['posto']->id), corpoP11($c))->assertForbidden();  // não grava

    expect(Fechamento::query()->count())->toBe(0);
});

it('gerente: 200, o banco fica como no Command e a resposta tem o shape do GET', function (): void {
    $c = cenarioP11();
    $gerente = usuarioP11('c2220000-0000-4000-8000-000000000001', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    $resposta = withToken(tokenP11((string) $gerente->auth_user_id))
        ->putJson(urlP11($c['posto']->id), corpoP11($c))
        ->assertOk()
        ->assertJsonPath('data.status', 'FECHADO')
        ->assertJsonPath('data.turno_id', 1)
        ->assertJsonPath('data.usuario_id', $gerente->id)   // o AUTENTICADO, não o 1 cravado (I6)
        ->assertJsonPath('data.total_vendas', '600.00')
        ->assertJsonPath('data.total_recebido', '600.00')
        ->assertJsonPath('data.diferenca', '0.00')
        ->assertJsonPath('data.observacoes', 'gravado pela API')
        ->assertJsonPath('data.data', '2026-01-05T00:00:00Z')
        ->assertJsonCount(1, 'data.recebimentos');

    // Decimal em STRING no JSON cru, como o GET da P7 — nunca número.
    expect($resposta->getContent())->toContain('"total_vendas":"600.00"')->toContain('"valor":"600.00"');

    expect(Fechamento::query()->count())->toBe(1)
        ->and(Leitura::query()->count())->toBe(1)
        ->and(FechamentoFrentista::query()->count())->toBe(1)
        ->and(Recebimento::query()->count())->toBe(1);

    // O GET da P7 devolve o que o PUT acabou de gravar: a mesma linha.
    $idGravado = $resposta->json('data.id');
    withToken(tokenP11((string) $gerente->auth_user_id))
        ->getJson(urlP11($c['posto']->id))
        ->assertOk()->assertJsonPath('data.id', $idGravado);
});

it('ADMIN sem vínculo grava: 200', function (): void {
    $c = cenarioP11();
    $admin = usuarioP11('c3330000-0000-4000-8000-0000000000ad', $c['posto']->id, Role::Admin, null);

    withToken(tokenP11((string) $admin->auth_user_id))
        ->putJson(urlP11($c['posto']->id), corpoP11($c))->assertOk();
});

it('dia não apurado: null entra null e sai null (I8)', function (): void {
    $c = cenarioP11();
    $gerente = usuarioP11('c4440000-0000-4000-8000-000000000001', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    $resposta = withToken(tokenP11((string) $gerente->auth_user_id))
        ->putJson(urlP11($c['posto']->id), corpoP11($c, totais: ['total_vendas' => null, 'diferenca' => null]))
        ->assertOk();

    expect($resposta->getContent())
        ->toContain('"total_vendas":null')
        ->toContain('"diferenca":null')
        ->toContain('"total_recebido":"600.00"');
});

it('dinheiro em número JSON: 422 corpo_invalido apontando o campo', function (): void {
    $c = cenarioP11();
    $gerente = usuarioP11('c5550000-0000-4000-8000-000000000001', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenP11((string) $gerente->auth_user_id))
        ->putJson(urlP11($c['posto']->id), corpoP11($c, sessao: ['valor_dinheiro' => 600]))
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', 'corpo_invalido')
        ->assertJsonStructure(['erro' => ['codigo', 'mensagem', 'campos' => ['sessoes.0.valor_dinheiro']]]);

    expect(Fechamento::query()->count())->toBe(0);
});

it('string BR (1.718,35): 422 corpo_invalido — a conversão é do cliente', function (): void {
    $c = cenarioP11();
    $gerente = usuarioP11('c6660000-0000-4000-8000-000000000001', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenP11((string) $gerente->auth_user_id))
        ->putJson(urlP11($c['posto']->id), corpoP11($c, totais: ['total_recebido' => '1.718,35']))
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', 'corpo_invalido')
        ->assertJsonStructure(['erro' => ['campos' => ['totais.total_recebido']]]);
});

it('id como string ("5"): 422 corpo_invalido — integer:strict', function (): void {
    $c = cenarioP11();
    $gerente = usuarioP11('c7770000-0000-4000-8000-000000000001', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenP11((string) $gerente->auth_user_id))
        ->putJson(urlP11($c['posto']->id), corpoP11($c, leitura: ['bico_id' => (string) $c['bico']->id]))
        ->assertStatus(422)
        ->assertJsonStructure(['erro' => ['campos' => ['leituras.0.bico_id']]]);
});

it('par quebrado (total_vendas sem diferenca): 422 corpo_invalido', function (): void {
    $c = cenarioP11();
    $gerente = usuarioP11('c8880000-0000-4000-8000-000000000001', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenP11((string) $gerente->auth_user_id))
        ->putJson(urlP11($c['posto']->id), corpoP11($c, totais: ['diferenca' => null]))
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', 'corpo_invalido')
        ->assertJsonStructure(['erro' => ['campos' => ['totais.diferenca']]]);
});

it('data ausente: 422 corpo_invalido', function (): void {
    $c = cenarioP11();
    $gerente = usuarioP11('c9990000-0000-4000-8000-000000000001', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenP11((string) $gerente->auth_user_id))
        ->putJson("/api/postos/{$c['posto']->id}/fechamento", corpoP11($c))
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', 'corpo_invalido');
});

it('fora da janela: 422 fora_da_janela e nada gravado', function (): void {
    $c = cenarioP11();
    $gerente = usuarioP11('ca000000-0000-4000-8000-000000000001', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenP11((string) $gerente->auth_user_id))
        ->putJson(urlP11($c['posto']->id, '2025-12-30'), corpoP11($c))
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', 'fora_da_janela');

    expect(Fechamento::query()->count())->toBe(0);
});

it('diferenca errada por um centavo: 422 totais_inconsistentes e nada gravado', function (): void {
    $c = cenarioP11();
    $gerente = usuarioP11('cb000000-0000-4000-8000-000000000001', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenP11((string) $gerente->auth_user_id))
        ->putJson(urlP11($c['posto']->id), corpoP11($c, totais: ['diferenca' => '0.01']))
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', 'totais_inconsistentes');

    expect(Fechamento::query()->count())->toBe(0);
});
