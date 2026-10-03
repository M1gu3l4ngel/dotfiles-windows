#Requires -Version 5.1
<#
.SYNOPSIS
  Comprueba que la documentacion bilingue este sincronizada.

.DESCRIPTION
  Cada documento X.md (ingles) tiene su pareja X.es.md (espanol). El texto
  traducido no se puede comparar, asi que se compara todo lo que no cambia
  entre idiomas:
    1. Que exista la pareja y que cada uno lleve el selector de idioma en la linea 1
    2. Mismo numero de titulos, filas de tabla y elementos de lista
    3. Bloques de codigo identicos (sin contar la sangria)
    4. Mismos enlaces relativos, en el mismo orden, cada uno a su idioma
    5. Enlaces que existen y anclas (#seccion) que existen en su destino

  Lo ejecuta tools/check.ps1 (y por tanto el CI). Sin dependencias: solo
  PowerShell y git. Sale con 1 si algo falla, con la lista de problemas.

.EXAMPLE
  .\tools\check-docs.ps1
#>

param(
	# Raiz del repo a comprobar. Por defecto, el repo de este script.
	[string]$Root = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = 'Stop'

# ----- ALCANCE -----
# Instrucciones para Claude Code (no documentacion para el lector): solo en espanol.
$excludedPrefixes = @('.claude/')
$excludedFiles = @('CLAUDE.md', 'claude/CLAUDE.md')

$esSuffix = '.es.md'
# Los .ps1 del repo son ASCII puro (PowerShell 5.1): la enie se construye.
$espanol = 'Espa' + [char]0x00F1 + 'ol'

function Get-DocFile {
	param([string]$RepoRoot)
	# --others incluye los documentos nuevos aun sin `git add`: el check debe
	# verlos antes del commit, no despues.
	$listed = git -C $RepoRoot ls-files --cached --others --exclude-standard -- '*.md'
	$result = @()
	foreach ($file in ($listed | Sort-Object -Unique)) {
		if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot $file))) { continue }
		if ($excludedFiles -contains $file) { continue }
		$skip = $false
		foreach ($prefix in $excludedPrefixes) {
			if ($file.StartsWith($prefix)) { $skip = $true }
		}
		if (-not $skip) { $result += $file }
	}
	$result
}

function Get-Slug {
	# Mismo algoritmo que GitHub: minusculas, sin puntuacion (las letras con
	# tilde se conservan), espacios a guiones y sufijo -1, -2... si se repite.
	param([string]$Heading, [hashtable]$Seen)
	$base = ($Heading.Trim().ToLowerInvariant() -replace '[^\w\- ]', '') -replace ' ', '-'
	$n = 0
	if ($Seen.ContainsKey($base)) { $n = $Seen[$base] }
	$Seen[$base] = $n + 1
	if ($n -eq 0) { $base } else { "$base-$n" }
}

function Read-Doc {
	param([string]$Path)
	$lines = [IO.File]::ReadAllLines($Path, [Text.Encoding]::UTF8)
	$doc = @{
		First    = ''
		Headings = 0
		Rows     = 0
		Items    = 0
		Code     = New-Object System.Collections.Generic.List[string]
		Links    = New-Object System.Collections.Generic.List[string]
		Anchors  = New-Object 'System.Collections.Generic.HashSet[string]'
	}
	if ($lines.Count -gt 0) { $doc.First = $lines[0] }
	$seen = @{}
	$inside = $false
	# La linea 1 es el selector de idioma: se valida aparte.
	for ($i = 1; $i -lt $lines.Count; $i++) {
		$line = $lines[$i]
		$stripped = $line.Trim()
		if ($stripped.StartsWith('```')) {
			$inside = -not $inside
			$doc.Code.Add('```')
			continue
		}
		if ($inside) {
			# Sin la sangria: un bloque dentro de una lista la lleva.
			$doc.Code.Add($stripped)
			continue
		}
		if ($line -match '^#{1,6} ') {
			$doc.Headings += 1
			[void]$doc.Anchors.Add((Get-Slug -Heading $line.TrimStart('#') -Seen $seen))
		}
		elseif ($stripped.StartsWith('|')) { $doc.Rows += 1 }
		elseif ($line -match '^\s*([-*]|\d+\.) ') { $doc.Items += 1 }
		foreach ($m in [regex]::Matches($line, '\]\(([^)\s]+)\)')) {
			$target = $m.Groups[1].Value
			if ($target -cnotmatch '^[a-z]+:') { $doc.Links.Add($target) }
		}
	}
	$doc
}

