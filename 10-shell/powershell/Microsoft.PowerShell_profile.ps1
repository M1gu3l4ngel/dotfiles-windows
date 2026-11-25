# PowerShell profile for PowerShell 7 and Windows PowerShell, linked from Documents by
# install.ps1. It runs at the start of every session; reload it with . $PROFILE

# oh-my-posh prompt (git, exit code, timing...). It is needed right away and cannot be deferred.
# The theme is read from the repo, not from $env:POSH_THEMES_PATH (which a reinstall of
# oh-my-posh wipes). The repo folder comes from this profile's link (Documents -> repo), as in
# .bashrc, so it works wherever the repo is cloned.
$profileFile = Get-Item -LiteralPath $PSCommandPath -Force
$profileDir = if ($profileFile.LinkType -eq 'SymbolicLink') { Split-Path @($profileFile.Target)[0] -Parent } else { $PSScriptRoot }
oh-my-posh init pwsh --config (Join-Path $profileDir '..\oh-my-posh\capr4n.omp.json') | Invoke-Expression
Remove-Variable profileFile, profileDir

# fnm: entering a repo switches to the Node version it asks for (.node-version, .nvmrc or
# package.json engines.node, searching upwards), in this terminal only.
if (Get-Command fnm -ErrorAction SilentlyContinue) {
	fnm env --use-on-cd --version-file-strategy recursive --shell powershell | Out-String | Invoke-Expression
}

# Importing Terminal-Icons (file-type icons in ls/dir) costs about 0.5 s. It is deferred to the
# first idle, right after the prompt appears, so the terminal opens instantly; the icons are
# ready for the first 'ls'.
$null = Register-EngineEvent -SourceIdentifier PowerShell.OnIdle -MaxTriggerCount 1 -Action {
	Import-Module -Name Terminal-Icons -ErrorAction SilentlyContinue
}

# Spanish locale: git and gettext programs show translated messages.
$env:LANG = "es_ES.UTF-8"
