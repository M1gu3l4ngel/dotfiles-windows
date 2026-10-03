[English](formatting.md) | **Español**

# Formato del código

El estilo vive en dos archivos que leen todas las herramientas (VS Code, el
CLI de Prettier, el CI), no en los ajustes del editor. Son una copia de los de
[dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot), así que las
dos máquinas formatean igual.

| Archivo | Enlazado en | Qué formatea |
|---|---|---|
| `format/prettierrc.json` | `~\.prettierrc.json` y `<disk>\Dev\.prettierrc.json` | Prettier: JS, TS, JSON, CSS, HTML, Markdown y YAML |
| `format/editorconfig` | `~\.editorconfig` y `<disk>\Dev\.editorconfig` | Sangría y finales de línea de todo lo demás (shell, SQL, TOML, `.env`) |

## Por qué dos ubicaciones

Prettier y EditorConfig buscan su configuración subiendo carpetas desde la del
archivo. En Windows los proyectos viven en `<disk>\Dev` (`D:\Dev`, o `C:\Dev`
en una máquina sin disco `D:`), fuera del perfil, así que un archivo solo en
`~` nunca los alcanzaría. `install.ps1` crea los dos enlaces.

## Precedencia

Gana la configuración más cercana al archivo, sin mezclar:

- Un proyecto con su propio `.prettierrc` o `.editorconfig` (con
  `root = true`) usa el suyo y nunca el global.
- El global solo se aplica a los archivos que no tienen configuración propia.
- Un proyecto compartido o con CI debe llevar siempre la suya: el CI y las
  demás personas no tienen tu máquina.

## En VS Code

Al guardar, VS Code formatea con Prettier; el shell con shfmt (lee el
`.editorconfig`) y el SQL con SQLTools. Solo guarda al cambiar de pestaña o de
ventana (`"files.autoSave": "onFocusChange"`): el autoguardado por tiempo no
formatea. VS Code lee el `.editorconfig` con la extensión EditorConfig, que
está en `vscode/extensions.txt`.

Para cambiar el estilo, edita los dos archivos con los mismos valores y
mantenlos idénticos a los de dotfiles-parrot.
