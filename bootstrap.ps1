#Requires -Version 5.1
<#
.SYNOPSIS
  Bootstrap del entorno dotfiles-windows en un comando (idempotente).

.DESCRIPTION
  Instala y configura SOLO el entorno esencial (no apps personales): set esencial
  de winget, fuentes Nerd, toolchain de Node, variables de entorno hacia D: (o C:
  si no hay D:), WSL, git y los symlinks de config (install.ps1).

  Cada paso comprueba si ya esta hecho, asi que se puede re-ejecutar sin romper
  nada (por ejemplo tras un reinicio, o para actualizar). Los secretos (GPG/SSH)
  NO se automatizan: se guian al final.

  Todo lo configurable (versiones, set de winget, fuentes) esta CENTRALIZADO
  arriba, para mantenerlo facil.

.PARAMETER DryRun
  No cambia nada; solo reporta que haria. Usalo para probar en una maquina que ya
  esta configurada (como esta) sin tocar nada.

.EXAMPLE
  .\bootstrap.ps1
  .\bootstrap.ps1 -DryRun
#>
[CmdletBinding()]
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$DotfilesRoot = $PSScriptRoot

# =====================================================================
# CONFIGURACION CENTRALIZADA (editar aqui = editar el bootstrap entero)
# =====================================================================

# --- Toolchain ---
$NodeMajor = '22'

# --- Set esencial de winget ---
# Solo el entorno: shell, terminal, editor, prompt, firma, toolchain y CLI tools
# (estas para andar sincronizado con Parrot). NADA de apps personales.
$WingetEssential = @(
	'Git.Git', 'Microsoft.PowerShell', 'Microsoft.WindowsTerminal', 'Microsoft.VisualStudioCode',
	'JanDeDobbeleer.OhMyPosh', 'GnuPG.Gpg4win', 'Rustlang.Rustup', 'Python.Python.3.13',
	'Docker.DockerDesktop', 'CoreyButler.NVMforWindows',
	'junegunn.fzf', 'BurntSushi.ripgrep.MSVC', 'sharkdp.bat', 'sharkdp.fd', 'jqlang.jq',
	'lsd-rs.lsd', 'Neovim.Neovim'
)

# --- Fuentes Nerd ---
# Tabla central: anadir una fuente = anadir una linea. Se descargan del release
# oficial en version fija y se VERIFICAN por SHA-256 antes de instalar.
#   Archive = nombre del .zip en el release   Sha256 = hash del .zip
#   Glob    = patron de los .ttf a instalar   (Family solo documenta la familia)
$NerdFontsVersion = 'v3.5.1'
$NerdFonts = @(
	@{ Archive = 'CascadiaCode'; Sha256 = '1298bf92698afa06185cf1d05e6ae05f2d8a1e8c3cb45ddf4c3035168ab342a1'; Glob = 'CaskaydiaCove*.ttf'; Family = 'CaskaydiaCove Nerd Font' }
	# Para sumar Hack (logo de Parrot), descubre su SHA y anade:
	# @{ Archive = 'Hack'; Sha256 = '<sha256 de Hack.zip>'; Glob = 'HackNerdFont*.ttf'; Family = 'Hack Nerd Font' }
)

# =====================================================================
# SALIDA
# =====================================================================
function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok($m) { Write-Host "    [ok]  $m" -ForegroundColor Green }
function Warn($m) { Write-Host "    [!]   $m" -ForegroundColor Yellow }
function Info($m) { Write-Host "    $m" -ForegroundColor Gray }
function Would($m) { Write-Host "    [dry] haria: $m" -ForegroundColor DarkYellow }
function Die($m) { Write-Host "    [x]   $m" -ForegroundColor Red; exit 1 }

