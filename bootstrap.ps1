#Requires -Version 5.1
<#
.SYNOPSIS
  Sets up the dotfiles-windows environment in one command.

.DESCRIPTION
  Installs and configures only the essential environment, not personal apps: the winget
  essential set, Nerd Fonts, the Node toolchain, environment variables pointing at D: (or C: if
  there is no D:), WSL, git and the config symlinks (install.ps1).

  Each step checks whether it is already done, so it can run again without breaking anything
  (after a reboot, or to update). Secrets (GPG, SSH) are not automated: the last step lists them.

  Everything configurable (versions, the winget set, fonts) is at the top of the script.

.PARAMETER DryRun
  Changes nothing; only reports what it would do. Use it to try the script on a machine that is
  already set up.

.PARAMETER GitName
  The git user.name written to ~/.gitconfig.local when the machine has none. Defaults to the
  repo owner's: a fork passes its own.

.PARAMETER GitEmail
  The git user.email written to ~/.gitconfig.local when the machine has none: the GitHub noreply
  address, which every public commit shows. Defaults to the repo owner's.

.EXAMPLE
  .\bootstrap.ps1
  .\bootstrap.ps1 -DryRun
  .\bootstrap.ps1 -GitName '<user>' -GitEmail '<id>+<user>@users.noreply.github.com'
#>
[CmdletBinding()]
param(
	[switch]$DryRun,
	[string]$GitName = 'M1gu3l4ngel',
	[string]$GitEmail = '88590762+M1gu3l4ngel@users.noreply.github.com'
)

$ErrorActionPreference = 'Stop'
$DotfilesRoot = $PSScriptRoot

$NodeMajor = '24'

# Name as `wsl --list --online` lists it. 20.04 is no longer in the catalog.
$WslDistro = 'Ubuntu-26.04'

# Only the environment: shell, terminal, editor, prompt, signing, toolchain and the CLI tools
# kept in sync with Parrot. No personal apps. It lives in 60-apps/essential.json, in the
# `winget import` format and in install order; tools/check.ps1 checks it does not overlap with
# optional.json.
$WingetEssential = @((Get-Content -Raw -LiteralPath "$DotfilesRoot\60-apps\essential.json" | ConvertFrom-Json).Sources.Packages.PackageIdentifier)

# Installer options winget does not turn on in silent mode. Without them, VS Code has no "Open
# with Code" in the context menu and is not on the PATH.
$WingetOverride = @{
	'Microsoft.VisualStudioCode' = '/VERYSILENT /NORESTART /MERGETASKS=!runcode,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath'
}

# Adding a font is adding a line. They are downloaded from the official release at a fixed
# version and VERIFIED by SHA-256 before installing.
#   Archive = .zip name in the release   Sha256 = hash of the .zip
#   Glob    = pattern of the .ttf files to install   (Family only documents the family)
$NerdFontsVersion = 'v3.5.1'
$NerdFonts = @(
	@{ Archive = 'CascadiaCode'; Sha256 = '1298bf92698afa06185cf1d05e6ae05f2d8a1e8c3cb45ddf4c3035168ab342a1'; Glob = 'CaskaydiaCove*.ttf'; Family = 'CaskaydiaCove Nerd Font' }
)

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok($m) { Write-Host "    [ok]  $m" -ForegroundColor Green }
function Warn($m) { Write-Host "    [!]   $m" -ForegroundColor Yellow }
function Info($m) { Write-Host "    $m" -ForegroundColor Gray }
function Would($m) { Write-Host "    [dry] would: $m" -ForegroundColor DarkYellow }
function Die($m) { Write-Host "    [x]   $m" -ForegroundColor Red; exit 1 }

