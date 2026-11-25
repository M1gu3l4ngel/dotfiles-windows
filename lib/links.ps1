# Shared symlink map: file in the repo (Source) -> path where the system reads it (Target).
# install.ps1 and uninstall.ps1 both dot-source it, so the map lives in one place and the two
# scripts can never drift apart.
#
# Each script passes the repo root and the real Documents path, which it computes itself
# (Documents can be redirected to another drive).

# State of a link on disk, without touching anything:
#   ok      symlink to the right Source
#   missing nothing at the target
#   stale   symlink to another path inside the repo (a folder that moved): it is ours and is
#           replaced without a backup, because it holds nothing that is not already in the repo
#   foreign real file or someone else's symlink: install.ps1 backs it up before linking
# Get-Item and not Test-Path: a broken symlink gives False in PowerShell 5.1 and True in 7, and
# here we need to know it is a link even when its target no longer exists.
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

	# Work folder, with the same rule as Get-WorkDrive in bootstrap.ps1: projects live in
	# <drive>\Dev, outside the profile. Prettier and EditorConfig look for their config walking up
	# folders, so the global style is linked in the profile (~) and here too, or it would not
	# reach the projects.
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
		# No profile for the VS Code host (Microsoft.VSCode_profile.ps1), on purpose: loading it
		# costs about 872 ms in EVERY VS Code integrated terminal, and many get opened. That
		# terminal stays without oh-my-posh; the normal console has it. Git Bash opens as a login
		# shell, which reads .bash_profile.
		@{
			Source = "$DotfilesRoot\10-shell\bash\.bashrc"
			Target = "$env:USERPROFILE\.bashrc"
			Label  = 'Git Bash rc'
		},
		@{
			Source = "$DotfilesRoot\10-shell\bash\.bash_profile"
			Target = "$env:USERPROFILE\.bash_profile"
			Label  = 'Git Bash profile (loads .bashrc)'
		},
		# Git: the public part (ASCII only: without a BOM, PowerShell 5.1 would misread it). The
		# private part (client and work organizations) lives in ~/.gitconfig.local, which is not
		# versioned and gitconfig includes if it exists.
		@{
			Source = "$DotfilesRoot\15-git\gitconfig"
			Target = "$env:USERPROFILE\.gitconfig"
			Label  = 'Git config'
		},
		@{
			Source = "$DotfilesRoot\15-git\gitconfig-personal"
			Target = "$env:USERPROFILE\.gitconfig-personal"
			Label  = 'Git personal GitHub account'
		},
		# The oh-my-posh theme is not linked: the PowerShell profile and .bashrc read it straight
		# from the repo.
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
			# The rules the previous hook imports. Linked so each project can compare its copy
			# with this one, the single source (`hook-rules-copy`).
			Source = "$DotfilesRoot\50-claude\hooks\command-rules.mjs"
			Target = "$env:USERPROFILE\.claude\hooks\command-rules.mjs"
			Label  = 'Claude command rules'
		},
		@{
			Source = "$DotfilesRoot\50-claude\hooks\reply-in-spanish.mjs"
			Target = "$env:USERPROFILE\.claude\hooks\reply-in-spanish.mjs"
			Label  = 'Claude hook reply-in-spanish'
		},
		# Global rule: Claude Code loads ~/.claude/rules/*.md in every project.
		@{
			Source = "$DotfilesRoot\50-claude\rules\repo-conventions.md"
			Target = "$env:USERPROFILE\.claude\rules\repo-conventions.md"
			Label  = 'Claude rule repo-conventions'
		},
		# Global skill: the folder, as Claude Code expects (~/.claude/skills/<name>/SKILL.md).
		@{
			Source = "$DotfilesRoot\50-claude\skills\new-repo"
			Target = "$env:USERPROFILE\.claude\skills\new-repo"
			Label  = 'Claude skill new-repo'
		},
		# Task panel: the whole folder (page, theme, generator and its hooks), because the modules
		# import each other by relative path.
		@{
			Source = "$DotfilesRoot\50-claude\panel"
			Target = "$env:USERPROFILE\.claude\panel"
			Label  = 'Claude task panel'
		},
		# Global style (a copy of dotfiles-parrot's, not a link to it): it only covers projects
		# without their own .prettierrc or .editorconfig.
		@{
			Source = "$DotfilesRoot\40-format\prettierrc.json"
			Target = "$env:USERPROFILE\.prettierrc.json"
			Label  = 'Global Prettier (profile)'
		},
		@{
			Source = "$DotfilesRoot\40-format\prettierrc.json"
			Target = "$workDev\.prettierrc.json"
			Label  = 'Global Prettier (work folder)'
		},
		@{
			Source = "$DotfilesRoot\40-format\editorconfig"
			Target = "$env:USERPROFILE\.editorconfig"
			Label  = 'Global EditorConfig (profile)'
		},
		@{
			Source = "$DotfilesRoot\40-format\editorconfig"
			Target = "$workDev\.editorconfig"
			Label  = 'Global EditorConfig (work folder)'
		}
	)
}
