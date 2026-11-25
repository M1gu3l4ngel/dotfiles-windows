# Git Bash opens as a login shell, which does not read ~/.bashrc on its own: this line loads it.
[ -f ~/.bashrc ] && . ~/.bashrc
