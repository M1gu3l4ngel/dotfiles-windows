# lib/links.ps1
# Mapeo compartido de symlinks: archivo en el repo (Source) -> ruta destino en el
# sistema (Target). Lo usan install.ps1 y uninstall.ps1, para que el mapeo viva en
# un solo sitio y nunca se desincronicen.
#
# Se invoca con la raiz del repo y la ruta real de Documentos, que cada script
# calcula (Documentos puede estar redirigido a otra unidad).

function Get-DotfilesLink {
	param(
		[Parameter(Mandatory)][string]$DotfilesRoot,
		[Parameter(Mandatory)][string]$DocumentsPath
	)

	@(
		@{
			Source = "$DotfilesRoot\powershell\Microsoft.PowerShell_profile.ps1"
			Target = "$DocumentsPath\PowerShell\Microsoft.PowerShell_profile.ps1"
			Label  = 'PowerShell 7 profile'
		},
		@{
			Source = "$DotfilesRoot\powershell\Microsoft.PowerShell_profile.ps1"
			Target = "$DocumentsPath\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
			Label  = 'Windows PowerShell (legacy) profile'
		},
		# NOTA: deliberadamente NO se instala perfil para el host de VS Code
		# (Microsoft.VSCode_profile.ps1). Cargarlo cuesta ~872 ms en CADA terminal
		# integrada de VS Code (medido el 2026-09-18), donde se abren muchas. La
		# terminal de VS Code se queda sin oh-my-posh a proposito; la consola normal
		# si lo tiene. Git Bash abre como login shell, que lee .bash_profile.
		@{
			Source = "$DotfilesRoot\bash\.bashrc"
			Target = "$env:USERPROFILE\.bashrc"
			Label  = 'Git Bash rc'
		},
		@{
			Source = "$DotfilesRoot\bash\.bash_profile"
			Target = "$env:USERPROFILE\.bash_profile"
			Label  = 'Git Bash profile (carga .bashrc)'
		},
		@{
			Source = "$DotfilesRoot\oh-my-posh\capr4n.omp.json"
			Target = "$env:LOCALAPPDATA\Programs\oh-my-posh\themes\capr4n.omp.json"
			Label  = 'oh-my-posh theme (capr4n)'
		},
		@{
			Source = "$DotfilesRoot\windows-terminal\settings.json"
			Target = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"
			Label  = 'Windows Terminal settings'
		},
		@{
			Source = "$DotfilesRoot\vscode\settings.json"
			Target = "$env:APPDATA\Code\User\settings.json"
			Label  = 'VS Code settings'
		},
		@{
			Source = "$DotfilesRoot\vscode\keybindings.json"
			Target = "$env:APPDATA\Code\User\keybindings.json"
			Label  = 'VS Code keybindings'
		}
	)
}
