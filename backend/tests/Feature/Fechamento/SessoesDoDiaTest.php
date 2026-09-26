<?php

declare(strict_types=1);

use App\Cadastro\Domain\Frentista;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\FechamentoFrentista;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\withToken;

const SEGREDO_P6 = 'segredo-de-teste-das-sessoes';

function b64urlP6(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenP6(string $sub): string
{
    $cabecalho = b64urlP6((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $corpo = b64urlP6((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $cabecalho.'.'.$corpo.'.'.b64urlP6(hash_hmac('sha256', $cabecalho.'.'.$corpo, SEGREDO_P6, binary: true));
}

function usuarioP6(string $sub, int $postoId): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $usuario = Usuario::query()->where('auth_user_id', $sub)->sole();
    $usuario->forceFill(['role' => Role::Operador, 'ativo' => true])->save();
    UsuarioPosto::factory()->create([
        'usuario_id' => $usuario->id, 'posto_id' => $postoId,
        'role' => PapelNoPosto::Operador, 'ativo' => true,
    ]);

    return $usuario->refresh();
}

/**
 * Fixa `data` como INSTANTE, sem passar pelo cast do Eloquent.
 *
 * O cast `datetime` formata sem offset (`Y-m-d H:i:s`) e o Postgres, cuja sessão aqui está em
 * America/Sao_Paulo, lê essa string como horário de Brasília — o instante escorrega três horas.
 * Para testar recorte de dia isso é fatal: a linha cai no dia errado e o teste mede outra coisa.
 * Medido em 20/09/2026.
 */
function fixaInstante(string $tabela, int $id, string $instanteComOffset): void
{
    DB::table($tabela)->where('id', $id)->update(['data' => $instanteComOffset]);
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_P6]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

it('nega sem token e sem vínculo com o posto', function (): void {
    $posto = Posto::factory()->create();
    $outro = Posto::factory()->create();

    getJson("/api/postos/{$posto->id}/sessoes?data=2026-09-20")->assertUnauthorized();

    usuarioP6('a1110000-0000-4000-8000-000000000001', $outro->id);
    withToken(tokenP6('a1110000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/sessoes?data=2026-09-20")->assertForbidden();
});

it('exige a data em formato de dia', function (): void {
    $posto = Posto::factory()->create();
    usuarioP6('a2220000-0000-4000-8000-000000000001', $posto->id);
    $tok = tokenP6('a2220000-0000-4000-8000-000000000001');

    withToken($tok)->getJson("/api/postos/{$posto->id}/sessoes")->assertStatus(422);
    withToken($tok)->getJson("/api/postos/{$posto->id}/sessoes?data=20/09/2026")->assertStatus(422);
});

it('devolve as sessões do dia e não as da véspera, com a fronteira em UTC', function (): void {
    $posto = Posto::factory()->create();
    usuarioP6('a3330000-0000-4000-8000-000000000001', $posto->id);

    $doDia = Fechamento::factory()->create(['posto_id' => $posto->id, 'data' => '2026-09-20 23:30:00+00']);
    fixaInstante('Fechamento', $doDia->id, '2026-09-20 23:30:00+00');
    $daVespera = Fechamento::factory()->create(['posto_id' => $posto->id, 'data' => '2026-09-19 23:30:00+00']);
    fixaInstante('Fechamento', $daVespera->id, '2026-09-19 23:30:00+00');
    $sessaoDoDia = FechamentoFrentista::factory()->create([
        'posto_id' => $posto->id, 'fechamento_id' => $doDia->id,
        'frentista_id' => Frentista::factory()->create(['posto_id' => $posto->id])->id,
    ]);
    FechamentoFrentista::factory()->create([
        'posto_id' => $posto->id, 'fechamento_id' => $daVespera->id,
        'frentista_id' => Frentista::factory()->create(['posto_id' => $posto->id])->id,
    ]);

    $ids = withToken(tokenP6('a3330000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/sessoes?data=2026-09-20")
        ->assertOk()->json('data.*.id');

    expect($ids)->toBe([$sessaoDoDia->id]);
});

it('junta os envios de TODOS os fechamentos do dia — vários frentistas, várias linhas', function (): void {
    // O unique é (data, turno_id), não (data): um dia pode ter mais de um Fechamento. E o dono
    // descreveu o fluxo real — vários frentistas enviam separadamente alimentando o mesmo dia.
    $posto = Posto::factory()->create();
    usuarioP6('a4440000-0000-4000-8000-000000000001', $posto->id);

    $manha = Fechamento::factory()->create(['posto_id' => $posto->id, 'data' => '2026-09-20 00:00:00+00', 'turno_id' => null]);
    $tarde = Fechamento::factory()->create(['posto_id' => $posto->id, 'data' => '2026-09-20 00:00:00+00', 'turno_id' => null]);

    foreach ([$manha, $tarde] as $fechamento) {
        FechamentoFrentista::factory()->create([
            'posto_id' => $posto->id, 'fechamento_id' => $fechamento->id,
            'frentista_id' => Frentista::factory()->create(['posto_id' => $posto->id])->id,
        ]);
    }

    withToken(tokenP6('a4440000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/sessoes?data=2026-09-20")
        ->assertOk()->assertJsonCount(2, 'data');
});

it('não devolve sessão de outro posto, mesmo com o id na rota', function (): void {
    $meu = Posto::factory()->create();
    $alheio = Posto::factory()->create();
    usuarioP6('a5550000-0000-4000-8000-000000000001', $meu->id);

    $fechamentoAlheio = Fechamento::factory()->create(['posto_id' => $alheio->id, 'data' => '2026-09-20 00:00:00+00']);
    FechamentoFrentista::factory()->create([
        'posto_id' => $alheio->id, 'fechamento_id' => $fechamentoAlheio->id,
        'frentista_id' => Frentista::factory()->create(['posto_id' => $alheio->id])->id,
    ]);

    withToken(tokenP6('a5550000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$meu->id}/sessoes?data=2026-09-20")
        ->assertOk()->assertJsonCount(0, 'data');
});

it('balde não informado sai null, NUNCA 0.00 — invariante I8', function (): void {
    // null é "o frentista não informou"; '0.00' é "informou zero". Trocar um pelo outro inventa
    // dado que ninguém digitou. O teste confere no JSON CRU porque é lá que a troca apareceria.
    $posto = Posto::factory()->create();
    usuarioP6('a6660000-0000-4000-8000-000000000001', $posto->id);
    $fechamento = Fechamento::factory()->create(['posto_id' => $posto->id, 'data' => '2026-09-20 00:00:00+00']);
    fixaInstante('Fechamento', $fechamento->id, '2026-09-20 00:00:00+00');
    FechamentoFrentista::factory()->create([
        'posto_id' => $posto->id, 'fechamento_id' => $fechamento->id,
        'frentista_id' => Frentista::factory()->create(['posto_id' => $posto->id])->id,
        'valor_dinheiro' => '1234.56', 'encerrante' => null, 'baratao' => null, 'diferenca_calculada' => null,
    ]);

    $resposta = withToken(tokenP6('a6660000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/sessoes?data=2026-09-20")->assertOk();

    expect($resposta->getContent())
        ->toContain('"encerrante":null')
        ->toContain('"baratao":null')
        ->toContain('"diferenca_calculada":null')
        ->toContain('"valor_dinheiro":"1234.56"');  // dinheiro informado: string decimal, nunca float

    // `expect` próprio: `->not->` encadeado depois de outras chamadas NÃO roda, e o teste passaria
    // fingindo conferir. Já aconteceu na P5; o PHPStan pega, mas só se o expect for separado.
    expect($resposta->getContent())->not->toContain('"encerrante":"0.00"');
});

it('a janela do dia é um INSTANTE, e não o dia do fuso da conexão', function (): void {
    // Canário de 20/09: a conexão desta aplicação está em America/Sao_Paulo, não em UTC. Um
    // `whereDate` recortaria pelo DIA DE BRASÍLIA; a janela recorta por instante UTC, que é como
    // todo escritor grava. Uma linha às 01:00Z do dia 20 é 22:00 do dia 19 em Brasília: o
    // `whereDate` a perde, a janela a mantém. Trocar um pelo outro faz este teste ficar vermelho.
    $posto = Posto::factory()->create();
    usuarioP6('a7770000-0000-4000-8000-000000000001', $posto->id);

    $fechamento = Fechamento::factory()->create(['posto_id' => $posto->id, 'data' => '2026-09-20 01:00:00+00']);
    fixaInstante('Fechamento', $fechamento->id, '2026-09-20 01:00:00+00');
    $sessao = FechamentoFrentista::factory()->create([
        'posto_id' => $posto->id, 'fechamento_id' => $fechamento->id,
        'frentista_id' => Frentista::factory()->create(['posto_id' => $posto->id])->id,
    ]);

    $ids = withToken(tokenP6('a7770000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/sessoes?data=2026-09-20")
        ->assertOk()->json('data.*.id');

    expect($ids)->toBe([$sessao->id]);
});

it('com `ate`, devolve os envios do período inteiro — e nada antes nem depois', function (): void {
    $posto = Posto::factory()->create();
    usuarioP6('a3330000-0000-4000-8000-000000000009', $posto->id);
    $sessaoEm = function (string $instante) use ($posto): int {
        $pai = Fechamento::factory()->create(['posto_id' => $posto->id, 'data' => $instante]);
        fixaInstante('Fechamento', $pai->id, $instante);

        return FechamentoFrentista::factory()->create([
            'posto_id' => $posto->id, 'fechamento_id' => $pai->id,
            'frentista_id' => Frentista::factory()->create(['posto_id' => $posto->id])->id,
        ])->id;
    };
    $sessaoEm('2026-09-19 23:59:00+00');
    $primeiro = $sessaoEm('2026-09-20 00:00:00+00');
    $ultimo = $sessaoEm('2026-09-22 23:59:00+00');
    $sessaoEm('2026-09-23 00:00:00+00');

    $ids = withToken(tokenP6('a3330000-0000-4000-8000-000000000009'))
        ->getJson("/api/postos/{$posto->id}/sessoes?data=2026-09-20&ate=2026-09-22")
        ->assertOk()->json('data.*.id');

    expect($ids)->toEqualCanonicalizing([$primeiro, $ultimo]);
});

it('`ate` antes de `data` ou período acima de 62 dias é recusado', function (): void {
    $posto = Posto::factory()->create();
    $tok = tokenP6('a3330000-0000-4000-8000-000000000010');
    usuarioP6('a3330000-0000-4000-8000-000000000010', $posto->id);

    withToken($tok)->getJson("/api/postos/{$posto->id}/sessoes?data=2026-09-20&ate=2026-09-19")->assertStatus(422);
    withToken($tok)->getJson("/api/postos/{$posto->id}/sessoes?data=2026-01-01&ate=2026-03-04")->assertStatus(422);
    withToken($tok)->getJson("/api/postos/{$posto->id}/sessoes?data=2026-01-01&ate=2026-03-03")->assertOk();
});
