#Requires -Version 5.1
<#
.SYNOPSIS
  Desinstalador de dotfiles-windows: revierte lo que hizo install.ps1.

.DESCRIPTION
  Por cada symlink que install.ps1 crea: si el destino es un symlink que apunta a
  este repo, lo quita; y si existe un backup .pre-dotfiles.bak, restaura el archivo
  original. No desinstala apps, ni toca variables de entorno ni WSL.

  El mapeo de symlinks se comparte con install.ps1 (lib/links.ps1).

.PARAMETER DryRun
  Muestra que haria sin tocar nada (equivale a un -WhatIf). Recomendado antes de
  ejecutar de verdad.

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

	# Es NUESTRO symlink solo si apunta (ruta normalizada) al Source del repo.
	$isOurs = $false
	if ($item -and $item.LinkType -eq 'SymbolicLink') {
		$existing = @($item.Target)[0]
		if ($existing -and ([IO.Path]::GetFullPath($existing) -ieq [IO.Path]::GetFullPath($Source))) {
			$isOurs = $true
		}
	}

	if ($isOurs) {
		if ($DryRun) { Would "quitaria el symlink: $Target" }
		else { Remove-Item $Target -Force; Write-Host "  Symlink quitado" -ForegroundColor Green }

		if ($hasBackup) {
			if ($DryRun) { Would "restauraria el original: $backup -> $Target" }
			else { Move-Item -Path $backup -Destination $Target -Force; Write-Host "  Original restaurado desde el backup" -ForegroundColor Green }
		}
		elseif (-not $DryRun) { Write-Host "  (no habia backup previo; el destino queda sin archivo)" -ForegroundColor Gray }
	}
	elseif ($item) {
		# Hay algo en el destino, pero NO es un symlink nuestro: no se toca.
		Write-Host "  No es un symlink de este repo - no se toca" -ForegroundColor Yellow
		if ($hasBackup) { Write-Host "  Aviso: hay un backup huerfano, revisalo a mano: $backup" -ForegroundColor Yellow }
	}
	else {
		# El destino no existe.
		if ($hasBackup) {
			if ($DryRun) { Would "restauraria el original: $backup -> $Target" }
			else {
				New-Item -ItemType Directory -Force -Path (Split-Path $Target -Parent) | Out-Null
				Move-Item -Path $backup -Destination $Target -Force
				Write-Host "  Original restaurado desde el backup" -ForegroundColor Green
			}
		}
		else { Write-Host "  Nada que revertir" -ForegroundColor Gray }
	}
}

Write-Host "=== Desinstalador dotfiles-windows ===" -ForegroundColor Magenta
Write-Host "Root del repo: $DotfilesRoot" -ForegroundColor Gray
if ($DryRun) { Write-Host "MODO DRY-RUN: no se cambiara nada, solo se reporta." -ForegroundColor Yellow }

foreach ($link in $Links) {
	Uninstall-Symlink -Source $link.Source -Target $link.Target -Label $link.Label
}

Write-Host ""
Write-Host "=== Desinstalacion completa ===" -ForegroundColor Magenta
if (-not $DryRun) {
	Write-Host "Reabre tus terminales para que tomen la config restaurada." -ForegroundColor Cyan
}
Write-Host ""
