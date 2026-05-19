# install.ps1
# Instalador idempotente de dotfiles-windows.
# Crea symlinks desde las ubicaciones estándar hacia los archivos del repo.
# Antes de cualquier sobreescritura, hace backup con sufijo .pre-dotfiles.bak.
#
# Requisitos:
#   - Developer Mode activado (Settings → Privacy & security → For developers)
#   - PowerShell 7+
#
# Uso:
#   cd ~\dotfiles-windows
#   .\install.ps1

#Requires -Version 5.0

$ErrorActionPreference = 'Stop'
$DotfilesRoot = $PSScriptRoot
$BackupSuffix = '.pre-dotfiles.bak'

# Mapeo: archivo en repo → ruta destino en el sistema
$Links = @(
    @{
        Source = "$DotfilesRoot\powershell\Microsoft.PowerShell_profile.ps1"
        Target = "$env:USERPROFILE\Documents\PowerShell\Microsoft.PowerShell_profile.ps1"
        Label  = 'PowerShell 7 profile'
    },
    @{
        Source = "$DotfilesRoot\powershell\Microsoft.PowerShell_profile.ps1"
        Target = "$env:USERPROFILE\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
        Label  = 'Windows PowerShell (legacy) profile'
    },
    @{
        Source = "$DotfilesRoot\oh-my-posh\capr4n.omp.json"
        Target = "$env:LOCALAPPDATA\Programs\oh-my-posh\themes\capr4n.omp.json"
        Label  = 'oh-my-posh theme (capr4n)'
    },
    @{
        Source = "$DotfilesRoot\windows-terminal\settings.json"
        Target = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"
        Label  = 'Windows Terminal settings'
    },
    @{
        Source = "$DotfilesRoot\vscode\settings.json"
        Target = "$env:APPDATA\Code\User\settings.json"
        Label  = 'VS Code settings'
    },
    @{
        Source = "$DotfilesRoot\vscode\keybindings.json"
        Target = "$env:APPDATA\Code\User\keybindings.json"
        Label  = 'VS Code keybindings'
    }
)

function Install-Symlink {
    param(
        [string]$Source,
        [string]$Target,
        [string]$Label
    )

    Write-Host ""
    Write-Host "[$Label]" -ForegroundColor Magenta

    if (-not (Test-Path $Source)) {
        Write-Warning "  Source no existe en el repo: $Source — skip"
        return
    }

    # Asegurar que el directorio destino existe
    $TargetDir = Split-Path $Target -Parent
    if (-not (Test-Path $TargetDir)) {
        Write-Host "  Creando directorio: $TargetDir" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    }

    # Si el target ya existe, evaluar
    if (Test-Path $Target) {
        $item = Get-Item $Target -Force
        # Si ya es symlink al source correcto, todo OK
        if ($item.LinkType -eq 'SymbolicLink' -and $item.Target -contains $Source) {
            Write-Host "  Ya symlinked correctamente — skip" -ForegroundColor Green
            return
        }
        # Backup del archivo existente
        $Backup = "$Target$BackupSuffix"
        if (Test-Path $Backup) {
            Write-Host "  Backup previo ya existe (no sobreescribo): $Backup" -ForegroundColor Yellow
        } else {
            Write-Host "  Backup: $Target -> $Backup" -ForegroundColor Yellow
            Rename-Item -Path $Target -NewName $Backup
        }
        # Si después del rename aún queda algo en target (symlink raro), eliminar
        if (Test-Path $Target) {
            Remove-Item $Target -Force
        }
    }

    # Crear el symlink
    Write-Host "  Creando symlink: $Target -> $Source" -ForegroundColor Green
    New-Item -ItemType SymbolicLink -Path $Target -Target $Source -Force | Out-Null
}

Write-Host "=== Instalador dotfiles-windows ===" -ForegroundColor Magenta
Write-Host "Root del repo: $DotfilesRoot" -ForegroundColor Gray

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
