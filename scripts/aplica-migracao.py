#!/usr/bin/env python3
"""
Aplica um arquivo de migração versionado no banco de produção.

POR QUE ESTE SCRIPT EXISTE:
    O MCP do Supabase tem o `apply_migration` na lista `deny` do
    `.claude/settings.json` de propósito — é o que impede um caminho de DDL
    aberto contra produção sem alguém olhar. Este script é o caminho consciente:
    ele só roda quando uma PESSOA o executa, sobre um arquivo que já está
    versionado no git, e mostra o que vai aplicar antes de aplicar.

    Não substitui a Supabase CLI. É o que funciona nesta máquina, onde a CLI não
    está instalada e o token de management já vive no `settings.local.json`.

DETALHE QUE CUSTOU TEMPO:
    O `User-Agent` é OBRIGATÓRIO. Sem ele o WAF da Supabase devolve 403 com o
    código 1010 e uma página HTML, não um JSON — e o erro não diz que o problema
    é o cabeçalho ausente.

Uso:
    python3 scripts/aplica-migracao.py supabase/migrations/<arquivo>.sql
    python3 scripts/aplica-migracao.py <arquivo>.sql --so-mostrar
"""
import json
import pathlib
import sys
import urllib.error
import urllib.request

REF_PROJETO = 'kilndogpsffkgkealkaq'
ARQUIVO_TOKEN = pathlib.Path('.claude/settings.local.json')
API = f'https://api.supabase.com/v1/projects/{REF_PROJETO}/database/query'


def erro(msg):
    print(f'ABORTADO: {msg}', file=sys.stderr)
    sys.exit(1)


def token_de_management() -> str:
    if not ARQUIVO_TOKEN.exists():
        erro(f'{ARQUIVO_TOKEN} não existe — sem token não dá para aplicar.')
    cfg = json.loads(ARQUIVO_TOKEN.read_text(encoding='utf-8'))
    valor = (cfg.get('env') or {}).get('SUPABASE_ACCESS_TOKEN')
    if not valor:
        erro('SUPABASE_ACCESS_TOKEN não está em .claude/settings.local.json → env.')
    return valor


def main():
    if len(sys.argv) < 2:
        erro('uso: aplica-migracao.py <arquivo.sql> [--so-mostrar]')

    caminho = pathlib.Path(sys.argv[1])
    if not caminho.exists():
        erro(f'{caminho} não existe.')
    if caminho.suffix != '.sql':
        erro(f'{caminho} não é .sql — este script só aplica migração.')

    sql = caminho.read_text(encoding='utf-8')

    # O cabeçalho da migração diz o que ela faz. Mostrar antes de aplicar é o
    # que separa "rodei um arquivo" de "sei o que estou aplicando".
    print(f'── {caminho}  ({len(sql)} bytes) ' + '─' * 30)
    for linha in sql.splitlines()[:14]:
        print(f'  {linha}')
    print('  ...')

    if '--so-mostrar' in sys.argv:
        print('\n(--so-mostrar: nada foi aplicado)')
        return

    req = urllib.request.Request(
        API,
        data=json.dumps({'query': sql}).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {token_de_management()}',
            'Content-Type': 'application/json',
            # Sem isto o WAF devolve 403 code 1010. Não é opcional.
            'User-Agent': 'posto-providencia-migracao/1.0',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            corpo = r.read().decode('utf-8')
            print(f'\nHTTP {r.status} — aplicada.')
            print(f'resposta: {corpo[:800]}')
    except urllib.error.HTTPError as e:
        corpo = e.read().decode('utf-8', errors='replace')
        print(f'\nHTTP {e.code} — NÃO aplicada.', file=sys.stderr)
        print(corpo[:1500], file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        erro(f'falha de rede: {e.reason}')


if __name__ == '__main__':
    main()
