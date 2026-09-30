# Firmado de commits con GPG (Windows)

Documentación del setup de firma criptográfica de commits/tags en esta máquina.
Objetivo: firmar **todo** (integridad + "Verified" en GitHub) sin reintroducir la
passphrase en cada commit, gracias al caché del `gpg-agent`.

Este es el enfoque estándar que usan la mayoría de proyectos serios: no se desactiva
la firma, se delega la passphrase al agente y se cachea por una ventana corta.

---

## Estado actual

| Ajuste | Valor |
|---|---|
| Método | **GPG clásico (OpenPGP)** — no SSH signing |
| Clave de firma | `ed25519/<TU_KEYID>` |
| Fingerprint | `<TU_FINGERPRINT>` |
| UID | `<tu-nombre> <TU_ID+usuario@users.noreply.github.com>` |
| `commit.gpgsign` | `true` |
| `tag.gpgsign` | `true` |
| `gpg.program` | `C:\Program Files\GnuPG\bin\gpg.exe` |
| GnuPG | 2.5.20 |
| Home de GnuPG | `%APPDATA%\gnupg` |
| pinentry | `pinentry.exe` gráfico (Gpg4win) — foco en el input y captura de teclado |

La config de firma vive en `.gitconfig` global (que **no** se versiona en este repo,
ver `CLAUDE.md`). Se estableció una vez con:

```powershell
git config --global user.signingkey <TU_FINGERPRINT>
git config --global commit.gpgsign true
git config --global tag.gpgsign true
git config --global gpg.program "C:\Program Files\GnuPG\bin\gpg.exe"
```

---

## El caché de la passphrase

El corazón del "no me pidas la passphrase cada vez" es el archivo:

```
%APPDATA%\gnupg\gpg-agent.conf
```

Contenido:

```ini
# Segundos de inactividad antes de olvidar la passphrase (10 min, ventana deslizante)
default-cache-ttl 600

# Vida máxima absoluta de la passphrase desde que se introdujo (2 h)
max-cache-ttl 7200

# Pinentry gráfico (Gpg4win): abre el diálogo con foco en el input y agarra el teclado
pinentry-program C:/Program Files/Gpg4win/bin/pinentry.exe
```

### Qué significa cada TTL

- **`default-cache-ttl` (600 s = 10 min):** ventana deslizante desde el **último uso**.
  Cada commit que acierta el caché **reinicia** el contador. Si haces commits con menos
  de 10 min entre ellos, no te vuelve a preguntar.
- **`max-cache-ttl` (7200 s = 2 h):** tope **absoluto** desde que introdujiste la
  passphrase, sin importar cuánto la reutilices. Al llegar aquí te la vuelve a pedir.
  Es la red de seguridad para que una sesión no quede desbloqueada indefinidamente.

Commits y tags comparten el mismo caché (misma clave, mismo agente).

### Implicación de seguridad

Mientras el TTL está vigente, la passphrase vive **descifrada en la memoria del
`gpg-agent`**. 10 min es un buen equilibrio: cómodo para trabajar en ráfaga y con una
ventana corta de exposición si te alejas del equipo. Subir el TTL a horas es más cómodo
pero amplía esa ventana. La clave privada **nunca** sale del agente.

---

## Aplicar / recargar cambios

Tras editar `gpg-agent.conf`, recarga el agente **sin matar la sesión**:

```powershell
gpg-connect-agent reloadagent /bye
```

Verificar que los TTL quedaron activos (el último número de cada línea es el valor real):

```powershell
gpgconf --list-options gpg-agent | Select-String "^default-cache-ttl:|^max-cache-ttl:"
# default-cache-ttl:...:600::600   <- el ultimo 600 = valor activo
# max-cache-ttl:...:7200::7200     <- el ultimo 7200 = valor activo
```

Probar el flujo real: haz un commit (te pedirá la passphrase una vez) y luego otro
dentro de 10 min (ya no debería pedirla).

---

## Revertir todo

El cambio es 100% reversible y no toca la clave, el `.gitconfig` ni los repos:

