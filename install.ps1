#Requires -Version 5.1
<#
.SYNOPSIS
  Links each configuration file in the repo to where its program reads it.

.DESCRIPTION
  Idempotent: a link that is already right is skipped, and a real file in the way is moved to
  <file>.pre-dotfiles.bak first (with a timestamp if that backup already exists, so no version is
  lost). It also creates ~/.claude/settings.json from 50-claude/settings.template.json, or adds the
  template's missing hooks and deny/ask rules to an existing one, and turns on githooks/post-merge
  so each git pull runs this script again.

  Creating symlinks needs Developer Mode (Settings -> System -> For developers) or an elevated
  shell; the script checks that before touching anything.

.PARAMETER Check
  Only reports the state of each link, the Claude Code hooks and rules and the post-merge hook.
  Changes nothing; exits with 1 if something is wrong.

.EXAMPLE
  .\install.ps1
  .\install.ps1 -Check
#>
[CmdletBinding()]
param([switch]$Check)

$ErrorActionPreference = 'Stop'
$DotfilesRoot = $PSScriptRoot
$BackupSuffix = '.pre-dotfiles.bak'
$SettingsTool = "$DotfilesRoot\50-claude\tools\install-settings.mjs"

# The REAL Documents folder, not "$env:USERPROFILE\Documents": it can be redirected to another
# drive, and PowerShell looks for its profiles at the real path.
$DocumentsPath = [Environment]::GetFolderPath('MyDocuments')

. "$PSScriptRoot\lib\links.ps1"
$Links = Get-DotfilesLink -DotfilesRoot $DotfilesRoot -DocumentsPath $DocumentsPath

# Checked BEFORE touching anything, so no file is moved aside and then left without its link:
# an administrator can always create symlinks; a normal user only with Developer Mode (which
# grants SeCreateSymbolicLinkPrivilege).
function Test-SymlinkCapability {
	$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
	if ($isAdmin) { return $true }
	$devMode = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' -Name AllowDevelopmentWithoutDevLicense -ErrorAction SilentlyContinue).AllowDevelopmentWithoutDevLicense
	return ($devMode -eq 1)
}

function Install-Symlink {
	param(
		[string]$Source,
		[string]$Target,
		[string]$Label
	)

	Write-Host ""
	Write-Host "[$Label]" -ForegroundColor Magenta

	if (-not (Test-Path $Source)) {
		Write-Warning "  Source missing from the repo: $Source - skip"
		return
	}

	$TargetDir = Split-Path $Target -Parent
	if (-not (Test-Path $TargetDir)) {
		Write-Host "  Creating folder: $TargetDir" -ForegroundColor Cyan
		New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
	}

	$Backup = $null
	$state = Get-DotfilesLinkState -Source $Source -Target $Target -DotfilesRoot $DotfilesRoot
	if ($state -eq 'ok') {
		Write-Host "  Already linked - skip" -ForegroundColor Green
		return
	}
	if ($state -eq 'stale') {
		# A link to an old repo path (a folder moved): it holds nothing of its own. Its Delete()
		# never enters the folder it points to; Remove-Item on a folder link can go through it.
		Write-Host "  Link to an old repo path: updating it" -ForegroundColor Cyan
		(Get-Item -LiteralPath $Target -Force).Delete()
	}
	elseif ($state -eq 'foreign') {
		# An existing .bak from an earlier run gets a timestamp instead of being overwritten: that
		# copy may be the only one of the original config.
		$Backup = "$Target$BackupSuffix"
		if (Test-Path $Backup) {
			$Backup = "$Backup." + (Get-Date -Format 'yyyyMMddHHmmss')
		}
		Write-Host "  Backup: $Target -> $Backup" -ForegroundColor Yellow
		Move-Item -Path $Target -Destination $Backup -Force
	}

	# If the link fails (no privilege, for example), the original comes back from the backup so
	# the user is not left without the file.
	try {
		New-Item -ItemType SymbolicLink -Path $Target -Target $Source -Force -ErrorAction Stop | Out-Null
		Write-Host "  Symlink created: $Target -> $Source" -ForegroundColor Green
	}
	catch {
		if ($Backup -and (Test-Path $Backup)) {
			Move-Item -Path $Backup -Destination $Target -Force
			Write-Warning "  Could not create the symlink; the original was restored from $Backup"
		}
		throw
	}
}

