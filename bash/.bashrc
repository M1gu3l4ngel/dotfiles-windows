# ~/.bashrc — Git Bash
# Configuración de shell interactiva. Versionar en dotfiles-windows.

# Solo para shells interactivos: evita que oh-my-posh interfiera en scripts.
case $- in
    *i*) ;;
      *) return;;
esac

# oh-my-posh — mismo tema que PowerShell y WSL. La ubicación del repo se deriva
# del symlink de este archivo (~/.bashrc -> repo/bash/.bashrc), así funciona
# aunque el repo no esté clonado en ~/dotfiles.
if command -v oh-my-posh >/dev/null 2>&1; then
    _dotfiles_dir="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]:-$HOME/.bashrc}")")/.." 2>/dev/null && pwd)"
    _omp_theme="$_dotfiles_dir/oh-my-posh/capr4n.omp.json"
    [ -f "$_omp_theme" ] && eval "$(oh-my-posh init bash --config "$_omp_theme")"
    unset _dotfiles_dir _omp_theme
fi
