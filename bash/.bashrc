# ~/.bashrc — Git Bash
# Configuración de shell interactiva. Versionar en dotfiles-windows.

# Solo para shells interactivos: evita que oh-my-posh interfiera en scripts.
case $- in
    *i*) ;;
      *) return;;
esac

# oh-my-posh — mismo tema que PowerShell y WSL (desde el repo dotfiles)
if command -v oh-my-posh >/dev/null 2>&1; then
    eval "$(oh-my-posh init bash --config "$HOME/dotfiles/oh-my-posh/capr4n.omp.json")"
fi
