# ~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
# Perfil de PowerShell (versionado desde dotfiles-windows).
# Se ejecuta al iniciar cada sesión de PowerShell.
# Para recargar sin reiniciar la terminal: . $PROFILE

# Tema oh-my-posh (prompt con git, exit code, tiempo, etc.)
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\capr4n.omp.json" | Invoke-Expression

# Iconos por tipo de archivo en ls/dir
Import-Module -Name Terminal-Icons
