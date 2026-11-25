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

# Adds to $Settings the $Template hooks it does not register, compared by event and file
# ("Stop: x.mjs"): a hook registered for one event can be missing from another the template added
# later. It goes into the group with the same matcher, or a new one. Returns what it added; the
# rest of $Settings is left as is.
function Add-MissingHook {
	param($Settings, $Template)
	$added = @()
	if (-not $Settings.hooks) { $Settings | Add-Member -NotePropertyName hooks -NotePropertyValue ([pscustomobject]@{}) }
	foreach ($hookEvent in $Template.hooks.PSObject.Properties) {
		$name = $hookEvent.Name
		if (-not $Settings.hooks.$name) { $Settings.hooks | Add-Member -NotePropertyName $name -NotePropertyValue @() -Force }
		foreach ($group in @($hookEvent.Value)) {
			foreach ($hook in @($group.hooks)) {
				if ($hook.command -notmatch 'hooks/([\w-]+\.mjs)') { continue }
				$file = $Matches[1]
				$registered = @($Settings.hooks.$name) | ForEach-Object { @($_.hooks) } |
					Where-Object { $_.command -match [regex]::Escape($file) }
				if ($registered) { continue }
				$target = @($Settings.hooks.$name) | Where-Object { $_.matcher -eq $group.matcher } | Select-Object -First 1
				if ($target) { $target.hooks = @($target.hooks) + $hook }
				else {
					$newGroup = [ordered]@{}
					if ($null -ne $group.matcher) { $newGroup.matcher = $group.matcher }
					$newGroup.hooks = @($hook)
					$Settings.hooks.$name = @($Settings.hooks.$name) + [pscustomobject]$newGroup
				}
				$added += "${name}: $file"
			}
		}
	}
	$added
}

# Adds to $Settings the $Template `deny` and `ask` rules it lacks. It never removes: each
# machine's own rules stay. Without this, a new safety rule in the template never reached an
# installed machine. Returns what it added.
function Add-MissingPermission {
	param($Settings, $Template)
	$added = @()
	if (-not $Settings.permissions) { $Settings | Add-Member -NotePropertyName permissions -NotePropertyValue ([pscustomobject]@{}) }
	foreach ($kind in 'deny', 'ask') {
		$current = @($Settings.permissions.$kind | Where-Object { $_ })
		$missing = @($Template.permissions.$kind | Where-Object { $_ -and $current -notcontains $_ })
		if ($missing.Count -eq 0) { continue }
		$Settings.permissions | Add-Member -NotePropertyName $kind -NotePropertyValue (@($current) + $missing) -Force
		$added += $missing | ForEach-Object { "${kind}: $_" }
	}
	$added
}