```powershell
# Borrar la config de caché (vuelve a los defaults compilados de GnuPG)
Remove-Item "$env:APPDATA\gnupg\gpg-agent.conf"

# Si en algún momento hubo backup previo, restaurarlo en su lugar:
# Move-Item "$env:APPDATA\gnupg\gpg-agent.conf.pre-dotfiles.bak" "$env:APPDATA\gnupg\gpg-agent.conf" -Force

# Recargar el agente
gpg-connect-agent reloadagent /bye
```

Para dejar de firmar por completo (no recomendado):

```powershell
git config --global commit.gpgsign false
git config --global tag.gpgsign false
```

---

## Cambiar la passphrase de la clave

Cambia **solo el candado local** de la clave privada. **No** cambia la clave, ni su
fingerprint, ni la clave pública: no hay que resubir nada a GitHub ni se invalidan los
commits antiguos.

Backup recomendado antes de tocar nada (el `.asc` contiene la clave privada — guárdalo
seguro y **nunca** lo subas al repo):

```powershell
gpg --export-secret-keys --armor <TU_FINGERPRINT> > "$env:USERPROFILE\gpg-key-backup.asc"
```

Cambiar la passphrase (pedirá la actual y luego la nueva dos veces, vía pinentry).
Hazlo en una **ventana normal de PowerShell**, no en la terminal integrada de VS Code:

```powershell
gpg --change-passphrase <TU_FINGERPRINT>
```

Tras cambiarla, forzar que el agente olvide la vieja cacheada:

```powershell
gpg-connect-agent reloadagent /bye
```

---

## Troubleshooting

- **Pinentry gráfico (Gpg4win):** se instaló Gpg4win 5.x por winget (`winget install --id
  GnuPG.Gpg4win`) solo para usar su pinentry gráfico, que abre el diálogo con el **foco ya
  en el input** y **agarra el teclado** (escribes de una y ENTER envía) — a diferencia de
  `pinentry-basic`, que no roba el foco. Se configura con `pinentry-program` en
  `gpg-agent.conf` (ver arriba) y `gpg-connect-agent reloadagent /bye`.
    - **Coexisten dos GnuPG:** el standalone 2.5.x (`C:\Program Files\GnuPG`, el que firma,
      apuntado por `gpg.program`) y el de Gpg4win (`C:\Program Files\Gpg4win`, del que solo
      tomamos `pinentry.exe`). La firma no se ve afectada. Si un `gpg` suelto en la terminal
      resolviera al de Gpg4win por orden de `PATH`, reordena el `PATH` para priorizar
      `C:\Program Files\GnuPG\bin`.
    - Para volver al pinentry de consola: borra la línea `pinentry-program` del
      `gpg-agent.conf` y recarga el agente.
- **Sigue pidiendo la passphrase en cada commit:** si aún pasara, revisa que el agente esté
  vivo (`gpg-connect-agent reloadagent /bye`) y que `ignore-cache-for-signing` no esté
  activo.
- **"gpg failed to sign the data":** normalmente el agente no arrancó o `gpg.program`
  apunta mal. Verifica `git config --global gpg.program` y prueba `echo test | gpg --clearsign`.
- **GitHub no muestra "Verified":** la clave pública GPG debe estar subida a
  GitHub → Settings → SSH and GPG keys, y el email del UID debe coincidir con el del commit.

---

## Reproducir en otra máquina

Como `gpg-agent.conf` no contiene secretos (solo los TTL), es seguro replicarlo. Pasos
en una máquina nueva:

1. Importar la clave privada GPG (backup) y confiar en ella.
2. Configurar `user.signingkey`, `commit.gpgsign`, `tag.gpgsign`, `gpg.program` (ver arriba).
3. Copiar este `gpg-agent.conf` a `%APPDATA%\gnupg\` y recargar el agente.

> Opcional: versionar `gpg-agent.conf` dentro de este repo y crear su symlink desde
> `install.ps1` para automatizar el paso 3. No se hizo por defecto para no tocar el
> instalador sin pedirlo.
