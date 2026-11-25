# lib/links.ps1
# Mapeo compartido de symlinks: archivo en el repo (Source) -> ruta destino en el
# sistema (Target). Lo usan install.ps1 y uninstall.ps1, para que el mapeo viva en
# un solo sitio y nunca se desincronicen.
#
# Se invoca con la raiz del repo y la ruta real de Documentos, que cada script
# calcula (Documentos puede estar redirigido a otra unidad).

# Estado de un enlace en disco, sin tocar nada:
#   ok      symlink al Source correcto
#   missing no hay nada en el destino
#   stale   symlink a otra ruta dentro del repo (una carpeta que se movio): es nuestro y
#           se reemplaza sin backup, porque no guarda nada que no este ya en el repo
#   foreign archivo real o symlink ajeno: install.ps1 lo respalda antes de enlazar
# Se mira con Get-Item y no con Test-Path: un symlink roto da False en PowerShell 5.1 y True
# en 7, y aqui hace falta saber que es un enlace aunque su destino ya no exista.
function Get-DotfilesLinkState {
	param(
		[Parameter(Mandatory)][string]$Source,
		[Parameter(Mandatory)][string]$Target,
		[Parameter(Mandatory)][string]$DotfilesRoot
	)
	$item = Get-Item -LiteralPath $Target -Force -ErrorAction SilentlyContinue
	if (-not $item) { return 'missing' }
	if ($item.LinkType -ne 'SymbolicLink') { return 'foreign' }
	$existing = [IO.Path]::GetFullPath(@($item.Target)[0])
	if ($existing -ieq [IO.Path]::GetFullPath($Source)) { return 'ok' }
	$root = [IO.Path]::GetFullPath($DotfilesRoot).TrimEnd('\') + '\'
	if ($existing.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { return 'stale' }
	return 'foreign'
}

function Get-DotfilesLink {
	param(
		[Parameter(Mandatory)][string]$DotfilesRoot,
		[Parameter(Mandatory)][string]$DocumentsPath
	)

	# Carpeta de trabajo, con la misma regla que Get-WorkDrive de bootstrap.ps1:
	# los proyectos viven en <disco>\Dev, fuera del perfil. Prettier y EditorConfig
	# buscan su configuracion subiendo carpetas, asi que el estilo global se enlaza
	# en el perfil (~) y tambien aqui, o no alcanzaria a los proyectos.
	$workDev = if (Test-Path 'D:\') { 'D:\Dev' } else { 'C:\Dev' }

	@(
		@{
			Source = "$DotfilesRoot\10-shell\powershell\Microsoft.PowerShell_profile.ps1"
			Target = "$DocumentsPath\PowerShell\Microsoft.PowerShell_profile.ps1"
			Label  = 'PowerShell 7 profile'
		},
		@{
			Source = "$DotfilesRoot\10-shell\powershell\Microsoft.PowerShell_profile.ps1"
			Target = "$DocumentsPath\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
			Label  = 'Windows PowerShell (legacy) profile'
		},
		# NOTA: deliberadamente NO se instala perfil para el host de VS Code
		# (Microsoft.VSCode_profile.ps1). Cargarlo cuesta ~872 ms en CADA terminal
		# integrada de VS Code (medido el 2026-09-18), donde se abren muchas. La
		# terminal de VS Code se queda sin oh-my-posh a proposito; la consola normal
		# si lo tiene. Git Bash abre como login shell, que lee .bash_profile.
		@{
			Source = "$DotfilesRoot\10-shell\bash\.bashrc"
			Target = "$env:USERPROFILE\.bashrc"
			Label  = 'Git Bash rc'
		},
		@{
			Source = "$DotfilesRoot\10-shell\bash\.bash_profile"
			Target = "$env:USERPROFILE\.bash_profile"
			Label  = 'Git Bash profile (carga .bashrc)'
		},
		# Git: la parte publica (este archivo va sin acentos: sin BOM, PowerShell 5.1 lo leeria mal). Lo privado (organizaciones de clientes y del trabajo) vive en
		# ~/.gitconfig.local, que no se versiona y gitconfig incluye si existe.
		@{
			Source = "$DotfilesRoot\15-git\gitconfig"
			Target = "$env:USERPROFILE\.gitconfig"
			Label  = 'Git config'
		},
		@{
			Source = "$DotfilesRoot\15-git\gitconfig-personal"
			Target = "$env:USERPROFILE\.gitconfig-personal"
			Label  = 'Git cuenta personal de GitHub'
		},
		# El tema de oh-my-posh no se enlaza: el perfil de PowerShell y .bashrc lo leen
		# directamente del repo.
		@{
			Source = "$DotfilesRoot\20-terminal\windows-terminal\settings.json"
			Target = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"
			Label  = 'Windows Terminal settings'
		},
		@{
			Source = "$DotfilesRoot\30-vscode\vscode\settings.json"
			Target = "$env:APPDATA\Code\User\settings.json"
			Label  = 'VS Code settings'
		},
		@{
			Source = "$DotfilesRoot\30-vscode\vscode\keybindings.json"
			Target = "$env:APPDATA\Code\User\keybindings.json"
			Label  = 'VS Code keybindings'
		},
		@{
			Source = "$DotfilesRoot\50-claude\CLAUDE.md"
			Target = "$env:USERPROFILE\.claude\CLAUDE.md"
			Label  = 'Claude global CLAUDE.md'
		},
		@{
			Source = "$DotfilesRoot\50-claude\statusline.mjs"
			Target = "$env:USERPROFILE\.claude\statusline.mjs"
			Label  = 'Claude statusline'
		},
		@{
			Source = "$DotfilesRoot\50-claude\hooks\block-shell-edits.mjs"
			Target = "$env:USERPROFILE\.claude\hooks\block-shell-edits.mjs"
			Label  = 'Claude hook block-shell-edits'
		},
		@{
			Source = "$DotfilesRoot\50-claude\hooks\block-forbidden-commands.mjs"
			Target = "$env:USERPROFILE\.claude\hooks\block-forbidden-commands.mjs"
			Label  = 'Claude hook block-forbidden-commands'
		},
		@{
			# Las reglas que importa el hook anterior. Enlazadas para que cada proyecto compare su
			# copia con esta, la fuente unica (`hook-rules-copy`).
			Source = "$DotfilesRoot\50-claude\hooks\command-rules.mjs"
			Target = "$env:USERPROFILE\.claude\hooks\command-rules.mjs"
			Label  = 'Claude reglas de comandos'
		},
		@{
			Source = "$DotfilesRoot\50-claude\hooks\reply-in-spanish.mjs"
			Target = "$env:USERPROFILE\.claude\hooks\reply-in-spanish.mjs"
			Label  = 'Claude hook reply-in-spanish'
		},
		# Regla global: Claude Code carga ~/.claude/rules/*.md en todos los proyectos.
		@{
			Source = "$DotfilesRoot\50-claude\rules\repo-conventions.md"
			Target = "$env:USERPROFILE\.claude\rules\repo-conventions.md"
			Label  = 'Claude regla repo-conventions'
		},
		# Skill global: la carpeta, como pide Claude Code (~/.claude/skills/<nombre>/SKILL.md).
		@{
			Source = "$DotfilesRoot\50-claude\skills\new-repo"
			Target = "$env:USERPROFILE\.claude\skills\new-repo"
			Label  = 'Claude skill new-repo'
		},
		# Panel de tareas: la carpeta entera (pagina, tema, generador y sus hooks), porque los
		# modulos se importan entre si por ruta relativa.
		@{
			Source = "$DotfilesRoot\50-claude\panel"
			Target = "$env:USERPROFILE\.claude\panel"
			Label  = 'Claude panel de tareas'
		},
		# Estilo global (copia de dotfiles-parrot, no un enlace a el): solo cubre
		# proyectos sin .prettierrc ni .editorconfig propios.
		@{
			Source = "$DotfilesRoot\40-format\prettierrc.json"
			Target = "$env:USERPROFILE\.prettierrc.json"
			Label  = 'Prettier global (perfil)'
		},
		@{
			Source = "$DotfilesRoot\40-format\prettierrc.json"
			Target = "$workDev\.prettierrc.json"
			Label  = 'Prettier global (carpeta de trabajo)'
		},
		@{
			Source = "$DotfilesRoot\40-format\editorconfig"
			Target = "$env:USERPROFILE\.editorconfig"
			Label  = 'EditorConfig global (perfil)'
		},
		@{
			Source = "$DotfilesRoot\40-format\editorconfig"
			Target = "$workDev\.editorconfig"
			Label  = 'EditorConfig global (carpeta de trabajo)'
		}
	)
}
