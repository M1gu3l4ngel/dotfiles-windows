#Requires -Version 5.1
<#
.SYNOPSIS
  Comprobaciones de calidad y seguridad del repo. Las mismas que corre el CI.

.DESCRIPTION
  1. Sintaxis de todos los .ps1
  2. PSScriptAnalyzer (con PSScriptAnalyzerSettings.psd1)
  3. JSON valido (archivos de JSON puro)
  4. Higiene del repo publico: sin rutas C:\Users\<usuario> ni datos de empresa
  5. Finales de linea LF (sin CRLF)
  6. Secretos con gitleaks (si esta instalado)

  Sale con codigo distinto de 0 si alguna comprobacion falla.

.EXAMPLE
  .\tools\check.ps1
#>

$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$script:failed = 0

function Pass($m) { Write-Host "[ok]  $m" -ForegroundColor Green }
function Fail($m) { Write-Host "[x]   $m" -ForegroundColor Red; $script:failed = 1 }
function Skip($m) { Write-Host "[-]   $m" -ForegroundColor Yellow }

# Archivos versionados (via git: excluye .git y lo ignorado).
$tracked = git -C $repo ls-files
$ps1Files = $tracked | Where-Object { $_ -like '*.ps1' } | ForEach-Object { Join-Path $repo $_ }
$binExt = '\.(png|jpg|jpeg|gif|ico|ttf|otf|woff|woff2)$'

# ----- 1. SINTAXIS -----
$synOk = $true
foreach ($f in $ps1Files) {
	$er = $null
	[void][System.Management.Automation.Language.Parser]::ParseFile($f, [ref]$null, [ref]$er)
	if ($er) { $synOk = $false; Fail "sintaxis: $(Split-Path $f -Leaf)"; $er | ForEach-Object { Write-Host "       $($_.Message)" } }
}
if ($synOk) { Pass "Sintaxis de $($ps1Files.Count) scripts" }

# ----- 2. PSSCRIPTANALYZER -----
if (Get-Module -ListAvailable PSScriptAnalyzer) {
	$settings = Join-Path $repo 'PSScriptAnalyzerSettings.psd1'
	$issues = @()
	foreach ($f in $ps1Files) { $issues += Invoke-ScriptAnalyzer -Path $f -Settings $settings }
	if ($issues.Count -eq 0) { Pass 'PSScriptAnalyzer sin avisos' }
	else {
		Fail "PSScriptAnalyzer: $($issues.Count) avisos"
		$issues | ForEach-Object { Write-Host "       $(Split-Path $_.ScriptName -Leaf):$($_.Line) [$($_.RuleName)]" }
	}
}
else { Skip 'PSScriptAnalyzer no instalado (Install-Module PSScriptAnalyzer -Scope CurrentUser)' }

# ----- 3. JSON VALIDO (solo JSON puro; los de VS Code son JSONC con comentarios) -----
$jsonPure = @('apps\winget-dev.json', 'oh-my-posh\capr4n.omp.json')
$jsonOk = $true
foreach ($rel in $jsonPure) {
	$p = Join-Path $repo $rel
	if (Test-Path $p) {
		try { Get-Content $p -Raw | ConvertFrom-Json -ErrorAction Stop | Out-Null }
		catch { $jsonOk = $false; Fail "JSON invalido: $rel" }
	}
}
if ($jsonOk) { Pass 'JSON valido (JSON puro)' }

# ----- 4. HIGIENE DEL REPO PUBLICO -----
# Rutas con un usuario concreto y datos de empresa no deben estar versionados.
# Se excluye .claude/ porque las reglas NOMBRAN los patrones prohibidos (para
# prohibirlos); mencionarlos ahi no es una fuga.
$hygieneFiles = $tracked | Where-Object { $_ -notmatch $binExt -and $_ -notlike '.claude/*' } | ForEach-Object { Join-Path $repo $_ }
$badPatterns = @{
	'ruta con usuario (C:\Users\<nombre>)' = 'C:\\Users\\[A-Za-z0-9._-]+\\'
	'dominio de empresa (REDACTED)'        = 'REDACTED'
	'endpoint de Fabric'                   = 'fabric\.microsoft'
	'correo personal'                      = 'REDACTED'
}
$hygieneOk = $true
foreach ($name in $badPatterns.Keys) {
	$hits = Select-String -Path $hygieneFiles -Pattern $badPatterns[$name] -ErrorAction SilentlyContinue
	if ($hits) {
		$hygieneOk = $false
		Fail "higiene - $name :"
		$hits | ForEach-Object { Write-Host "       $(Split-Path $_.Path -Leaf):$($_.LineNumber)" }
	}
}
if ($hygieneOk) { Pass 'Higiene: sin rutas de usuario ni datos de empresa' }

# ----- 5. FINALES DE LINEA LF -----
$crlf = @()
foreach ($rel in ($tracked | Where-Object { $_ -notmatch $binExt })) {
	$bytes = [IO.File]::ReadAllBytes((Join-Path $repo $rel))
	if ($bytes -contains 13) { $crlf += $rel }
}
if ($crlf.Count -eq 0) { Pass 'Finales de linea LF' }
else { Fail "CRLF encontrado en: $($crlf -join ', ')" }

# ----- 6. SECRETOS (gitleaks, si esta disponible) -----
if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
	gitleaks git --no-banner --redact $repo 2>&1 | Out-Null
	if ($LASTEXITCODE -eq 0) { Pass 'gitleaks: sin secretos en el historial' }
	else { Fail 'gitleaks: posibles secretos (revisar)' }
}
else { Skip 'gitleaks no instalado (el CI lo corre en cada push)' }

Write-Host ''
if ($script:failed -eq 0) { Write-Host 'Todas las comprobaciones pasaron.' -ForegroundColor Green }
else { Write-Host 'Hay comprobaciones fallidas.' -ForegroundColor Red }
exit $script:failed
