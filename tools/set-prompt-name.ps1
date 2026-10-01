#Requires -Version 5.1
<#
.SYNOPSIS
  Configura el nombre que muestra el prompt (oh-my-posh), via la variable POSH_NAME.

.DESCRIPTION
  Pregunta un nombre para mostrar en el prompt en lugar de tu usuario de Windows.
  Si lo dejas vacio, el prompt muestra tu usuario real (comportamiento por defecto).
  Es puramente visual: no cambia el sistema, ni las rutas, ni git. El valor se
  guarda en la variable de usuario POSH_NAME, que el tema capr4n lee.

.EXAMPLE
  .\tools\set-prompt-name.ps1
#>

$actual = [Environment]::GetEnvironmentVariable('POSH_NAME', 'User')
$muestra = if ($actual) { "'$actual'" } else { '(no definido: muestra tu usuario real de Windows)' }
Write-Host ""
Write-Host "Nombre visual del prompt" -ForegroundColor Cyan
Write-Host "  Actual: $muestra" -ForegroundColor Gray
Write-Host "  Es solo decorativo: no cambia tu usuario, rutas ni comandos." -ForegroundColor Gray
Write-Host ""

$nombre = Read-Host "Nombre a mostrar en el prompt (Enter en blanco = usar tu usuario real)"

if ([string]::IsNullOrWhiteSpace($nombre)) {
	[Environment]::SetEnvironmentVariable('POSH_NAME', $null, 'User')
	$env:POSH_NAME = $null
	Write-Host "Listo: el prompt usara tu usuario real de Windows." -ForegroundColor Green
}
else {
	$nombre = $nombre.Trim()
	[Environment]::SetEnvironmentVariable('POSH_NAME', $nombre, 'User')
	$env:POSH_NAME = $nombre
	Write-Host "Listo: el prompt mostrara '$nombre'." -ForegroundColor Green
}

Write-Host "Para verlo ya: recarga con  . `$PROFILE  o abre una terminal nueva." -ForegroundColor Cyan
Write-Host ""