# Claude Code only runs a hook registered in ~/.claude/settings.json. That file is local (it holds
# the user's path and whatever Claude Code writes on each machine), so it is not linked: if it is
# missing it is created from the template with this machine's home; if it exists, only the
# template's missing hooks and rules are added, with a backup first.
function Install-ClaudeSetting {
	param(
		[string]$TemplatePath,
		[string]$SettingsPath
	)

	Write-Host ""
	Write-Host "[Claude settings.json]" -ForegroundColor Magenta
	# Forward slashes in JSON: a backslash would need escaping.
	$template = [IO.File]::ReadAllText($TemplatePath, [Text.Encoding]::UTF8)
	$template = $template.Replace('REEMPLAZA_RUTA_HOME', ($env:USERPROFILE -replace '\\', '/'))
	# UTF-8 without BOM: Claude Code does not read the file if it starts with a BOM.
	$utf8 = New-Object Text.UTF8Encoding $false

	if (-not (Test-Path $SettingsPath)) {
		$settingsDir = Split-Path $SettingsPath -Parent
		if (-not (Test-Path $settingsDir)) { New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null }
		[IO.File]::WriteAllText($SettingsPath, $template, $utf8)
		Write-Host "  Created from the template: $SettingsPath" -ForegroundColor Green
		return
	}

	$settings = [IO.File]::ReadAllText($SettingsPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
	$templateObject = $template | ConvertFrom-Json
	$addedHooks = @(Add-MissingHook -Settings $settings -Template $templateObject)
	$addedRules = @(Add-MissingPermission -Settings $settings -Template $templateObject)
	if ($addedHooks.Count + $addedRules.Count -eq 0) {
		Write-Host "  Already has the template's hooks and rules - skip" -ForegroundColor Green
		return
	}
	$backup = "$SettingsPath$BackupSuffix." + (Get-Date -Format 'yyyyMMddHHmmss')
	Copy-Item -LiteralPath $SettingsPath -Destination $backup
	[IO.File]::WriteAllText($SettingsPath, ($settings | ConvertTo-Json -Depth 32), $utf8)
	if ($addedHooks.Count -gt 0) { Write-Host "  Hooks registered: $($addedHooks -join ', ')" -ForegroundColor Green }
	if ($addedRules.Count -gt 0) { Write-Host "  Rules added: $($addedRules -join ', ')" -ForegroundColor Green }
	Write-Host "  Backup of the previous file: $backup" -ForegroundColor Yellow
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
	param([string]$SettingsPath, [string]$TemplatePath)
	$bad = 0
	$labels = @{ ok = 'ok'; missing = 'MISSING'; stale = 'STALE PATH'; foreign = 'FOREIGN' }
	foreach ($link in $Links) {
		$state = Get-DotfilesLinkState -Source $link.Source -Target $link.Target -DotfilesRoot $DotfilesRoot
		if ($state -ne 'ok') { $bad++ }
		$color = if ($state -eq 'ok') { 'Green' } else { 'Red' }
		Write-Host ('  {0,-11} {1}' -f $labels[$state], $link.Target) -ForegroundColor $color
	}
	if (Test-Path $SettingsPath) {
		$template = [IO.File]::ReadAllText($TemplatePath, [Text.Encoding]::UTF8) | ConvertFrom-Json
		$settings = [IO.File]::ReadAllText($SettingsPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
		# Add-MissingHook works on this in-memory copy: the file is not touched.
		$missingHooks = @(Add-MissingHook -Settings $settings -Template $template)
		if ($missingHooks.Count -eq 0) { Write-Host '  ok          Claude Code hooks registered' -ForegroundColor Green }
		else { $bad++; Write-Host "  MISSING     unregistered hooks: $($missingHooks -join ', ')" -ForegroundColor Red }
		$missingRules = @(Add-MissingPermission -Settings $settings -Template $template)
		if ($missingRules.Count -eq 0) { Write-Host '  ok          template deny/ask rules' -ForegroundColor Green }
		else { $bad++; Write-Host "  MISSING     template rules: $($missingRules -join ', ')" -ForegroundColor Red }
	}
	else { $bad++; Write-Host "  MISSING     $SettingsPath" -ForegroundColor Red }
	if ((git -C $DotfilesRoot config --get core.hooksPath) -eq 'githooks') { Write-Host '  ok          git post-merge on' -ForegroundColor Green }
	else { $bad++; Write-Host '  MISSING     git post-merge (core.hooksPath)' -ForegroundColor Red }
	Write-Host ''
	if ($bad -eq 0) { Write-Host "All installed: $($Links.Count) links, hooks and post-merge." -ForegroundColor Green; return $true }
	Write-Host "$bad checks failed. Run .\install.ps1 to fix them." -ForegroundColor Red
	return $false
}

Write-Host "=== dotfiles-windows installer ===" -ForegroundColor Magenta
Write-Host "Repo root: $DotfilesRoot" -ForegroundColor Gray

$settingsPath = "$env:USERPROFILE\.claude\settings.json"
$templatePath = "$DotfilesRoot\50-claude\settings.template.json"
if ($Check) {
	Write-Host '-Check mode: report only, nothing changes.' -ForegroundColor Yellow
	if (Test-Installation -SettingsPath $settingsPath -TemplatePath $templatePath) { exit 0 }
	exit 1
}

if (-not (Test-SymlinkCapability)) {
	Write-Error "Cannot create symlinks. Turn on Developer Mode (Settings -> System -> For developers) or run PowerShell as administrator. No file was touched."
	exit 1
}

foreach ($link in $Links) {
	Install-Symlink -Source $link.Source -Target $link.Target -Label $link.Label
}

Install-ClaudeSetting -TemplatePath $templatePath -SettingsPath $settingsPath
Install-GitHook

Write-Host ""
Write-Host "=== Install complete ===" -ForegroundColor Magenta
Write-Host "Check the state any time with: .\install.ps1 -Check" -ForegroundColor Cyan
Write-Host ""