function Test-Admin {
	([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
		[Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Reloads this session's PATH from the registry, to see what winget or an installer just added
# without reopening the terminal.
function Update-SessionPath {
	$machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
	$user = [Environment]::GetEnvironmentVariable('Path', 'User')
	$env:Path = ($machine, $user | Where-Object { $_ }) -join ';'
}

# Work drive: D: if it exists (the C:/D: split), otherwise C:.
function Get-WorkDrive {
	if (Test-Path 'D:\') { return 'D:' }
	Warn 'No D: drive. C: will hold caches and globals (single-drive machine).'
	return 'C:'
}

function Install-WingetId($id) {
	winget list --id $id -e --accept-source-agreements 2>$null | Out-Null
	if ($LASTEXITCODE -eq 0) { Ok "$id"; return }
	if ($DryRun) { Would "winget install $id"; return }
	Info "installing $id ..."
	$extra = if ($WingetOverride.ContainsKey($id)) { '--override', $WingetOverride[$id] } else { @() }
	winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements --disable-interactivity @extra 2>&1 | Out-Null
	if ($LASTEXITCODE -eq 0) { Ok "$id installed" } else { Warn "winget returned $LASTEXITCODE for $id - check it by hand" }
}

# Installs one font from $NerdFonts: downloads it, verifies its SHA-256, extracts the .ttf files
# that match its Glob and registers them in HKCU.
function Install-NerdFont($font, $fontsDir) {
	$zip = Join-Path $env:TEMP "nf-$($font.Archive).zip"
	$ext = Join-Path $env:TEMP "nf-$($font.Archive)"
	Info "$($font.Archive): downloading ..."
	Invoke-WebRequest -UseBasicParsing -OutFile $zip `
		-Uri "https://github.com/ryanoasis/nerd-fonts/releases/download/$NerdFontsVersion/$($font.Archive).zip"
	$hash = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
	if ($hash -ne $font.Sha256) {
		Remove-Item $zip -Force -ErrorAction SilentlyContinue
		Die "SHA-256 of $($font.Archive) does not match (corrupt or tampered download)."
	}
	if (Test-Path $ext) { Remove-Item $ext -Recurse -Force }
	Expand-Archive -Path $zip -DestinationPath $ext -Force
	$n = 0; $skipped = 0
	Get-ChildItem (Join-Path $ext $font.Glob) -ErrorAction SilentlyContinue | ForEach-Object {
		$ttf = $_
		# Copy-Item fails on a .ttf in use (Windows Terminal or VS Code has it loaded). A locked
		# file is already installed, so it is skipped instead of aborting everything.
		try {
			Copy-Item $ttf.FullName $fontsDir -Force -ErrorAction Stop
			New-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts' `
				-Name "$($ttf.BaseName) (TrueType)" -Value "$fontsDir\$($ttf.Name)" -PropertyType String -Force | Out-Null
			$n++
		}
		catch { $skipped++ }
	}
	Remove-Item $zip, $ext -Recurse -Force -ErrorAction SilentlyContinue
	Ok "$($font.Archive): $n files ($($font.Family))"
	if ($skipped -gt 0) { Warn "$skipped in use, skipped (already installed; close Windows Terminal and VS Code to force them)" }
}

function Set-UserEnv($name, $value) {
	$cur = [Environment]::GetEnvironmentVariable($name, 'User')
	if ($cur -eq $value) { Ok "$name already = $value"; return }
	if ($DryRun) { Would "set $name = $value (current: '$cur')"; return }
	[Environment]::SetEnvironmentVariable($name, $value, 'User')
	Set-Item "env:$name" $value -ErrorAction SilentlyContinue
	Ok "$name -> $value"
}

function Add-UserPath($dir) {
	$cur = [Environment]::GetEnvironmentVariable('Path', 'User')
	if (($cur -split ';') -contains $dir) { Ok "PATH already has $dir"; return }
	if ($DryRun) { Would "add $dir to the user PATH"; return }
	[Environment]::SetEnvironmentVariable('Path', "$cur;$dir", 'User')
	Ok "PATH += $dir"
}

function Invoke-Step0Check {
	Step 'Preflight checks'
	if ($PSVersionTable.PSVersion.Major -lt 5) { Die 'PowerShell 5.1 or later is required.' }
	if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
		Die "winget is not available. Install 'App Installer' from the Microsoft Store."
	}
	if (Test-Admin) { Ok 'Administrator' }
	else {
		Warn 'Not running as administrator. WSL, Docker and some apps can fail or ask for UAC.'
		Warn "Recommended: open PowerShell with 'Run as administrator' and run it again."
	}
	if ($DryRun) { Warn 'DRY-RUN MODE: nothing changes, report only.' }
}

# Runs before winget: rustup installs wherever CARGO_HOME and RUSTUP_HOME point at that moment,
# and without them it ends up in the C: profile.
function Invoke-Step1Env($drive) {
	Step "Environment variables -> $drive"
	Set-UserEnv 'CARGO_HOME'          "$drive\Dev\Caches\cargo"
	Set-UserEnv 'RUSTUP_HOME'         "$drive\Dev\Caches\rustup"
	Set-UserEnv 'NUGET_PACKAGES'      "$drive\Dev\Caches\nuget"
	Set-UserEnv 'PUPPETEER_CACHE_DIR' "$drive\Dev\Caches\puppeteer"
	Set-UserEnv 'PNPM_HOME'           "$drive\Dev\pnpm"
	# The Node versions fnm installs, kept off C:.
	Set-UserEnv 'FNM_DIR'             "$drive\Dev\fnm"
	if (-not $DryRun) {
		$dirs = @(
			"$drive\Dev\Caches\cargo", "$drive\Dev\Caches\rustup", "$drive\Dev\Caches\nuget",
			"$drive\Dev\Caches\puppeteer", "$drive\Dev\Caches\npm", "$drive\Dev\pnpm",
			"$drive\Dev\npm-global", "$drive\Dev\fnm", "$drive\Dev\projects", "$drive\Dev\scratch"
		)
		foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
	}
	# fnm's default Node, for what starts without a shell profile (VS Code at launch, scheduled
	# tasks): without it they cannot find node. In a terminal, each repo's version wins.
	Add-UserPath "$drive\Dev\fnm\aliases\default"
	Add-UserPath "$drive\Dev\npm-global"
	Add-UserPath "$drive\Dev\Caches\cargo\bin"
	Add-UserPath "$drive\Dev\pnpm\bin"
}

function Invoke-Step2Winget {
	Step 'Essential set (winget)'
	foreach ($id in $WingetEssential) { Install-WingetId $id }
	# VS Code installs per user; from an elevated terminal its files end up owned by
	# Administrators and its updater fails with "access denied", so they go back to the user. It
	# uses domain\user: if the machine has the same name as the user, the bare name is the machine.
	$vscode = "$env:LOCALAPPDATA\Programs\Microsoft VS Code"
	if ((Test-Admin) -and -not $DryRun -and (Test-Path $vscode)) {
		icacls $vscode /setowner "$env:USERDOMAIN\$env:USERNAME" /T /C /Q | Out-Null
		Ok 'VS Code handed back to the user'
	}
	# PowerShell module for icons in ls/dir (the profile uses it). From 0.11.0 it uses the Nerd
	# Fonts v3 names; an older one shows empty icons.
	$ti = Get-Module -ListAvailable Terminal-Icons | Sort-Object Version -Descending | Select-Object -First 1
	if ($ti -and $ti.Version -ge [version]'0.11.0') { Ok "Terminal-Icons $($ti.Version) already installed" }
	elseif ($DryRun) { Would 'Install-Module Terminal-Icons' }
	else {
		# A fresh Windows lacks the NuGet provider, and Install-Module stops to ask for it.
		Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Scope CurrentUser -Force | Out-Null
		Install-Module -Name Terminal-Icons -MinimumVersion 0.11.0 -Scope CurrentUser -Force
		Ok 'Terminal-Icons installed'
	}
	Update-SessionPath
}

function Invoke-Step3Font {
	Step "Nerd Fonts $NerdFontsVersion"
	$fontsDir = "$env:LOCALAPPDATA\Microsoft\Windows\Fonts"
	$marker = Join-Path $fontsDir '.nerdfonts.version'
	# Idempotent by pinned version (as in Parrot): it reinstalls only if the marker differs. A
	# machine with the OLD font naming gets the new one, and later runs download nothing.
	if ((Get-Content $marker -ErrorAction SilentlyContinue) -eq $NerdFontsVersion) {
		Ok "Already installed ($NerdFontsVersion)"; return
	}
	if ($DryRun) { Would "install/update fonts to ${NerdFontsVersion}: $(($NerdFonts.Archive) -join ', ')"; return }
	New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null
	foreach ($font in $NerdFonts) { Install-NerdFont $font $fontsDir }
	Set-Content -Path $marker -Value $NerdFontsVersion -Encoding ASCII
	Ok "Nerd Fonts $NerdFontsVersion ready"
}

function Invoke-Step4Node($drive) {
	Step "Node $NodeMajor + pnpm + Claude Code (globals in $drive\Dev\npm-global)"
	Update-SessionPath
	if (-not (Get-Command fnm -ErrorAction SilentlyContinue)) {
		Warn 'fnm is not on this session''s PATH yet (it was just installed).'
		Warn 'Close and reopen PowerShell and run bootstrap.ps1 again to finish Node.'
		return
	}
	if ($DryRun) { Would "fnm install $NodeMajor and default; npm prefix/cache -> $drive; npm i -g @pnpm/exe and claude-code"; return }
	# fnm reads FNM_DIR, which step 1 left in the registry; this session does not see it yet.
	$env:FNM_DIR = "$drive\Dev\fnm"
	fnm install $NodeMajor | Out-Null
	fnm default $NodeMajor | Out-Null
	fnm env --shell powershell | Out-String | Invoke-Expression
	Update-SessionPath
	npm config set prefix "$drive\Dev\npm-global" | Out-Null
	npm config set cache  "$drive\Dev\Caches\npm" | Out-Null
	# @pnpm/exe and not pnpm: the same program packaged as its own executable, independent of the
	# active Node version. The two clash if both are installed, so it is always updated under
	# this same name.
	if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { npm install -g '@pnpm/exe' | Out-Null }
	if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { npm install -g '@anthropic-ai/claude-code' | Out-Null }
	Update-SessionPath
	if (Get-Command pnpm -ErrorAction SilentlyContinue) {
		pnpm config set store-dir "$drive\.pnpm-store" | Out-Null
		pnpm config set cache-dir "$drive\Dev\Caches\pnpm-cache" | Out-Null
	}
	Ok "Node $(node --version 2>$null), pnpm $(pnpm --version 2>$null), Claude Code ready"
}

function Invoke-Step5Wsl {
	Step "WSL ($WslDistro)"
	$raw = (& wsl.exe -l -q) 2>$null
	$list = (($raw -join "`n") -replace "`0", '')
	if ($list -match 'Ubuntu') { Ok 'WSL/Ubuntu already present'; return }
	if ($DryRun) { Would "wsl --install -d $WslDistro (needs a reboot)"; return }
	Warn "Installing WSL + $WslDistro - a REBOOT is needed when it finishes."
	wsl --install -d $WslDistro
}

# The identity goes in ~/.gitconfig.local, never through --global: ~/.gitconfig is the link to
# 15-git/gitconfig, so --global would write into the public repo. The defaults (branch, signing)
# already come from that file. An identity the machine already has is kept.
function Invoke-Step6Git {
	Step 'git identity (~/.gitconfig.local)'
	$local = Join-Path $env:USERPROFILE '.gitconfig.local'
	foreach ($key in ([ordered]@{ 'user.name' = $GitName; 'user.email' = $GitEmail }).GetEnumerator()) {
		$current = git config --file $local --get $key.Key 2>$null
		if ($current) { Ok "$($key.Key) already set: $current"; continue }
		if ($DryRun) { Would "git config --file ~/.gitconfig.local $($key.Key) '$($key.Value)'"; continue }
		git config --file $local $key.Key $key.Value
		Ok "$($key.Key) = $($key.Value) (GPG signing is in the manual steps)"
	}
}

function Invoke-Step7Symlink {
	Step 'Config symlinks (install.ps1)'
	if ($DryRun) { Would 'run install.ps1 (links profiles, WT, VS Code, oh-my-posh, bash, Claude Code; creates its settings.json if missing)'; return }
	& "$DotfilesRoot\install.ps1"
}

# Runs after the symlinks, so settings.json is already linked when the extensions start. Installs
# only the 30-vscode/vscode/extensions.txt entries `code --list-extensions` does not have.
function Invoke-Step8Extension {
	Step 'VS Code extensions (30-vscode/vscode/extensions.txt)'
	Update-SessionPath
	if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
		Warn 'code is not on this session''s PATH yet. Reopen PowerShell and run bootstrap.ps1 again.'
		return
	}
	$wanted = Get-Content "$DotfilesRoot\30-vscode\vscode\extensions.txt" | Where-Object { $_.Trim() }
	$installed = @(code --list-extensions 2>$null)
	$missing = @($wanted | Where-Object { $installed -notcontains $_ })
	if ($missing.Count -eq 0) { Ok "All $($wanted.Count) extensions already installed"; return }
	foreach ($ext in $missing) {
		if ($DryRun) { Would "code --install-extension $ext"; continue }
		code --install-extension $ext 2>&1 | Out-Null
		if ($LASTEXITCODE -eq 0) { Ok "$ext installed" } else { Warn "code returned $LASTEXITCODE for $ext - check it by hand" }
	}
}

function Invoke-Step9Manual {
	Step 'Done. MANUAL steps (secrets - not automated)'
	$lines = @(
		'1. Reboot if WSL or Docker was installed for the first time.',
		'',
		'2. SSH key (GitHub authentication):',
		'     ssh-keygen -t ed25519 -C "<user>@<machine>"',
		'     Upload ~/.ssh/id_ed25519.pub to GitHub -> Settings -> SSH and GPG keys.',
		'',
		'3. GPG key (commit signing + "Verified" badge):',
		"     gpg --quick-generate-key `"$GitName <$GitEmail>`" default default 2y",
		'     git config --file ~/.gitconfig.local user.signingkey <fingerprint>',
		'     (signing is already on in 15-git/gitconfig; the key belongs to each machine)',
		'     Upload the public key to GitHub. Details in docs/gpg-signing.md.'
	)
	$lines | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
}

Write-Host '=== dotfiles-windows bootstrap ===' -ForegroundColor Magenta
Write-Host "Repo: $DotfilesRoot" -ForegroundColor Gray
$drive = Get-WorkDrive

Invoke-Step0Check
Invoke-Step1Env  $drive
Invoke-Step2Winget
Invoke-Step3Font
Invoke-Step4Node $drive
Invoke-Step5Wsl
Invoke-Step6Git
Invoke-Step7Symlink
Invoke-Step8Extension
Invoke-Step9Manual

Write-Host "`n=== bootstrap complete ===" -ForegroundColor Magenta
