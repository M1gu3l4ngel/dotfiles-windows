# ~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
# Perfil de PowerShell (versionado desde dotfiles-windows).
# Se ejecuta al iniciar cada sesion de PowerShell. Recargar: . $PROFILE

# Prompt oh-my-posh (git, exit code, tiempo...). Se necesita de inmediato, no se
# puede diferir. Ruta absoluta al tema en el repo, para no depender de
# $env:POSH_THEMES_PATH (que se borra al reinstalar oh-my-posh).
oh-my-posh init pwsh --config "$env:USERPROFILE\dotfiles\oh-my-posh\capr4n.omp.json" | Invoke-Expression

# Terminal-Icons (iconos por tipo de archivo en ls/dir) cuesta ~0.5 s al importar.
# Se difiere al primer idle -justo despues de que aparece el prompt- para que la
# terminal abra al instante; los iconos quedan listos para el primer 'ls'.
$null = Register-EngineEvent -SourceIdentifier PowerShell.OnIdle -MaxTriggerCount 1 -Action {
	Import-Module -Name Terminal-Icons -ErrorAction SilentlyContinue
}

# Locale en espanol (git y programas con gettext muestran mensajes traducidos).
$env:LANG = "es_ES.UTF-8"
