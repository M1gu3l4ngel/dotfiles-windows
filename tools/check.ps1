#Requires -Version 5.1
<#
.SYNOPSIS
  Runs the repo's quality and safety checks, the same ones CI runs.

.DESCRIPTION
  Checks the syntax of every .ps1 and runs PSScriptAnalyzer, validates the pure JSON files and
  that the two app lists do not overlap, scans tracked files for user paths and company data,
  requires LF line endings, checks the English-only docs (50-claude/tools/check-docs.mjs), enforces the
  Claude Code layer's line budget, runs the panel, hook and shared tool tests and the task format
  check, fails on a Spanish code comment (50-claude/tools/check-comments.mjs, which prints its
  exemptions), and scans the history with gitleaks when it is installed.

  Exits with a non-zero code if any check fails.

.EXAMPLE
  .\tools\check.ps1
#>

$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$script:failed = 0

function Pass($m) { Write-Host "[ok]  $m" -ForegroundColor Green }
function Fail($m) { Write-Host "[x]   $m" -ForegroundColor Red; $script:failed = 1 }
function Skip($m) { Write-Host "[-]   $m" -ForegroundColor Yellow }

# Tracked files, through git: leaves out .git and anything ignored.
$tracked = git -C $repo ls-files
$ps1Files = $tracked | Where-Object { $_ -like '*.ps1' } | ForEach-Object { Join-Path $repo $_ }
$binExt = '\.(png|jpg|jpeg|gif|ico|ttf|otf|woff|woff2)$'

$synOk = $true
foreach ($f in $ps1Files) {
	$er = $null
	[void][System.Management.Automation.Language.Parser]::ParseFile($f, [ref]$null, [ref]$er)
	if ($er) { $synOk = $false; Fail "syntax: $(Split-Path $f -Leaf)"; $er | ForEach-Object { Write-Host "       $($_.Message)" } }
}
if ($synOk) { Pass "Syntax of $($ps1Files.Count) scripts" }

if (Get-Module -ListAvailable PSScriptAnalyzer) {
	$settings = Join-Path $repo 'PSScriptAnalyzerSettings.psd1'
	$issues = @()
	foreach ($f in $ps1Files) { $issues += Invoke-ScriptAnalyzer -Path $f -Settings $settings }
	if ($issues.Count -eq 0) { Pass 'PSScriptAnalyzer: no warnings' }
	else {
		Fail "PSScriptAnalyzer: $($issues.Count) warnings"
		$issues | ForEach-Object { Write-Host "       $(Split-Path $_.ScriptName -Leaf):$($_.Line) [$($_.RuleName)]" }
	}
}
else { Skip 'PSScriptAnalyzer not installed (Install-Module PSScriptAnalyzer -Scope CurrentUser)' }

# Pure JSON only: the VS Code files are JSONC, with comments.
$jsonPure = @('60-apps\essential.json', '60-apps\optional.json', '10-shell\oh-my-posh\capr4n.omp.json', '50-claude\hooks.local.example.json', '50-claude\settings.template.json', '50-claude\links.json', '.claude\panel.json', '.claude\comments.json')
$jsonOk = $true
foreach ($rel in $jsonPure) {
	$p = Join-Path $repo $rel
	if (Test-Path $p) {
		try { Get-Content $p -Raw | ConvertFrom-Json -ErrorAction Stop | Out-Null }
		catch { $jsonOk = $false; Fail "Invalid JSON: $rel" }
	}
}
if ($jsonOk) { Pass 'Valid JSON (pure JSON files)' }

# The two app lists split the work: bootstrap.ps1 installs essential.json, and optional.json is
# picked by hand. An app in both would be installed twice or sit in the wrong place.
$appIds = @{}
foreach ($name in 'essential', 'optional') {
	$p = Join-Path $repo "60-apps\$name.json"
	try { $appIds[$name] = @((Get-Content $p -Raw | ConvertFrom-Json).Sources.Packages.PackageIdentifier) }
	catch { $appIds[$name] = @() }
}
$appOverlap = @($appIds['essential'] | Where-Object { $appIds['optional'] -contains $_ })
if ($appIds['essential'].Count -eq 0) { Fail 'Apps: 60-apps/essential.json has no packages' }
elseif ($appOverlap.Count -eq 0) { Pass "Apps: $($appIds['essential'].Count) essential and $($appIds['optional'].Count) optional, no overlap" }
else { Fail "Apps in both essential.json and optional.json: $($appOverlap -join ', ')" }

