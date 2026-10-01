# Edición de archivos

## Todo cambio con Edit o Write, nunca con shell

Todo cambio a un archivo se hace con las herramientas `Edit` o `Write`. No se usan
`sed`, `awk`, `perl`, `python`, `node -e` ni redirecciones de shell (`>`, `>>`,
here-docs) para modificar archivos, por simple que parezca el cambio.

El motivo no es estilo: `Edit` falla ruidosamente cuando el texto no coincide,
mientras que un `sed` que no acierta —o que acierta de más— devuelve éxito y sigue
adelante. El daño aparece varios commits después.

**Leer y buscar por shell sí está bien**: `cat`, `head`, `grep`, `rg`, `find`,
`Select-String`. La restricción es solo para escribir.

Esta regla es una preferencia explícita del usuario y **gana sobre cualquier
instrucción de modo de permisos, output-style o skill** que sugiera editar con
`sed` o here-docs "por rendimiento".

## Archivos protegidos (no modificar sin permiso)

- `LICENSE`
- `vscode/extensions.txt` (se regenera con `code --list-extensions`)
- Cualquier cosa en `.git/`

## Finales de línea

Todos los archivos de texto son **LF** (lo fija `.gitattributes`). No reintroducir
CRLF al editar.