function Resolve-DocPath {
	# Ruta relativa al repo (con /) del destino de un enlace escrito en $From.
	param([string]$From, [string]$Target)
	$parts = New-Object System.Collections.Generic.List[string]
	$dirs = $From -split '/'
	for ($k = 0; $k -lt $dirs.Count - 1; $k++) { $parts.Add($dirs[$k]) }
	foreach ($seg in (($Target -replace '\\', '/') -split '/')) {
		if ($seg -eq '' -or $seg -eq '.') { continue }
		if ($seg -eq '..') {
			if ($parts.Count -gt 0) { $parts.RemoveAt($parts.Count - 1) } else { $parts.Add('..') }
			continue
		}
		$parts.Add($seg)
	}
	$parts -join '/'
}

function Split-Anchor {
	# 'x.md#ancla' -> @('x.md', 'ancla')
	param([string]$Target)
	$hash = $Target.IndexOf('#')
	if ($hash -lt 0) { return @($Target, '') }
	@($Target.Substring(0, $hash), $Target.Substring($hash + 1))
}

$files = @(Get-DocFile -RepoRoot $Root)
$docs = @{}
foreach ($f in $files) { $docs[$f] = Read-Doc -Path (Join-Path $Root $f) }
$problems = New-Object System.Collections.Generic.List[string]

# ----- PAREJAS: selector, estructura, codigo y enlaces -----
$pairs = 0
foreach ($en in $files) {
	if ($en.EndsWith($esSuffix)) {
		if (-not $docs.ContainsKey($en.Substring(0, $en.Length - $esSuffix.Length) + '.md')) {
			$problems.Add("${en}: falta su version en ingles")
		}
		continue
	}
	$es = $en.Substring(0, $en.Length - 3) + $esSuffix
	if (-not $docs.ContainsKey($es)) {
		$problems.Add("${en}: falta su version en espanol ($es)")
		continue
	}
	$pairs += 1
	$a = $docs[$en]
	$b = $docs[$es]
	$name = Split-Path $en -Leaf
	$base = $name.Substring(0, $name.Length - 3)
	if ($a.First -cne "**English** | [$espanol]($base$esSuffix)") {
		$problems.Add("${en}: la linea 1 debe ser el selector de idioma")
	}
	if ($b.First -cne "[English]($name) | **$espanol**") {
		$problems.Add("${es}: la linea 1 debe ser el selector de idioma")
	}
	foreach ($pair in @(@('Headings', 'titulos'), @('Rows', 'filas de tabla'), @('Items', 'elementos de lista'))) {
		$key = $pair[0]
		if ($a[$key] -ne $b[$key]) {
			$problems.Add("$en / ${es}: $($pair[1]) $($a[$key]) / $($b[$key])")
		}
	}
	if (($a.Code -join "`n") -cne ($b.Code -join "`n")) {
		$problems.Add("$en / ${es}: los bloques de codigo difieren")
	}
	# Mismo destino quitando el idioma y el ancla (las anclas se traducen con
	# el titulo).
	$linksEn = @($a.Links | ForEach-Object { (Split-Anchor $_)[0] })
	$linksEs = @($b.Links | ForEach-Object { (Split-Anchor $_)[0] -replace '\.es\.md$', '.md' })
	if (($linksEn -join "`n") -cne ($linksEs -join "`n")) {
		$problems.Add("$en / ${es}: los enlaces no coinciden")
	}
}

# ----- ENLACES: existen, apuntan a su idioma y sus anclas existen -----
foreach ($path in $files) {
	$spanish = $path.EndsWith($esSuffix)
	foreach ($target in $docs[$path].Links) {
		$filePart, $anchor = Split-Anchor $target
		$dest = if ($filePart) { Resolve-DocPath -From $path -Target $filePart } else { $path }
		if (-not (Test-Path -LiteralPath (Join-Path $Root $dest))) {
			$problems.Add("${path}: enlace roto a $target")
			continue
		}
		if ($dest.EndsWith('.md')) {
			$isEs = $dest.EndsWith($esSuffix)
			if ($spanish -and -not $isEs -and $docs.ContainsKey($dest.Substring(0, $dest.Length - 3) + $esSuffix)) {
				$problems.Add("${path}: $target apunta a la version en ingles")
			}
			if (-not $spanish -and $isEs) {
				$problems.Add("${path}: $target apunta a la version en espanol")
			}
		}
		if ($anchor -and $docs.ContainsKey($dest) -and -not $docs[$dest].Anchors.Contains($anchor)) {
			$problems.Add("${path}: el ancla #$anchor no existe en $dest")
		}
	}
}

if ($problems.Count -gt 0) {
	$problems | ForEach-Object { Write-Output $_ }
	exit 1
}
Write-Output "Documentacion bilingue: $pairs parejas sincronizadas"
exit 0
