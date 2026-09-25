<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

use function Pest\Laravel\withToken;

require_once __DIR__.'/Cenario.php';

/*
| POST /api/postos/{posto}/presenca (#101): o sinal de vida do frentista do TOKEN. `visto_em` é a
| hora do servidor (trigger `carimba_visto_em`), nunca a do celular.
*/

it('marca a presença do frentista do token, no posto dele, com a hora do servidor', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();

    withToken(tokenDoFrentista($posto, $frentista))->postJson("/api/postos/{$posto->id}/presenca", [
        'visto_em' => '2099-01-01T00:00:00Z',
        'frentista_id' => 999999,
    ])->assertNoContent();

    $linha = (array) DB::table('PresencaFrentista')->where('frentista_id', $frentista->id)->first();
    expect($linha['posto_id'])->toBe($posto->id)
        ->and(DB::table('PresencaFrentista')->where('frentista_id', $frentista->id)
            ->selectRaw("visto_em > now() - interval '1 minute' and visto_em <= now() as recente")->value('recente'))->toBeTrue()
        ->and(DB::table('PresencaFrentista')->where('frentista_id', 999999)->exists())->toBeFalse();
});

it('bater de novo atualiza a mesma linha (um frentista, uma linha)', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $token = tokenDoFrentista($posto, $frentista);

    withToken($token)->postJson("/api/postos/{$posto->id}/presenca")->assertNoContent();
    withToken($token)->postJson("/api/postos/{$posto->id}/presenca")->assertNoContent();

    expect(DB::table('PresencaFrentista')->where('frentista_id', $frentista->id)->count())->toBe(1);
});
