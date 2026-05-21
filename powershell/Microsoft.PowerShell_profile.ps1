# ~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
# Perfil de PowerShell (versionado desde dotfiles-windows).
# Se ejecuta al iniciar cada sesión de PowerShell.
# Para recargar sin reiniciar la terminal: . $PROFILE

# Tema oh-my-posh (prompt con git, exit code, tiempo, etc.)
# Path absoluto al tema en el repo dotfiles, no depende de $env:POSH_THEMES_PATH
# (que se borra cuando oh-my-posh se reinstala desde otra technology).
oh-my-posh init pwsh --config "$env:USERPROFILE\dotfiles\oh-my-posh\capr4n.omp.json" | Invoke-Expression

# Iconos por tipo de archivo en ls/dir
Import-Module -Name Terminal-Icons

# Locale en español para que git y otros programas con gettext muestren
# mensajes traducidos (matchea con Parrot que tiene es_ES.UTF-8 por default).
$env:LANG = "es_ES.UTF-8"