# =====================================================================
# HELPERS
# =====================================================================
function Test-Admin {
	([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
		[Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Refresca el PATH de esta sesion desde el registro, para ver lo que winget o un
# instalador acaban de anadir sin tener que reabrir la terminal.
function Update-SessionPath {
	$machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
	$user = [Environment]::GetEnvironmentVariable('Path', 'User')
	$env:Path = ($machine, $user | Where-Object { $_ }) -join ';'
}

# Disco de trabajo: D: si existe (separacion C:/D: de esta PC); si no, C:.
function Get-WorkDrive {
	if (Test-Path 'D:\') { return 'D:' }
	Warn 'No hay disco D:. Se usara C: para caches y globales (maquina de un solo disco).'
	return 'C:'
}

function Install-WingetId($id) {
	winget list --id $id -e --accept-source-agreements 2>$null | Out-Null
	if ($LASTEXITCODE -eq 0) { Ok "$id"; return }
	if ($DryRun) { Would "winget install $id"; return }
	Info "instalando $id ..."
	winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements --disable-interactivity 2>&1 | Out-Null
	if ($LASTEXITCODE -eq 0) { Ok "$id instalado" } else { Warn "winget devolvio $LASTEXITCODE para $id - revisar a mano" }
}

# Instala una fuente de la tabla $NerdFonts: descarga, verifica SHA-256, extrae
# los .ttf que hagan match con su Glob y los registra en HKCU.
function Install-NerdFont($font, $fontsDir) {
	$zip = Join-Path $env:TEMP "nf-$($font.Archive).zip"
	$ext = Join-Path $env:TEMP "nf-$($font.Archive)"
	Info "$($font.Archive): descargando ..."
	Invoke-WebRequest -UseBasicParsing -OutFile $zip `
		-Uri "https://github.com/ryanoasis/nerd-fonts/releases/download/$NerdFontsVersion/$($font.Archive).zip"
	$hash = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
	if ($hash -ne $font.Sha256) {
		Remove-Item $zip -Force -ErrorAction SilentlyContinue
		Die "SHA-256 de $($font.Archive) no coincide (descarga corrupta o manipulada)."
	}
	if (Test-Path $ext) { Remove-Item $ext -Recurse -Force }
	Expand-Archive -Path $zip -DestinationPath $ext -Force
	$n = 0
	Get-ChildItem (Join-Path $ext $font.Glob) -ErrorAction SilentlyContinue | ForEach-Object {
		Copy-Item $_.FullName $fontsDir -Force
		New-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts' `
			-Name "$($_.BaseName) (TrueType)" -Value "$fontsDir\$($_.Name)" -PropertyType String -Force | Out-Null
		$n++
	}
	Remove-Item $zip, $ext -Recurse -Force -ErrorAction SilentlyContinue
	Ok "$($font.Archive): $n archivos ($($font.Family))"
}

function Set-UserEnv($name, $value) {
	$cur = [Environment]::GetEnvironmentVariable($name, 'User')
	if ($cur -eq $value) { Ok "$name ya = $value"; return }
	if ($DryRun) { Would "set $name = $value (actual: '$cur')"; return }
	[Environment]::SetEnvironmentVariable($name, $value, 'User')
	Set-Item "env:$name" $value -ErrorAction SilentlyContinue
	Ok "$name -> $value"
}

function Add-UserPath($dir) {
	$cur = [Environment]::GetEnvironmentVariable('Path', 'User')
	if (($cur -split ';') -contains $dir) { Ok "PATH ya contiene $dir"; return }
	if ($DryRun) { Would "anadir $dir al PATH de usuario"; return }
	[Environment]::SetEnvironmentVariable('Path', "$cur;$dir", 'User')
	Ok "PATH += $dir"
}

# =====================================================================
# PASOS
# =====================================================================

function Invoke-Step0Check {
	Step 'Comprobaciones previas'
	if ($PSVersionTable.PSVersion.Major -lt 5) { Die 'Se requiere PowerShell 5.1 o superior.' }
	if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
		Die "winget no esta disponible. Instala 'App Installer' desde la Microsoft Store."
	}
	if (Test-Admin) { Ok 'Administrador' }
	else {
		Warn 'No estas como administrador. WSL, Docker y algunas apps pueden fallar o pedir UAC.'
		Warn "Recomendado: abre PowerShell con 'Ejecutar como administrador' y vuelve a correrlo."
	}
	if ($DryRun) { Warn 'MODO DRY-RUN: no se cambiara nada, solo se reporta.' }
}

function Invoke-Step1Winget {
	Step 'Set esencial (winget)'
	foreach ($id in $WingetEssential) { Install-WingetId $id }
	# Modulo de PowerShell para iconos en ls/dir (lo usa el perfil).
	if (Get-Module -ListAvailable Terminal-Icons) { Ok 'Terminal-Icons ya instalado' }
	elseif ($DryRun) { Would 'Install-Module Terminal-Icons' }
	else { Install-Module -Name Terminal-Icons -Scope CurrentUser -Force; Ok 'Terminal-Icons instalado' }
	Update-SessionPath
}

function Invoke-Step2Font {
	Step "Fuentes Nerd $NerdFontsVersion"
	$fontsDir = "$env:LOCALAPPDATA\Microsoft\Windows\Fonts"
	$marker = Join-Path $fontsDir '.nerdfonts.version'
	# Idempotencia por version fijada (estilo Parrot): reinstala solo si el marcador
	# no coincide. Asi una maquina con la nomenclatura VIEJA se actualiza a la nueva,
	# y en runs siguientes no descarga nada.
	if ((Get-Content $marker -ErrorAction SilentlyContinue) -eq $NerdFontsVersion) {
		Ok "Ya instaladas ($NerdFontsVersion)"; return
	}
	if ($DryRun) { Would "instalar/actualizar fuentes a ${NerdFontsVersion}: $(($NerdFonts.Archive) -join ', ')"; return }
	New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null
	foreach ($font in $NerdFonts) { Install-NerdFont $font $fontsDir }
	Set-Content -Path $marker -Value $NerdFontsVersion -Encoding ASCII
	Ok "Fuentes Nerd $NerdFontsVersion listas"
}

function Invoke-Step3Env($drive) {
	Step "Variables de entorno -> $drive"
	Set-UserEnv 'CARGO_HOME'          "$drive\Dev\Caches\cargo"
	Set-UserEnv 'RUSTUP_HOME'         "$drive\Dev\Caches\rustup"
	Set-UserEnv 'NUGET_PACKAGES'      "$drive\Dev\Caches\nuget"
	Set-UserEnv 'PUPPETEER_CACHE_DIR' "$drive\Dev\Caches\puppeteer"
	if (-not $DryRun) {
		$dirs = @(
			"$drive\Dev\Caches\cargo", "$drive\Dev\Caches\rustup", "$drive\Dev\Caches\nuget",
			"$drive\Dev\Caches\puppeteer", "$drive\Dev\Caches\npm",
			"$drive\Dev\npm-global", "$drive\Dev\projects", "$drive\Dev\scratch"
		)
		foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
	}
	Add-UserPath "$drive\Dev\npm-global"
}

function Invoke-Step4Node($drive) {
	Step "Node $NodeMajor + pnpm + Claude Code (globales en $drive\Dev\npm-global)"
	Update-SessionPath
	if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
		Warn 'nvm aun no esta en el PATH de esta sesion (se instalo recien).'
		Warn 'Cierra y reabre PowerShell y vuelve a correr bootstrap.ps1 para completar Node.'
		return
	}
	if ($DryRun) { Would "nvm install $NodeMajor; npm prefix/cache -> $drive; npm i -g pnpm y claude-code"; return }
	nvm install $NodeMajor | Out-Null
	nvm use $NodeMajor | Out-Null
	Update-SessionPath
	npm config set prefix "$drive\Dev\npm-global" | Out-Null
	npm config set cache  "$drive\Dev\Caches\npm" | Out-Null
	if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { npm install -g pnpm | Out-Null }
	if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { npm install -g '@anthropic-ai/claude-code' | Out-Null }
	Update-SessionPath
	if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm config set store-dir "$drive\.pnpm-store" | Out-Null }
	Ok "Node $(node --version 2>$null), pnpm $(pnpm --version 2>$null), Claude Code listo"
}

function Invoke-Step5Wsl {
	Step 'WSL (Ubuntu)'
	$raw = (& wsl.exe -l -q) 2>$null
	$list = (($raw -join "`n") -replace "`0", '')
	if ($list -match 'Ubuntu') { Ok 'WSL/Ubuntu ya presente'; return }
	if ($DryRun) { Would 'wsl --install -d Ubuntu-20.04 (requiere reinicio)'; return }
	Warn 'Instalando WSL + Ubuntu - REQUIERE REINICIO al terminar.'
	wsl --install -d Ubuntu-20.04
}

function Invoke-Step6Git {
	Step 'git config (identidad + defaults)'
	if ($DryRun) { Would 'git config user.name / user.email (noreply) / init.defaultBranch'; return }
	git config --global user.name  'M1gu3l4ngel'
	git config --global user.email '88590762+M1gu3l4ngel@users.noreply.github.com'
	git config --global init.defaultBranch 'main'
	Ok 'git identidad + defaults (la firma GPG va en los pasos manuales)'
}

function Invoke-Step7Symlink {
	Step 'Symlinks de configuracion (install.ps1)'
	if ($DryRun) { Would 'ejecutar install.ps1 (enlaza perfiles, WT, VS Code, oh-my-posh, bash)'; return }
	& "$DotfilesRoot\install.ps1"
}

function Invoke-Step8Manual {
	Step 'Listo. Pasos MANUALES (secretos - no se automatizan)'
	$lines = @(
		'1. Reinicia si se instalo WSL o Docker por primera vez.',
		'',
		'2. Clave SSH (autenticacion en GitHub):',
		'     ssh-keygen -t ed25519 -C "<usuario>@<maquina>"',
		'     Sube ~/.ssh/id_ed25519.pub a GitHub -> Settings -> SSH and GPG keys.',
		'',
		'3. Clave GPG (firma de commits + badge "Verified"):',
		'     gpg --quick-generate-key "M1gu3l4ngel <88590762+M1gu3l4ngel@users.noreply.github.com>" default default 2y',
		'     git config --global user.signingkey <fingerprint>',
		'     git config --global commit.gpgsign true',
		'     git config --global gpg.program "C:\Program Files\GnuPG\bin\gpg.exe"',
		'     Sube la clave publica a GitHub. Detalle en GIT-SIGNING.md.',
		'',
		'4. Extensiones de VS Code:'
	)
	$lines | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
	Write-Host "         Get-Content `"$DotfilesRoot\vscode\extensions.txt`" | ForEach-Object { code --install-extension `$_ }" -ForegroundColor Gray
}

# =====================================================================
# EJECUCION
# =====================================================================
Write-Host '=== bootstrap dotfiles-windows ===' -ForegroundColor Magenta
Write-Host "Repo: $DotfilesRoot" -ForegroundColor Gray
$drive = Get-WorkDrive

Invoke-Step0Check
Invoke-Step1Winget
Invoke-Step2Font
Invoke-Step3Env  $drive
Invoke-Step4Node $drive
Invoke-Step5Wsl
Invoke-Step6Git
Invoke-Step7Symlink
Invoke-Step8Manual

Write-Host "`n=== bootstrap completo ===" -ForegroundColor Magenta
