# Script de validação das regras do projeto (PowerShell Version)
# Verifica se commits, branches e código seguem os padrões definidos

Write-Host "Validando conformidade com .cursorrules..."
Write-Host ""

$ErrorActionPreference = "Stop"
$errors = 0
$warnings = 0

# Cores
function Write-Green ($text) { Write-Host "OK: $text" -ForegroundColor Green }
function Write-Red ($text) { Write-Host "ERRO: $text" -ForegroundColor Red }
function Write-Yellow ($text) { Write-Host "AVISO: $text" -ForegroundColor Yellow }

# 1. Verificar branch atual
Write-Host "Verificando branch atual..."
$currentBranch = git branch --show-current
if ($currentBranch -eq "main" -or $currentBranch -eq "master") {
    Write-Red "ERRO: Voce esta na branch $currentBranch!"
    Write-Host "   Regra violada: Nunca trabalhe diretamente na main/master"
    Write-Host "   Crie uma branch: git checkout -b feature/nome-da-feature"
    $errors++
} else {
    if ($currentBranch -match "^(feature|fix|refactor|docs|style|chore)/.+") {
        Write-Green "Branch '$currentBranch' segue o padrao"
    } else {
        Write-Yellow "AVISO: Branch '$currentBranch' nao segue o padrao recomendado"
        Write-Host "   Padrao esperado: feature/*, fix/*, refactor/*, docs/*, style/*, chore/*"
        $warnings++
    }
}

Write-Host ""

# 2. Verificar Conventional Commits (ultimos 5)
Write-Host "Verificando ultimos 5 commits..."
$commits = git log -5 --pretty=format:"%s"
foreach ($commit in $commits) {
    if ($commit -match "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?:.+" -or $commit -match "^(merge|Merge):.+") {
        Write-Green "$commit"
    } else {
        Write-Red "$commit"
        Write-Host "   Nao segue Conventional Commits (feat:, fix:, docs:, etc.)"
        $errors++
    }
}

Write-Host ""

# 3. Verificar arquivos modificados
Write-Host "Verificando arquivos modificados..."
$status = git status --porcelain
if ($status) {
    $modifiedCount = ($status | Measure-Object -Line).Lines
    Write-Yellow "Ha $modifiedCount arquivo(s) modificado(s) nao commitado(s)"
    Write-Host "   Lembre-se: commits pequenos e incrementais!"
    $warnings++
} else {
    Write-Green "Nenhum arquivo pendente"
}

Write-Host ""

# 4. Verificar JSDoc em arquivos TS/TSX modificados
Write-Host "Verificando documentacao em arquivos modificados..."
$modifiedFiles = git diff --name-only --cached, HEAD | Select-String -Pattern "\.(ts|tsx)$"

if ($modifiedFiles) {
    foreach ($fileObj in $modifiedFiles) {
        $file = $fileObj.ToString()
        if (Test-Path $file) {
            $content = Get-Content $file -Raw
            $hasFunctions = $content -match "(export\s+function|export\s+const|function\s+\w+)"
            $hasJSDoc = $content -match "/\*\*"
            
            if ($hasFunctions -and -not $hasJSDoc) {
                Write-Yellow "${file}: Possui funcoes mas parece nao ter JSDoc"
                $warnings++
            } else {
                Write-Green "$file"
            }
        }
    }
} else {
    Write-Host "   Nenhum arquivo TS/TSX modificado recentemente para verificacao"
}

Write-Host ""

# 5. Verificar Type Check e Lint
Write-Host "Executando verificacoes de qualidade (Type Check e Lint)..."

Write-Host "   Executando tsc --noEmit..."
try {
    cmd /c "npx tsc --noEmit"
    if ($LASTEXITCODE -eq 0) {
        Write-Green "TypeScript Check: OK"
    } else {
        Write-Red "TypeScript Check: FALHOU"
        $errors++
    }
} catch {
    Write-Red "Erro ao executar tsc"
    $errors++
}

Write-Host "   Executando eslint..."
try {
    cmd /c "npx eslint . --ext .ts,.tsx --max-warnings=0"
    if ($LASTEXITCODE -eq 0) {
        Write-Green "ESLint: OK"
    } else {
        Write-Red "ESLint: FALHOU (verifique output acima se houver)"
        $errors++
    }
} catch {
    Write-Red "Erro ao executar eslint"
    $errors++
}

Write-Host ""
Write-Host "----------------------------------------"

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Green "Tudo certo! Projeto em conformidade com as regras."
    exit 0
} elseif ($errors -eq 0) {
    Write-Yellow "$warnings aviso(s) encontrado(s)"
    Write-Host "   Considere corrigir para manter a qualidade do codigo"
    exit 0
} else {
    Write-Red "$errors erro(s) e $warnings aviso(s) encontrado(s)"
    Write-Host "   Corrija os erros antes de continuar"
    exit 1
}
