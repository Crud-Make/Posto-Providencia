<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Frentista;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Pessoas\Application\DefinePinDoFrentista;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\json;
use function Pest\Laravel\postJson;
use function Pest\Laravel\withToken;

/*
| Cenário comum dos testes do PWA do frentista pela API (#101). Postos NOVOS (fábrica), e não o
| posto 1: o banco local tem o seed de cadastro do Jorro (6 bicos ativos), e a consolidação conta os
| bicos ativos do posto — com o posto 1 o número dependeria de quem roda o teste.
*/

const PIN_PWA = '4821';

const DIA_PWA = '2026-01-07';

/** Pré-requisitos do esquema que o PWA sempre teve no banco: Usuario 1 e Turno 1 (FKs do pai). */
function garantePreRequisitosDoPwa(int $postoId): void
{
    if (DB::table('Usuario')->insertOrIgnore(['id' => 1, 'email' => 'pwa@teste.local', 'nome' => 'Usuário 1 do esquema']) > 0) {
        DB::statement('SELECT setval(pg_get_serial_sequence(\'public."Usuario"\', \'id\'), (SELECT MAX(id) FROM public."Usuario"))');
    }

    if (DB::table('Turno')->where('id', 1)->doesntExist()) {
        DB::table('Turno')->insert([
            'id' => 1, 'nome' => 'Manhã', 'horario_inicio' => '06:00:00', 'horario_fim' => '14:00:00',
            'ativo' => true, 'posto_id' => $postoId,
        ]);
    }
}

/**
 * Um posto novo com `$bicos` bicos ativos e um frentista com PIN.
 *
 * @return array{posto: Posto, frentista: Frentista, bicos: list<Bico>}
 */
function postoDoPwa(int $bicos = 0): array
{
    $posto = Posto::factory()->create();
    app(PostoAtual::class)->definir($posto->id);
    garantePreRequisitosDoPwa($posto->id);

    $lista = $bicos > 0 ? Bico::factory()->count($bicos)->create(['posto_id' => $posto->id])->all() : [];
    $lista = array_values($lista);
    $frentista = frentistaDoPwa($posto);
    app(PostoAtual::class)->limpar();

    return ['posto' => $posto, 'frentista' => $frentista, 'bicos' => $lista];
}

function frentistaDoPwa(Posto $posto, bool $ativo = true, ?string $pin = PIN_PWA): Frentista
{
    $frentista = Frentista::factory()->create(['posto_id' => $posto->id, 'ativo' => $ativo]);

    if ($pin !== null) {
        expect(app(DefinePinDoFrentista::class)($frentista->id, $pin))->toBeTrue();
    }

    return $frentista;
}

function tokenDoFrentista(Posto $posto, Frentista $frentista, string $pin = PIN_PWA): string
{
    $token = postJson("/api/postos/{$posto->id}/frentistas/entrar", ['frentista_id' => $frentista->id, 'pin' => $pin])
        ->assertOk()
        ->json('token');

    return is_string($token) ? $token : throw new RuntimeException('entrar sem token');
}

/**
 * O corpo do envio como o PWA manda pela API. Os números são os de um turno real de exemplo e
 * batem entre si: conferido = soma dos baldes, diferença = encerrante − conferido.
 *
 * @param  array<string, mixed>  $troca
 * @return array<string, mixed>
 */
function corpoDoEnvio(array $troca = []): array
{
    return array_merge([
        'data' => DIA_PWA,
        'chave' => '5b0a1d8e-2f4c-4e1a-9c3b-7d6e5f4a3b21',
        'encerrante' => '3700.00',
        'valor_pix' => '845.10',
        'valor_dinheiro' => '1234.56',
        'valor_moedas' => '12.30',
        'baratao' => '37.45',
        'valor_nota' => '150.00',
        'valor_cartao_debito' => '410.25',
        'valor_cartao_credito' => '998.99',
        'valor_cartao' => '0.00',
        'valor_conferido' => '3688.65',
        'diferenca_calculada' => '11.35',
        'observacoes' => 'Fechamento via PWA Frentista',
    ], $troca);
}

/** O `id` que a resposta JSON trouxe, estreitado (o `json()` do teste devolve `mixed`). */
function idDaResposta(mixed $valor): int
{
    return is_int($valor) ? $valor : throw new RuntimeException('resposta sem id inteiro');
}

/**
 * Token de GERENTE (login do painel) com vínculo de gerente ao `$posto` — para provar que ele não abre
 * rota de frentista. E-mail único por chamada.
 */
function tokenDoGerente(Posto $posto): string
{
    $email = 'gerente.'.$posto->id.'.'.bin2hex(random_bytes(3)).'@teste.com';
    $gerente = Usuario::factory()->create(['email' => $email, 'role' => Role::Gerente, 'senha' => 'senha-do-gerente-1']);
    UsuarioPosto::factory()->create(['usuario_id' => $gerente->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Gerente]);
    $token = postJson('/api/login', ['email' => $email, 'senha' => 'senha-do-gerente-1'])->assertOk()->json('token');

    return is_string($token) ? $token : throw new RuntimeException('login do gerente sem token');
}

/**
 * As três travas de acesso de uma rota do frentista: sem token → 401; token de gerente → 401;
 * frentista de OUTRO posto → 403.
 *
 * @param  array<string, mixed>  $corpo
 */
function exigeFrentistaDoPosto(string $metodo, string $caminho, array $corpo = []): void
{
    ['posto' => $posto] = postoDoPwa();
    ['posto' => $outro, 'frentista' => $deFora] = postoDoPwa();
    $url = "/api/postos/{$posto->id}/{$caminho}";

    json($metodo, $url, $corpo)->assertUnauthorized();
    withToken(tokenDoGerente($posto))->json($metodo, $url, $corpo)->assertUnauthorized();
    app('auth')->forgetGuards();
    withToken(tokenDoFrentista($outro, $deFora))->json($metodo, $url, $corpo)->assertForbidden();
}
