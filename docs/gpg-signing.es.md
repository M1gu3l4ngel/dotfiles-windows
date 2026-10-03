[English](gpg-signing.md) | **Español**

# Firma de commits con GPG (Windows)

Firmar todos los commits y tags (integridad + badge "Verified" en GitHub) sin
reintroducir la passphrase en cada commit, gracias al caché del `gpg-agent`.

No se desactiva la firma: se delega la passphrase al agente y se cachea una
ventana corta. Todo desde una ventana normal de PowerShell (no la terminal
integrada de VS Code, que a veces no enfoca el pinentry).

## Dos detalles de Windows que confunden

**1. Hay dos GnuPG.** El standalone (`C:\Program Files\GnuPG\bin\gpg.exe`, el que
usa git) y el de Gpg4win (`C:\Program Files\Gpg4win\...`, del que solo se toma el
pinentry gráfico). El `gpg` suelto del PATH suele ser el de Gpg4win y **puede no
ver tus claves**. Para operar sobre la clave, usa **siempre la ruta completa** del
standalone:

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --list-secret-keys --keyid-format long
```

**2. Key ID vs fingerprint son la misma clave.** El *fingerprint* son 40
caracteres; el *Key ID* son los **últimos 16** de ese fingerprint. GitHub y gpg a
veces muestran uno u otro. No son dos claves distintas.

## 1. Email noreply de GitHub

Cada commit publica el email del autor. En GitHub → Settings → Emails:

1. Marca "Keep my email addresses private".
2. Copia tu dirección `<id>+<user>@users.noreply.github.com`. En esta guía es
   `<your-noreply>`.

El commit **y** el UID de la clave GPG deben usar ese `<your-noreply>` para que
GitHub muestre "Verified". En los comandos, `<name>` es el nombre que quieres en
la clave y `<fingerprint>` el de tu clave.

## 2. La clave GPG

### Caso A: clave nueva (recomendado, como Parrot)

Se crea directamente con el noreply, así nunca lleva tu correo personal:

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --quick-generate-key "<name> <your-noreply>" default default 2y
```

Guarda la passphrase en tu lugar seguro (si la olvidas, no se recupera).

### Caso B: ya tienes una clave con tu email personal

Añade el UID noreply (pedirá la passphrase por pinentry):

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --quick-add-uid <fingerprint> "<name> <your-noreply>"
```

Para que tu correo personal **no quede público** en la clave, tienes dos opciones:

- **No destructiva (filtro al exportar, estilo Parrot):** la clave conserva ambos
  UIDs localmente, pero al subirla a GitHub se exporta solo el noreply (ver paso 4
  con `--export-filter`).
- **Limpia del todo (borrar el UID personal):** deja la clave solo con el noreply.
  Primero marca el noreply como primario:

  ```powershell
  & "C:\Program Files\GnuPG\bin\gpg.exe" --quick-set-primary-uid <fingerprint> "<name> <your-noreply>"
  ```

  Luego borra el UID personal con el editor interactivo (el borrado por script no
  funciona bien en esta versión):

  ```powershell
  & "C:\Program Files\GnuPG\bin\gpg.exe" --edit-key <fingerprint>
  ```

  En el prompt `gpg>`, mirando la lista de UIDs para confirmar el número del
  personal (p. ej. `(2)`):

  ```
  uid 2
  deluid
  y
  save
  ```

## 3. Configurar git para firmar

```powershell
git config --global user.email "<your-noreply>"
git config --global user.signingkey <fingerprint>
git config --global commit.gpgsign true
git config --global tag.gpgsign true
git config --global gpg.program "C:\Program Files\GnuPG\bin\gpg.exe"
```

## 4. Subir la clave pública a GitHub

Copia la clave pública al portapapeles. Si la clave ya quedó solo con el noreply
(Caso B limpio), basta exportarla:

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --armor --export <fingerprint> | Set-Clipboard
```

Si la clave aún tiene tu email personal y prefieres el filtro no destructivo
(estilo Parrot), exporta solo el UID noreply:

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --armor --export --export-filter "keep-uid=mbox=<your-noreply>" <fingerprint> | Set-Clipboard
```

En GitHub → Settings → SSH and GPG keys:

1. Si ya existe una versión vieja de esta clave (mismo Key ID), **bórrala**
   primero: GitHub rechaza subir una clave con fingerprint duplicado.
2. **New GPG key** → clic en el campo → **Ctrl+V** → **Add GPG key**.

> El comando con `Set-Clipboard` es el que copia la clave (no muestra nada en
> pantalla). Verifícalo con `Get-Clipboard`: debe empezar con
> `-----BEGIN PGP PUBLIC KEY BLOCK-----`.

## 5. Verificar

Haz un commit y comprueba la firma local (`G` = firma válida):

```powershell
git log -1 --format='%G? %GK %s'
```

En GitHub, el commit debe aparecer como **"Verified"**. Los commits creados antes
de tener la clave bien configurada no cambian retroactivamente si no estaban
firmados.

## El caché de la passphrase (gpg-agent.conf)

Archivo: `%APPDATA%\gnupg\gpg-agent.conf`

```ini
default-cache-ttl 600
max-cache-ttl 7200
pinentry-program C:/Program Files/Gpg4win/bin/pinentry.exe
```

- `default-cache-ttl` (600 s, 10 min): ventana deslizante desde el **último
  uso**; cada commit dentro de la ventana reinicia el contador.
- `max-cache-ttl` (7200 s, 2 h): tope absoluto desde que la introdujiste.
- `pinentry-program`: el pinentry gráfico de Gpg4win, que abre el diálogo con
  el foco en el campo de la passphrase.

Te la vuelve a pedir cuando pase lo primero de los dos: 10 min sin firmar, o
dos horas desde que la escribiste. Tras editar el archivo, recarga el agente:

```powershell
gpg-connect-agent reloadagent /bye
```

## Backup (obligatorio)

Guarda la clave privada (va cifrada con tu passphrase) en tu carpeta de claves
(`<keys-folder>`), nunca en el repo:

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --armor --export-secret-keys <fingerprint> > "<keys-folder>\gpg-private.asc"
```

Guarda también el certificado de revocación (sirve para invalidar la clave si te
la roban) y la passphrase por separado.

## Troubleshooting

- **GitHub dice "Unverified - the email in this signature doesn't match the
  committer email":** tus commits usan el `<your-noreply>` pero la clave no tiene
  un UID con ese email. Añádelo (Caso B, paso 2), re-sube la clave (paso 4) y
  listo.
- **"gpg failed to sign the data":** el agente no arrancó o `gpg.program` apunta
  mal. Verifica `git config --global gpg.program` y prueba
  `echo test | & "C:\Program Files\GnuPG\bin\gpg.exe" --clearsign`.
- **Sigue pidiendo la passphrase en cada commit:** recarga el agente
  (`gpg-connect-agent reloadagent /bye`) y revisa que `ignore-cache-for-signing`
  no esté activo.
- **"No public key" al listar la clave:** estás usando el `gpg` del PATH
  (Gpg4win), que no ve tus claves. Usa la ruta completa del standalone.
