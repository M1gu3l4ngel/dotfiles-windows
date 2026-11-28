# 10-shell

The shells and their prompt: PowerShell and Git Bash load the same oh-my-posh
theme, so the prompt looks the same in both.

- **`powershell/Microsoft.PowerShell_profile.ps1`**, linked to `Documents\PowerShell\` and `Documents\WindowsPowerShell\`: one profile for PowerShell 7 and Windows PowerShell.
- **`bash/.bashrc`**, linked to `~/.bashrc`: the Git Bash interactive shell, which loads the prompt.
- **`bash/.bash_profile`**, linked to `~/.bash_profile`: Git Bash opens as a login shell, which does not read `.bashrc`, so this file loads it.
- **`oh-my-posh/capr4n.omp.json`**, read in place: the prompt theme, shared with [dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot).

`install.ps1` creates the links. The profile and `.bashrc` find the theme through
their own link, so the repo works cloned in any folder.

The VS Code integrated terminal gets no profile on purpose: loading it costs
almost a second in every terminal (see `lib/links.ps1`).

## Reload

- PowerShell: `. $PROFILE`
- Git Bash: `exec bash`
