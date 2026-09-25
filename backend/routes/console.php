<?php

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Pessoas\Application\DefineUsuario;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Cria o usuário (ou redefine a senha de quem já existe) e liga aos postos. Enquanto não houver
| "esqueci a senha" por e-mail, é por aqui que a conta nasce (#102).
|   php artisan usuario:definir postoprovidenciaa@gmail.com "Elias" --role=GERENTE --posto=1:gerente
*/
Artisan::command('usuario:definir {email} {nome} {--role=OPERADOR} {--posto=* : posto_id:papel, ex. 1:gerente}', function (DefineUsuario $define): int {
    $email = $this->argument('email');
    $nome = $this->argument('nome');
    $opcaoRole = $this->option('role');
    $role = is_string($opcaoRole) ? Role::tryFrom(strtoupper($opcaoRole)) : null;
    if (! is_string($email) || ! is_string($nome) || $role === null) {
        $this->error('role inválida: use ADMIN, GERENTE, OPERADOR ou FRENTISTA.');

        return 1;
    }

    $vinculos = [];
    $pares = $this->option('posto');
    foreach (is_array($pares) ? $pares : [] as $par) {
        [$postoId, $papel] = array_pad(explode(':', is_string($par) ? $par : '', 2), 2, 'operador');
        $papelNoPosto = PapelNoPosto::tryFrom(strtolower($papel));
        if (! ctype_digit($postoId) || $papelNoPosto === null) {
            $this->error('--posto inválido. Formato: posto_id:papel (admin, gerente ou operador).');

            return 1;
        }
        $vinculos[(int) $postoId] = $papelNoPosto;
    }

    $senha = $this->secret('Senha (mínimo 8 caracteres)');
    if (! is_string($senha) || mb_strlen($senha) < 8 || $senha !== $this->secret('Repita a senha')) {
        $this->error('Senha curta ou as duas não conferem. Nada foi gravado.');

        return 1;
    }

    $usuario = $define($email, $nome, $role, $senha, $vinculos);
    $this->info("Usuário {$usuario->id} ({$usuario->email}) definido como {$role->value}.");

    return 0;
})->purpose('Cria ou atualiza um usuário do painel e seus vínculos com posto');
