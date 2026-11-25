[English](README.md) | **Español**

# 15-git

La configuración de git: identidad, commits y tags firmados, y qué cuenta de GitHub usa cada
remoto, para que Git Credential Manager nunca pregunte cuál elegir.

| Ruta | Enlazado en | Qué es |
|---|---|---|
| `gitconfig` | `~/.gitconfig` | Nombre, correo `noreply`, commits y tags firmados, y las reglas de cuentas que pueden ser públicas |
| `gitconfig-personal` | `~/.gitconfig-personal` | La cuenta personal de GitHub, para sus repos y sus organizaciones |

La cuenta sigue al dueño del remoto (`includeIf "hasconfig:remote.*.url:…"`), no a la carpeta:
todos los repos viven en el mismo `D:\Dev\projects`.

## Lo que se queda en la máquina

Este repo es público, así que las organizaciones de clientes y del trabajo y sus cuentas nunca
entran en él, ni la clave de firma, que es de cada máquina. Viven en `~/.gitconfig.local`, que
`gitconfig` incluye al final y git se salta si no existe:

```ini
[user]
	signingkey = <fingerprint>
[includeIf "hasconfig:remote.*.url:https://github.com/example-org/**"]
	path = ~/.gitconfig-example
```

## Comprobar

```powershell
git -C <repository> config --get credential.https://github.com.username
```
