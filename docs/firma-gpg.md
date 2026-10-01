# Firma de commits con GPG (Windows)

Setup de firma criptográfica de commits/tags. Objetivo: firmar todo (integridad +
"Verified" en GitHub) sin reintroducir la passphrase en cada commit, gracias al
caché del `gpg-agent`.

Es el enfoque estándar: no se desactiva la firma, se delega la passphrase al agente
y se cachea por una ventana corta.

## Estado

| Ajuste | Valor |
|---|---|
| Método | GPG clásico (OpenPGP), no SSH signing |
| Clave de firma | `ed25519/<TU_KEYID>` |
| Fingerprint | `<TU_FINGERPRINT>` |
| UID | `<tu-nombre> <TU_ID+usuario@users.noreply.github.com>` |
| `commit.gpgsign` / `tag.gpgsign` | `true` |
| `gpg.program` | `C:\Program Files\GnuPG\bin\gpg.exe` |
| Home de GnuPG | `%APPDATA%\gnupg` |
| pinentry | gráfico (Gpg4win): foco en el input y captura de teclado |

La config de firma vive en el `.gitconfig` global (que no se versiona). Se
estableció una vez con:

```powershell
git config --global user.signingkey <TU_FINGERPRINT>
git config --global commit.gpgsign true
git config --global tag.gpgsign true
git config --global gpg.program "C:\Program Files\GnuPG\bin\gpg.exe"
```

## El caché de la passphrase

El archivo que controla el "no me pidas la passphrase cada vez":

```
%APPDATA%\gnupg\gpg-agent.conf
```

```ini
# Segundos de inactividad antes de olvidar la passphrase (10 min, ventana deslizante)
default-cache-ttl 600

# Vida máxima absoluta desde que se introdujo (2 h)
max-cache-ttl 7200

# Pinentry gráfico (Gpg4win): abre el diálogo con foco en el input y agarra el teclado
pinentry-program C:/Program Files/Gpg4win/bin/pinentry.exe
```

- `default-cache-ttl` (600 s): ventana deslizante desde el último uso. Cada commit
  dentro de la ventana reinicia el contador.
- `max-cache-ttl` (7200 s): tope absoluto desde que la introdujiste, sin importar
  cuánto la reutilices. Es la red de seguridad.

Mientras el TTL está vigente, la passphrase vive descifrada en la memoria del
`gpg-agent`; la clave privada nunca sale del agente. 10 min equilibra comodidad y
exposición.

## Aplicar / recargar cambios

Tras editar `gpg-agent.conf`, recarga el agente sin matar la sesión:

```powershell
gpg-connect-agent reloadagent /bye
```

Verificar que los TTL quedaron activos (el último número de cada línea es el real):

```powershell
gpgconf --list-options gpg-agent | Select-String "^default-cache-ttl:|^max-cache-ttl:"
```

## Revertir

Reversible, no toca la clave ni el `.gitconfig`:

```powershell
Remove-Item "$env:APPDATA\gnupg\gpg-agent.conf"
gpg-connect-agent reloadagent /bye
```

Para dejar de firmar (no recomendado):

```powershell
git config --global commit.gpgsign false
git config --global tag.gpgsign false
```

## Cambiar la passphrase

Cambia solo el candado local de la clave privada; no cambia la clave, ni el
fingerprint, ni la pública (no hay que resubir nada a GitHub). Backup antes (el
`.asc` contiene la clave privada — guárdalo seguro, nunca al repo):

```powershell
gpg --export-secret-keys --armor <TU_FINGERPRINT> > "$env:USERPROFILE\gpg-key-backup.asc"
gpg --change-passphrase <TU_FINGERPRINT>
gpg-connect-agent reloadagent /bye
```

Hazlo en una ventana normal de PowerShell, no en la terminal integrada de VS Code.

## Troubleshooting

- **Pinentry gráfico (Gpg4win):** se instaló por winget (`GnuPG.Gpg4win`) solo para
  usar su `pinentry.exe`, que abre el diálogo con el foco ya en el input y agarra el
  teclado. Coexisten dos GnuPG: el standalone 2.5.x (`C:\Program Files\GnuPG`, el que
  firma) y el de Gpg4win (del que solo se toma el pinentry). Si un `gpg` suelto
  resuelve al de Gpg4win por orden de `PATH`, prioriza `C:\Program Files\GnuPG\bin`.
- **Sigue pidiendo la passphrase en cada commit:** revisa que el agente esté vivo
  (`gpg-connect-agent reloadagent /bye`) y que `ignore-cache-for-signing` no esté activo.
- **"gpg failed to sign the data":** el agente no arrancó o `gpg.program` apunta mal.
  Verifica `git config --global gpg.program` y prueba `echo test | gpg --clearsign`.
- **GitHub muestra "Unverified" — el email de la firma no coincide con el del commit:**
  los commits usan el email **noreply**, así que la clave GPG debe tener un UID con ese
  mismo noreply. Si solo tiene tu correo personal, añade el UID:

  ```powershell
  gpg --edit-key <TU_FINGERPRINT>
  # dentro del prompt de gpg:
  #   adduid   -> nombre + <TU_ID+usuario@users.noreply.github.com>
  #   save
  ```

  Luego re-exporta la clave pública (`gpg --armor --export <TU_FINGERPRINT>`) y
  vuelve a subirla a GitHub → Settings → SSH and GPG keys.

## Reproducir en otra máquina

Como `gpg-agent.conf` no contiene secretos (solo los TTL), es seguro replicarlo:

1. Importar la clave privada GPG (backup) y confiar en ella.
2. Configurar `user.signingkey`, `commit.gpgsign`, `tag.gpgsign`, `gpg.program`.
3. Copiar `gpg-agent.conf` a `%APPDATA%\gnupg\` y recargar el agente.
