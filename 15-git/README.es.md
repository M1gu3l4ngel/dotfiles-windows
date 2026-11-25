[English](README.md) | **Español**

# 15-git

La configuración de git: identidad, commits y tags firmados, y qué cuenta de GitHub usa cada
remoto, para que Git Credential Manager nunca pregunte cuál elegir.

| Ruta | Enlazado en | Qué es |
|---|---|---|
| `gitconfig` | `~/.gitconfig` | Commits y tags firmados, la rama por defecto, y las reglas de cuentas que pueden ser públicas |
| `gitconfig-personal` | `~/.gitconfig-personal` | La cuenta personal de GitHub, para sus repos y sus organizaciones |

La cuenta sigue al dueño del remoto (`includeIf "hasconfig:remote.*.url:…"`), no a la carpeta:
todos los repos viven en el mismo `D:\Dev\projects`.

## Lo que se queda en la máquina

Este repo es público, así que lo que es de una persona o de una máquina no entra en él: la
identidad (nombre y correo `noreply`), la clave de firma, y cualquier organización, tuya, de un
cliente o del trabajo, con su cuenta. Viven en `~/.gitconfig.local`, que `gitconfig` incluye al
final y git se salta si no existe. Quien haga un fork del repo hace commits con su propio nombre.

`bootstrap.ps1` escribe ahí la identidad si la máquina no tiene una, desde `-GitName` y
`-GitEmail` (los del dueño por defecto; un fork pasa los suyos), e `install.ps1 -Check` avisa si
falta. Lo demás se escribe a mano: la clave de firma, una organización tuya que apunta a
`~/.gitconfig-personal`, y una del trabajo a su propio archivo de cuenta:

```ini
[user]
	name = <user>
	email = <id>+<user>@users.noreply.github.com
	signingkey = <fingerprint>
[includeIf "hasconfig:remote.*.url:https://github.com/your-org/**"]
	path = ~/.gitconfig-personal
[includeIf "hasconfig:remote.*.url:https://github.com/example-org/**"]
	path = ~/.gitconfig-example
```

## Comprobar

```powershell
git -C <repository> config --get credential.https://github.com.username
```
