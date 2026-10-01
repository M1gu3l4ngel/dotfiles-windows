# install.ps1
# Instalador idempotente de dotfiles-windows.
# Crea symlinks desde las ubicaciones estandar hacia los archivos del repo.
# Antes de cualquier sobreescritura hace backup con sufijo .pre-dotfiles.bak
# (con fecha si ya existe uno, para no perder ninguna version).
#
# Requisitos:
#   - Developer Mode activado (Settings -> Privacy & security -> For developers)
#     o ejecutar como administrador (cualquiera de los dos permite crear symlinks).
#   - PowerShell 5.1 o superior.
#
# Uso:
#   cd ~\dotfiles-windows
#   .\install.ps1

#Requires -Version 5.1

$ErrorActionPreference = 'Stop'
$DotfilesRoot = $PSScriptRoot
$BackupSuffix = '.pre-dotfiles.bak'

# Ubicacion REAL de la carpeta Documentos. No usar "$env:USERPROFILE\Documents":
# esa carpeta puede estar redirigida a otra unidad (aqui esta en D:\Documentos) y
# PowerShell busca sus perfiles en la ruta real, no en la de C:.
$DocumentsPath = [Environment]::GetFolderPath('MyDocuments')

# Mapeo de symlinks: definido en lib/links.ps1 (compartido con uninstall.ps1, para
# que el mapeo viva en un solo sitio y no se desincronicen).
. "$PSScriptRoot\lib\links.ps1"
$Links = Get-DotfilesLink -DotfilesRoot $DotfilesRoot -DocumentsPath $DocumentsPath

# Comprueba si el sistema puede crear symlinks SIN fallar a mitad del proceso:
# un administrador siempre puede; un usuario normal solo con Developer Mode
# (que habilita SeCreateSymbolicLinkPrivilege). Se valida ANTES de tocar nada,
# para no mover archivos y luego quedarnos sin poder crear el enlace.
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
		Write-Warning "  Source no existe en el repo: $Source - skip"
		return
	}

	# Asegurar que el directorio destino existe
	$TargetDir = Split-Path $Target -Parent
	if (-not (Test-Path $TargetDir)) {
		Write-Host "  Creando directorio: $TargetDir" -ForegroundColor Cyan
		New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
	}

	# Si el target ya existe, evaluar.
	$Backup = $null
	if (Test-Path $Target) {
		$item = Get-Item $Target -Force
		# Si ya es symlink al source correcto (comparando rutas normalizadas), listo.
		$existing = @($item.Target)[0]
		if ($item.LinkType -eq 'SymbolicLink' -and $existing -and
			([IO.Path]::GetFullPath($existing) -ieq [IO.Path]::GetFullPath($Source))) {
			Write-Host "  Ya symlinked correctamente - skip" -ForegroundColor Green
			return
		}
		# Backup del archivo existente. Si ya hay un .bak de una corrida anterior,
		# se le anade la fecha en vez de sobrescribirlo o borrarlo sin respaldo:
		# esa copia puede ser la unica de la config original.
		$Backup = "$Target$BackupSuffix"
		if (Test-Path $Backup) {
			$Backup = "$Backup." + (Get-Date -Format 'yyyyMMddHHmmss')
		}
		Write-Host "  Backup: $Target -> $Backup" -ForegroundColor Yellow
		Move-Item -Path $Target -Destination $Backup -Force
	}

	# Crear el symlink. Si falla (p. ej. sin privilegios), restaurar el original
	# desde el backup para no dejar al usuario sin su archivo.
	try {
		New-Item -ItemType SymbolicLink -Path $Target -Target $Source -Force -ErrorAction Stop | Out-Null
		Write-Host "  Symlink creado: $Target -> $Source" -ForegroundColor Green
	}
	catch {
		if ($Backup -and (Test-Path $Backup)) {
			Move-Item -Path $Backup -Destination $Target -Force
			Write-Warning "  Fallo al crear el symlink; se restauro el original desde $Backup"
		}
		throw
	}
}

Write-Host "=== Instalador dotfiles-windows ===" -ForegroundColor Magenta
Write-Host "Root del repo: $DotfilesRoot" -ForegroundColor Gray

# Falla temprano y limpio si no se pueden crear symlinks, antes de mover nada.
if (-not (Test-SymlinkCapability)) {
	Write-Error "No se pueden crear symlinks. Activa Developer Mode (Settings -> Privacy & security -> For developers) o ejecuta PowerShell como administrador. No se toco ningun archivo."
	exit 1
}

foreach ($link in $Links) {
	Install-Symlink -Source $link.Source -Target $link.Target -Label $link.Label
}

Write-Host ""
Write-Host "=== Instalacion completa ===" -ForegroundColor Magenta
Write-Host ""
Write-Host "Pasos manuales restantes (ver README.md):" -ForegroundColor Cyan
Write-Host "  1. Configurar git con tu nombre, email y defaults"
Write-Host "  2. Restaurar extensiones de VS Code:"
Write-Host "     Get-Content `"$DotfilesRoot\vscode\extensions.txt`" | ForEach-Object { code --install-extension `$_ }"
Write-Host ""
