#Requires -Version 5.1
<#
.SYNOPSIS
  Sets the name the oh-my-posh prompt shows, through the POSH_NAME variable.

.DESCRIPTION
  Asks for a name to show in the prompt instead of your Windows user. Left empty, the prompt
  shows your real user (the default). It is purely visual: it does not change the system, paths
  or git. The value is stored in the user variable POSH_NAME, which the capr4n theme reads.

.EXAMPLE
  .\tools\set-prompt-name.ps1
#>

$current = [Environment]::GetEnvironmentVariable('POSH_NAME', 'User')
$shown = if ($current) { "'$current'" } else { '(not set: shows your real Windows user)' }
Write-Host ""
Write-Host "Prompt display name" -ForegroundColor Cyan
Write-Host "  Current: $shown" -ForegroundColor Gray
Write-Host "  Only decorative: it does not change your user, paths or commands." -ForegroundColor Gray
Write-Host ""

$name = Read-Host "Name to show in the prompt (blank Enter = use your real user)"

if ([string]::IsNullOrWhiteSpace($name)) {
	[Environment]::SetEnvironmentVariable('POSH_NAME', $null, 'User')
	$env:POSH_NAME = $null
	Write-Host "Done: the prompt will use your real Windows user." -ForegroundColor Green
}
else {
	$name = $name.Trim()
	[Environment]::SetEnvironmentVariable('POSH_NAME', $name, 'User')
	$env:POSH_NAME = $name
	Write-Host "Done: the prompt will show '$name'." -ForegroundColor Green
}

Write-Host "To see it now: reload with  . `$PROFILE  or open a new terminal." -ForegroundColor Cyan
Write-Host ""