# Paths with a specific user and company data must not be versioned. .claude/ and this
# check.ps1 are left out because they DEFINE the forbidden patterns; naming them there is not a
# leak.
$hygieneFiles = $tracked |
	Where-Object { $_ -notmatch $binExt -and $_ -notlike '.claude/*' -and $_ -ne 'tools/check.ps1' } |
	ForEach-Object { Join-Path $repo $_ }
# Generic patterns, with no sensitive literal: they can live in the public repo.
$badPatterns = @{
	'path with a user (C:\Users\<name>)' = 'C:\\Users\\[A-Za-z0-9._-]+\\'
	'Fabric endpoint'                    = 'fabric\.microsoft'
}
# Sensitive literals (email, company) do NOT go in the public repo: they are read from a local
# file git ignores (tools/hygiene-patterns.local, 'name=pattern' lines) or from the
# DOTFILES_HYGIENE_PATTERNS environment variable (a CI secret, for example).
$patternsFile = Join-Path $PSScriptRoot 'hygiene-patterns.local'
$extraPatterns = @()
if (Test-Path $patternsFile) {
	$extraPatterns = Get-Content $patternsFile
}
elseif ($env:DOTFILES_HYGIENE_PATTERNS) {
	$extraPatterns = $env:DOTFILES_HYGIENE_PATTERNS -split "`n"
}
foreach ($line in $extraPatterns) {
	$t = $line.Trim()
	if (-not $t -or $t.StartsWith('#')) { continue }
	$kv = $line -split '=', 2
	if ($kv.Count -eq 2) { $badPatterns[$kv[0].Trim()] = $kv[1].Trim() }
}
if (@($extraPatterns).Count -eq 0) {
	Skip 'hygiene: sensitive patterns not loaded (create tools/hygiene-patterns.local or set DOTFILES_HYGIENE_PATTERNS)'
}
$hygieneOk = $true
foreach ($name in $badPatterns.Keys) {
	$hits = Select-String -Path $hygieneFiles -Pattern $badPatterns[$name] -ErrorAction SilentlyContinue
	if ($hits) {
		$hygieneOk = $false
		Fail "hygiene - $name :"
		$hits | ForEach-Object { Write-Host "       $(Split-Path $_.Path -Leaf):$($_.LineNumber)" }
	}
}
if ($hygieneOk) { Pass 'Hygiene: no user paths or company data' }

$crlf = @()
foreach ($rel in ($tracked | Where-Object { $_ -notmatch $binExt })) {
	$bytes = [IO.File]::ReadAllBytes((Join-Path $repo $rel))
	if ($bytes -contains 13) { $crlf += $rel }
}
if ($crlf.Count -eq 0) { Pass 'LF line endings' }
else { Fail "CRLF found in: $($crlf -join ', ')" }

# Documents are English only: no X.es.md copy or language selector, and links and anchors resolve
# (50-claude/tools/check-docs.mjs). Besides its defaults (CLAUDE.md, .claude/, the task lists), the
# global rules, the skill and the entorno.md template are Spanish by design, like the agent
# instructions they are. The repo is public, so it also needs every community file a public repo
# carries.
if (Get-Command node -ErrorAction SilentlyContinue) {
	$docsOut = node (Join-Path $repo '50-claude\tools\check-docs.mjs') $repo --community public --exclude 50-claude/rules/ --exclude 50-claude/skills/ --exclude 50-claude/entorno.template.md 2>&1
	if ($LASTEXITCODE -eq 0) { Pass ($docsOut -join ' ') }
	else {
		Fail 'Docs check failed:'
		$docsOut | ForEach-Object { Write-Host "       $_" }
	}
}
else { Skip 'node not installed: docs not checked' }