# Claude Code only runs a hook registered in ~/.claude/settings.json, a local file that is merged,
# never linked. The merge lives in 50-claude/tools/install-settings.mjs, shared with
# dotfiles-parrot's install.sh, so both systems apply the same template the same way. Node arrives
# in bootstrap.ps1 before this script; without it the links still go in.
function Install-ClaudeSetting {
	Write-Host ""
	Write-Host "[Claude settings.json]" -ForegroundColor Magenta
	if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
		Write-Warning "  node not found: settings.json not merged. Install Node and run .\install.ps1 again."
		return
	}
	node $SettingsTool | ForEach-Object { Write-Host $_ -ForegroundColor Green }
	if ($LASTEXITCODE -ne 0) { throw "install-settings.mjs failed (exit $LASTEXITCODE)" }
}

# After each `git pull` of the repo, git runs githooks/post-merge, which runs this installer
# again: whatever the pull brings (new links, unregistered Claude hooks) is applied with no extra
# step. The folder is versioned; git only needs to be told to use it.
function Install-GitHook {
	Write-Host ""
	Write-Host "[git post-merge]" -ForegroundColor Magenta
	if ((git -C $DotfilesRoot config --get core.hooksPath) -eq 'githooks') {
		Write-Host "  Already on - skip" -ForegroundColor Green
		return
	}
	git -C $DotfilesRoot config core.hooksPath githooks
	Write-Host "  Turned on: each git pull runs install.ps1 again" -ForegroundColor Green
}

# What an install would check, without touching anything: the way to confirm the links are
# still right after moving something in the repo or after a git pull.
function Test-Installation {
	$bad = 0
	$labels = @{ ok = 'ok'; missing = 'MISSING'; stale = 'STALE PATH'; foreign = 'FOREIGN' }
	foreach ($link in $Links) {
		$state = Get-DotfilesLinkState -Source $link.Source -Target $link.Target -DotfilesRoot $DotfilesRoot
		if ($state -ne 'ok') { $bad++ }
		$color = if ($state -eq 'ok') { 'Green' } else { 'Red' }
		Write-Host ('  {0,-11} {1}' -f $labels[$state], $link.Target) -ForegroundColor $color
	}
	if (Get-Command node -ErrorAction SilentlyContinue) {
		foreach ($line in @(node $SettingsTool --check)) {
			$color = if ($line -match '^\s*ok\b') { 'Green' } else { 'Red' }
			Write-Host $line -ForegroundColor $color
		}
		if ($LASTEXITCODE -ne 0) { $bad++ }
	}
	else { $bad++; Write-Host '  MISSING     node, needed to check ~/.claude/settings.json' -ForegroundColor Red }
	if ((git -C $DotfilesRoot config --get core.hooksPath) -eq 'githooks') { Write-Host '  ok          git post-merge on' -ForegroundColor Green }
	else { $bad++; Write-Host '  MISSING     git post-merge (core.hooksPath)' -ForegroundColor Red }
	# The identity is per person, in ~/.gitconfig.local; without it every commit fails.
	if ((git config --get user.name) -and (git config --get user.email)) { Write-Host '  ok          git identity' -ForegroundColor Green }
	else { $bad++; Write-Host '  MISSING     git identity in ~/.gitconfig.local (bootstrap.ps1 -GitName -GitEmail)' -ForegroundColor Red }
	Write-Host ''
	if ($bad -eq 0) { Write-Host "All installed: $($Links.Count) links, hooks, post-merge and git identity." -ForegroundColor Green; return $true }
	Write-Host "$bad checks failed. Run .\install.ps1 to fix them." -ForegroundColor Red
	return $false
}

Write-Host "=== dotfiles-windows installer ===" -ForegroundColor Magenta
Write-Host "Repo root: $DotfilesRoot" -ForegroundColor Gray

if ($Check) {
	Write-Host '-Check mode: report only, nothing changes.' -ForegroundColor Yellow
	if (Test-Installation) { exit 0 }
	exit 1
}

if (-not (Test-SymlinkCapability)) {
	Write-Error "Cannot create symlinks. Turn on Developer Mode (Settings -> System -> For developers) or run PowerShell as administrator. No file was touched."
	exit 1
}

foreach ($link in $Links) {
	Install-Symlink -Source $link.Source -Target $link.Target -Label $link.Label
}

Install-ClaudeSetting
Install-GitHook

Write-Host ""
Write-Host "=== Install complete ===" -ForegroundColor Magenta
Write-Host "Check the state any time with: .\install.ps1 -Check" -ForegroundColor Cyan
Write-Host ""
