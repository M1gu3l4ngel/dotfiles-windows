#Requires -Version 5.1
<#
.SYNOPSIS
  Checks that the bilingual documentation is in sync.

.DESCRIPTION
  Each X.md document (English) has its X.es.md pair (Spanish). Translated text cannot be
  compared, so the check compares everything that does not change between languages:
    1. The pair exists and each one has the language selector on line 1
    2. Same number of headings, table rows and list items
    3. Identical code blocks (ignoring indentation)
    4. Same relative links, in the same order, each one to its own language
    5. Links that exist and anchors (#section) that exist in their target

  tools/check.ps1 runs it, and so does CI. No dependencies beyond PowerShell and git. Exits with 1
  and the list of problems if anything fails.

.PARAMETER Root
  Root of the repo to check. Defaults to this script's repo.

.EXAMPLE
  .\tools\check-docs.ps1
#>

param(
	[string]$Root = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = 'Stop'

# Instructions for Claude Code (not documentation for the reader) are Spanish only. So are the
# task panel lists: they are the agent's work, and the panel reads their Spanish headings.
$excludedPrefixes = @('.claude/', '50-claude/rules/', '50-claude/skills/')
$excludedFiles = @('CLAUDE.md', '50-claude/CLAUDE.md', '50-claude/entorno.template.md', 'docs/tasks.md', 'docs/backlog.md')

$esSuffix = '.es.md'
# The repo's .ps1 files are pure ASCII (PowerShell 5.1), so the n with tilde is built.
$espanol = 'Espa' + [char]0x00F1 + 'ol'

function Get-DocFile {
	param([string]$RepoRoot)
	# --others includes new documents not yet added: the check must see them before the commit,
	# not after.
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
	# The same algorithm as GitHub: lowercase, no punctuation (accented letters stay), spaces to
	# hyphens and a -1, -2... suffix when repeated.
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
	# Line 1 is the language selector: it is validated separately.
	for ($i = 1; $i -lt $lines.Count; $i++) {
		$line = $lines[$i]
		$stripped = $line.Trim()
		if ($stripped.StartsWith('```')) {
			$inside = -not $inside
			$doc.Code.Add('```')
			continue
		}
		if ($inside) {
			# Without indentation: a block inside a list carries it.
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
	# Repo-relative path (with /) of the target of a link written in $From.
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
	# 'x.md#anchor' -> @('x.md', 'anchor')
	param([string]$Target)
	$hash = $Target.IndexOf('#')
	if ($hash -lt 0) { return @($Target, '') }
	@($Target.Substring(0, $hash), $Target.Substring($hash + 1))
}

$files = @(Get-DocFile -RepoRoot $Root)
$docs = @{}
foreach ($f in $files) { $docs[$f] = Read-Doc -Path (Join-Path $Root $f) }
$problems = New-Object System.Collections.Generic.List[string]

$pairs = 0
foreach ($en in $files) {
	if ($en.EndsWith($esSuffix)) {
		if (-not $docs.ContainsKey($en.Substring(0, $en.Length - $esSuffix.Length) + '.md')) {
			$problems.Add("${en}: missing its English version")
		}
		continue
	}
	$es = $en.Substring(0, $en.Length - 3) + $esSuffix
	if (-not $docs.ContainsKey($es)) {
		$problems.Add("${en}: missing its Spanish version ($es)")
		continue
	}
	$pairs += 1
	$a = $docs[$en]
	$b = $docs[$es]
	$name = Split-Path $en -Leaf
	$base = $name.Substring(0, $name.Length - 3)
	if ($a.First -cne "**English** | [$espanol]($base$esSuffix)") {
		$problems.Add("${en}: line 1 must be the language selector")
	}
	if ($b.First -cne "[English]($name) | **$espanol**") {
		$problems.Add("${es}: line 1 must be the language selector")
	}
	foreach ($pair in @(@('Headings', 'headings'), @('Rows', 'table rows'), @('Items', 'list items'))) {
		$key = $pair[0]
		if ($a[$key] -ne $b[$key]) {
			$problems.Add("$en / ${es}: $($pair[1]) $($a[$key]) / $($b[$key])")
		}
	}
	if (($a.Code -join "`n") -cne ($b.Code -join "`n")) {
		$problems.Add("$en / ${es}: code blocks differ")
	}
	# Same target once the language and the anchor are removed (anchors are translated with
	# their heading).
	$linksEn = @($a.Links | ForEach-Object { (Split-Anchor $_)[0] })
	$linksEs = @($b.Links | ForEach-Object { (Split-Anchor $_)[0] -replace '\.es\.md$', '.md' })
	if (($linksEn -join "`n") -cne ($linksEs -join "`n")) {
		$problems.Add("$en / ${es}: links do not match")
	}
}

foreach ($path in $files) {
	$spanish = $path.EndsWith($esSuffix)
	foreach ($target in $docs[$path].Links) {
		$filePart, $anchor = Split-Anchor $target
		$dest = if ($filePart) { Resolve-DocPath -From $path -Target $filePart } else { $path }
		if (-not (Test-Path -LiteralPath (Join-Path $Root $dest))) {
			$problems.Add("${path}: broken link to $target")
			continue
		}
		if ($dest.EndsWith('.md')) {
			$isEs = $dest.EndsWith($esSuffix)
			if ($spanish -and -not $isEs -and $docs.ContainsKey($dest.Substring(0, $dest.Length - 3) + $esSuffix)) {
				$problems.Add("${path}: $target points to the English version")
			}
			if (-not $spanish -and $isEs) {
				$problems.Add("${path}: $target points to the Spanish version")
			}
		}
		if ($anchor -and $docs.ContainsKey($dest) -and -not $docs[$dest].Anchors.Contains($anchor)) {
			$problems.Add("${path}: anchor #$anchor does not exist in $dest")
		}
	}
}

if ($problems.Count -gt 0) {
	$problems | ForEach-Object { Write-Output $_ }
	exit 1
}
Write-Output "Bilingual docs: $pairs pairs in sync"
exit 0
