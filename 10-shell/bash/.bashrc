# Git Bash interactive shell config, linked to ~/.bashrc by install.ps1 and loaded by
# .bash_profile, since Git Bash opens as a login shell.

# Interactive shells only: keeps oh-my-posh out of scripts.
case $- in
    *i*) ;;
    *) return ;;
esac

# fnm: entering a repo switches to the Node version it asks for (.node-version, .nvmrc or
# package.json engines.node, searching upwards), in this terminal only.
if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --use-on-cd --version-file-strategy recursive --shell bash)"
fi

# oh-my-posh, with the same theme as PowerShell and WSL. The theme folder comes from this file's
# symlink (~/.bashrc -> repo/10-shell/bash/.bashrc), so it works even when the repo is not cloned
# in ~/dotfiles.
if command -v oh-my-posh >/dev/null 2>&1; then
    _shell_dir="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]:-$HOME/.bashrc}")")/.." 2>/dev/null && pwd)"
    _omp_theme="$_shell_dir/oh-my-posh/capr4n.omp.json"
    [ -f "$_omp_theme" ] && eval "$(oh-my-posh init bash --config "$_omp_theme")"
    unset _shell_dir _omp_theme
fi
