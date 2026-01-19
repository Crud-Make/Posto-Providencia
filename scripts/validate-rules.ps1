$ErrorActionPreference = 'Stop'

$errors = 0
$warnings = 0

function Write-Ok {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "[AVISO] $Message" -ForegroundColor Yellow
}

function Write-Err {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "[ERRO] $Message" -ForegroundColor Red
}

Write-Host 'Validando conformidade com as regras do projeto...' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Verificando branch atual...' -ForegroundColor Cyan
$currentBranch = (git branch --show-current).Trim()

if ($currentBranch -in @('main', 'master')) {
  Write-Err "Você está na branch $currentBranch. Nunca trabalhe diretamente na main/master."
  $errors++
} elseif ($currentBranch -match '^(feature|fix|refactor|docs|style|chore)\/.+') {
  Write-Ok "Branch '$currentBranch' segue o padrão."
} else {
  Write-Warn "Branch '$currentBranch' não segue o padrão recomendado (feature/*, fix/*, refactor/*, docs/*, style/*, chore/*)."
  $warnings++
}

Write-Host ''

Write-Host 'Verificando últimos 5 commits...' -ForegroundColor Cyan
$commitSubjects = git log -5 --pretty=format:%s
$commitLines = ($commitSubjects -split "`n") | Where-Object { $_.Trim().Length -gt 0 }

foreach ($commit in $commitLines) {
  $trimmed = $commit.Trim()
  $isConventional = $trimmed -match '^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?:.+'
  $isMerge = $trimmed -match '^(merge|Merge):.+'
  if ($isConventional -or $isMerge) {
    Write-Ok $trimmed
  } else {
    Write-Err "Commit não segue Conventional Commits: $trimmed"
    $errors++
  }
}

Write-Host ''

Write-Host 'Verificando arquivos modificados...' -ForegroundColor Cyan
$modifiedLines = git status --porcelain
$modifiedCount = (($modifiedLines -split "`n") | Where-Object { $_.Trim().Length -gt 0 }).Count

if ($modifiedCount -gt 0) {
  Write-Warn "Há $modifiedCount arquivo(s) modificado(s) não commitado(s)."
  $warnings++
} else {
  Write-Ok 'Nenhum arquivo pendente.'
}

Write-Host ''

Write-Host 'Verificando documentação em arquivos modificados (staged)...' -ForegroundColor Cyan
$stagedFilesRaw = git diff --name-only --cached
$stagedFiles = ($stagedFilesRaw -split "`n") | Where-Object { $_.Trim().Length -gt 0 }
$stagedTsFiles = $stagedFiles | Where-Object { $_ -match '\.(ts|tsx)$' }

if ($stagedTsFiles.Count -eq 0) {
  Write-Host 'Nenhum arquivo TS/TSX staged.'
} else {
  foreach ($file in $stagedTsFiles) {
    if (-not (Test-Path -LiteralPath $file)) { continue }
    $content = Get-Content -LiteralPath $file -ErrorAction Stop
    $functionCount = ($content | Where-Object { $_ -match '^\s*(const|function|export)' }).Count
    $jsdocCount = ($content | Where-Object { $_ -match '^\s*\/\*\*' }).Count

    if ($functionCount -gt 0 -and $jsdocCount -eq 0) {
      Write-Warn "${file} possui funcoes/exports mas sem JSDoc."
      $warnings++
    } else {
      Write-Ok $file
    }
  }
}

Write-Host ''

Write-Host 'Verificando configuração de porta do servidor...' -ForegroundColor Cyan
$packageJson = Get-Content -LiteralPath 'package.json' -Raw -ErrorAction Stop
if ($packageJson -match 'vite\s+--port\s+3015') {
  Write-Ok 'Porta 3015 configurada corretamente.'
} else {
  Write-Warn "Porta 3015 não encontrada no script 'dev' do package.json."
  $warnings++
}

Write-Host ''
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

if ($errors -eq 0 -and $warnings -eq 0) {
  Write-Ok 'Tudo certo! Projeto em conformidade com as regras.'
  exit 0
}

if ($errors -eq 0) {
  Write-Warn "$warnings aviso(s) encontrado(s)."
  exit 0
}

Write-Err "$errors erro(s) e $warnings aviso(s) encontrado(s)."
exit 1