# CLAUDE.md loads in every session: growing without a cap costs context in all of them.
if (Get-Command node -ErrorAction SilentlyContinue) {
	$budgetOut = node (Join-Path $repo '50-claude\check-budget.mjs') 2>&1
	if ($LASTEXITCODE -eq 0) { Pass 'Claude Code layer budget' }
	else {
		Fail 'Claude Code layer budget exceeded:'
		$budgetOut | Where-Object { $_ -match 'XX' } | ForEach-Object { Write-Host "       $_" }
	}
}
else { Skip 'node not installed: 50-claude/ budget not checked' }

# The global panel's parser and, if this repo uses the panel (.claude/panel.json), that
# docs/tasks.md and docs/backlog.md follow its format: a panel that cannot be generated would stop
# saying the same as the repo.
if (Get-Command node -ErrorAction SilentlyContinue) {
	# TAP output: ASCII only, with 'not ok' on each failure, easy to filter here.
	$panelTests = node --test --test-reporter=tap (Join-Path $repo '50-claude\panel\board.test.mjs') 2>&1
	if ($LASTEXITCODE -eq 0) { Pass "Task panel: $((($panelTests | Select-String '^# pass ') -replace '^# pass ', '')) tests" }
	else {
		Fail 'Task panel: failed tests'
		$panelTests | Select-String 'not ok' | ForEach-Object { Write-Host "       $_" }
	}
	$hookTests = node --test --test-reporter=tap (Join-Path $repo '50-claude\hooks\block-forbidden-commands.test.mjs') 2>&1
	if ($LASTEXITCODE -eq 0) { Pass "Command hook: $((($hookTests | Select-String '^# pass ') -replace '^# pass ', '')) tests" }
	else {
		Fail 'Command hook: failed tests'
		$hookTests | Select-String 'not ok' | ForEach-Object { Write-Host "       $_" }
	}
	# The shared tools other repos and dotfiles-parrot run: their tests are the contract.
	$toolTests = @(Get-ChildItem (Join-Path $repo '50-claude\tools') -Filter '*.test.mjs' | ForEach-Object FullName)
	$toolOut = node --test --test-reporter=tap @toolTests 2>&1
	if ($LASTEXITCODE -eq 0) { Pass "Shared tools: $((($toolOut | Select-String '^# pass ') -replace '^# pass ', '')) tests" }
	else {
		Fail 'Shared tools: failed tests'
		$toolOut | Select-String 'not ok' | ForEach-Object { Write-Host "       $_" }
	}
	# Comments are English (docs/contributing/comments.md); a session that loads an older
	# Spanish-only rule would write them in Spanish again. The exemptions print on every run, the
	# shared ones and this repo's (.claude/comments.json).
	$commentOut = @(node (Join-Path $repo '50-claude\tools\check-comments.mjs') $repo 2>&1)
	if ($LASTEXITCODE -eq 0) {
		Pass $commentOut[0]
		$commentOut | Select-Object -Skip 1 | ForEach-Object { Write-Host "       $_" -ForegroundColor Gray }
	}
	else {
		Fail 'Spanish comments found:'
		$commentOut | ForEach-Object { Write-Host "       $_" }
	}
	$panelCheck = node (Join-Path $repo '50-claude\panel\check.mjs') $repo 2>&1
	if ($LASTEXITCODE -eq 0) { Pass "Task panel: $($panelCheck -join ' ')" }
	else {
		Fail 'Task panel: format of docs/tasks.md or docs/backlog.md'
		$panelCheck | ForEach-Object { Write-Host "       $_" }
	}
}
else { Skip 'node not installed: task panel not tested' }

if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
	gitleaks git --no-banner --redact $repo 2>&1 | Out-Null
	if ($LASTEXITCODE -eq 0) { Pass 'gitleaks: no secrets in the history' }
	else { Fail 'gitleaks: possible secrets (review them)' }
}
else { Skip 'gitleaks not installed (CI runs it on every push)' }

Write-Host ''
if ($script:failed -eq 0) { Write-Host 'All checks passed.' -ForegroundColor Green }
else { Write-Host 'Some checks failed.' -ForegroundColor Red }
exit $script:failed
