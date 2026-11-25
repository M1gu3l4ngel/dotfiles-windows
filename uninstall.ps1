#Requires -Version 5.1
<#
.SYNOPSIS
  Undoes what install.ps1 did: removes the repo's symlinks and restores the backed-up originals.

.DESCRIPTION
  For each symlink install.ps1 creates: if the target is a symlink to this repo, it removes it,
  and if a .pre-dotfiles.bak backup exists, it restores the original file. Anything else in the
  target is left alone. It does not uninstall apps or touch environment variables or WSL.

  The symlink map is shared with install.ps1 (lib/links.ps1).

.PARAMETER DryRun
  Shows what it would do without touching anything, like -WhatIf. Run it before the real thing.

.EXAMPLE
  .\uninstall.ps1 -DryRun
  .\uninstall.ps1
#>
[CmdletBinding()]
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$DotfilesRoot = $PSScriptRoot
$BackupSuffix = '.pre-dotfiles.bak'
$DocumentsPath = [Environment]::GetFolderPath('MyDocuments')

. "$PSScriptRoot\lib\links.ps1"
$Links = Get-DotfilesLink -DotfilesRoot $DotfilesRoot -DocumentsPath $DocumentsPath

function Would($m) { Write-Host "  [dry] $m" -ForegroundColor DarkYellow }

function Uninstall-Symlink {
	param([string]$Source, [string]$Target, [string]$Label)

	Write-Host ""
	Write-Host "[$Label]" -ForegroundColor Magenta

	$item = Get-Item $Target -Force -ErrorAction SilentlyContinue
	$backup = "$Target$BackupSuffix"
	$hasBackup = Test-Path $backup

	# It is OURS only if it points (normalized path) to the repo's Source.
	$isOurs = $false
	if ($item -and $item.LinkType -eq 'SymbolicLink') {
		$existing = @($item.Target)[0]
		if ($existing -and ([IO.Path]::GetFullPath($existing) -ieq [IO.Path]::GetFullPath($Source))) {
			$isOurs = $true
		}
	}

	if ($isOurs) {
		if ($DryRun) { Would "would remove the symlink: $Target" }
		# The link's Delete() removes only the link: Remove-Item on a folder link can go through
		# it and delete what is in the repo.
		else { $item.Delete(); Write-Host "  Symlink removed" -ForegroundColor Green }

		if ($hasBackup) {
			if ($DryRun) { Would "would restore the original: $backup -> $Target" }
			else { Move-Item -Path $backup -Destination $Target -Force; Write-Host "  Original restored from the backup" -ForegroundColor Green }
		}
		elseif (-not $DryRun) { Write-Host "  (no earlier backup; the target is left without a file)" -ForegroundColor Gray }
	}
	elseif ($item) {
		Write-Host "  Not a symlink of this repo - left alone" -ForegroundColor Yellow
		if ($hasBackup) { Write-Host "  Warning: orphan backup, review it by hand: $backup" -ForegroundColor Yellow }
	}
	else {
		if ($hasBackup) {
			if ($DryRun) { Would "would restore the original: $backup -> $Target" }
			else {
				New-Item -ItemType Directory -Force -Path (Split-Path $Target -Parent) | Out-Null
				Move-Item -Path $backup -Destination $Target -Force
				Write-Host "  Original restored from the backup" -ForegroundColor Green
			}
		}
		else { Write-Host "  Nothing to undo" -ForegroundColor Gray }
	}
}

Write-Host "=== dotfiles-windows uninstaller ===" -ForegroundColor Magenta
Write-Host "Repo root: $DotfilesRoot" -ForegroundColor Gray
if ($DryRun) { Write-Host "DRY-RUN MODE: nothing changes, report only." -ForegroundColor Yellow }

foreach ($link in $Links) {
	Uninstall-Symlink -Source $link.Source -Target $link.Target -Label $link.Label
}

Write-Host ""
Write-Host "=== Uninstall complete ===" -ForegroundColor Magenta
if (-not $DryRun) {
	Write-Host "Reopen your terminals so they pick up the restored config." -ForegroundColor Cyan
}
Write-Host ""
