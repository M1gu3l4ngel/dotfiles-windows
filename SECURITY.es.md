[English](SECURITY.md) | **Español**

# Seguridad

## Versiones con soporte

Solo el último commit de `main` recibe arreglos. Cada versión está en
[`CHANGELOG.es.md`](CHANGELOG.es.md).

## Reportar una vulnerabilidad

No abras un issue público. Repórtala en privado en GitHub: en este repositorio, abre
**Security**, luego **Report a vulnerability**, y rellena el formulario.

Incluye qué se ve afectado (un script, un hook, una configuración enlazada, el workflow de CI),
los pasos para reproducirlo y el impacto que ves. Recibes una respuesta que confirma el reporte,
y se te informa hasta que esté arreglado. Cuando el arreglo se publica, el reporte se hace
público con tu crédito, salvo que prefieras lo contrario.

## Alcance

- **Dentro:** los scripts (`bootstrap.ps1`, `install.ps1`, `uninstall.ps1`, `tools/`), los
  hooks y herramientas de Claude Code en `50-claude/`, el workflow de CI, y cualquier cosa de
  este repositorio que pueda filtrar un secreto, descargar algo sin verificar o ejecutar código
  que el usuario no esperaba.
- **Fuera:** las vulnerabilidades de las herramientas que instala (winget, PowerShell, Node.js,
  VS Code, Claude Code, oh-my-posh), que van a sus propios proyectos.
