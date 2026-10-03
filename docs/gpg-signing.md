**English** | [Español](gpg-signing.es.md)

# Commit signing with GPG (Windows)

Sign every commit and tag (integrity + "Verified" badge on GitHub) without
re-entering the passphrase on each commit, thanks to the `gpg-agent` cache.

Signing is not disabled: the passphrase is delegated to the agent and cached for
a short window. Everything runs from a regular PowerShell window (not the VS Code
integrated terminal, which sometimes does not focus the pinentry).

## Two Windows details that cause confusion

**1. There are two GnuPG installs.** The standalone one
(`C:\Program Files\GnuPG\bin\gpg.exe`, the one git uses) and the Gpg4win one
(`C:\Program Files\Gpg4win\...`, used only for its graphical pinentry). The bare
`gpg` on the PATH is usually the Gpg4win one and **may not see your keys**. To work
on the key, **always use the full path** of the standalone one:

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --list-secret-keys --keyid-format long
```

**2. Key ID and fingerprint are the same key.** The *fingerprint* is 40
characters; the *Key ID* is the **last 16** of that fingerprint. GitHub and gpg
sometimes show one or the other. They are not two different keys.

## 1. GitHub noreply email

Every commit publishes the author's email. In GitHub → Settings → Emails:

1. Check "Keep my email addresses private".
2. Copy your `<id>+<user>@users.noreply.github.com` address. In this guide it is
   `<your-noreply>`.

The commit **and** the GPG key UID must use that `<your-noreply>` for GitHub to
show "Verified". In the commands, `<name>` is the name you want on the key and
`<fingerprint>` is your key's fingerprint.

## 2. The GPG key

### Case A: new key (recommended, as in Parrot)

Create it directly with the noreply address, so it never carries your personal email:

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --quick-generate-key "<name> <your-noreply>" default default 2y
```

Store the passphrase in your safe place (if you forget it, it cannot be recovered).

### Case B: you already have a key with your personal email

Add the noreply UID (it will ask for the passphrase through pinentry):

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --quick-add-uid <fingerprint> "<name> <your-noreply>"
```

To keep your personal email **out of the public key**, you have two options:

- **Non-destructive (filter on export, Parrot style):** the key keeps both UIDs
  locally, but only the noreply one is exported when uploading it to GitHub (see
  step 4 with `--export-filter`).
- **Fully clean (delete the personal UID):** leaves the key with only the noreply
  UID. First mark the noreply UID as primary:

  ```powershell
  & "C:\Program Files\GnuPG\bin\gpg.exe" --quick-set-primary-uid <fingerprint> "<name> <your-noreply>"
  ```

  Then delete the personal UID with the interactive editor (scripted deletion does
  not work well in this version):

  ```powershell
  & "C:\Program Files\GnuPG\bin\gpg.exe" --edit-key <fingerprint>
  ```

  At the `gpg>` prompt, checking the UID list to confirm the number of the
  personal one (for example `(2)`):

  ```
  uid 2
  deluid
  y
  save
  ```

## 3. Configure git to sign

```powershell
git config --global user.email "<your-noreply>"
git config --global user.signingkey <fingerprint>
git config --global commit.gpgsign true
git config --global tag.gpgsign true
git config --global gpg.program "C:\Program Files\GnuPG\bin\gpg.exe"
```

## 4. Upload the public key to GitHub

Copy the public key to the clipboard. If the key already has only the noreply UID
(clean Case B), exporting it is enough:

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --armor --export <fingerprint> | Set-Clipboard
```

If the key still has your personal email and you prefer the non-destructive filter
(Parrot style), export only the noreply UID:

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --armor --export --export-filter "keep-uid=mbox=<your-noreply>" <fingerprint> | Set-Clipboard
```

In GitHub → Settings → SSH and GPG keys:

1. If an old version of this key already exists (same Key ID), **delete it**
   first: GitHub rejects uploading a key with a duplicate fingerprint.
2. **New GPG key** → click the field → **Ctrl+V** → **Add GPG key**.

> The `Set-Clipboard` command is what copies the key (it prints nothing on
> screen). Check it with `Get-Clipboard`: it must start with
> `-----BEGIN PGP PUBLIC KEY BLOCK-----`.

## 5. Verify

Make a commit and check the local signature (`G` = valid signature):

```powershell
git log -1 --format='%G? %GK %s'
```

On GitHub, the commit must show as **"Verified"**. Commits created before the key
was set up correctly do not change retroactively if they were not signed.

## The passphrase cache (gpg-agent.conf)

File: `%APPDATA%\gnupg\gpg-agent.conf`

```ini
default-cache-ttl 600
max-cache-ttl 7200
pinentry-program C:/Program Files/Gpg4win/bin/pinentry.exe
```

- `default-cache-ttl` (600 s, 10 min): sliding window from the **last use**;
  every commit inside the window restarts the counter.
- `max-cache-ttl` (7200 s, 2 h): absolute limit since you entered it.
- `pinentry-program`: the Gpg4win graphical pinentry, which opens the dialog with
  the focus on the passphrase field.

It asks again when the first of the two happens: 10 min without signing, or
two hours since you typed it. After editing the file, reload the agent:

```powershell
gpg-connect-agent reloadagent /bye
```

## Backup (required)

Save the private key (it is encrypted with your passphrase) in your keys folder
(`<keys-folder>`), never in the repo:

```powershell
& "C:\Program Files\GnuPG\bin\gpg.exe" --armor --export-secret-keys <fingerprint> > "<keys-folder>\gpg-private.asc"
```

Also store the revocation certificate (it invalidates the key if it is stolen)
and the passphrase separately.

## Troubleshooting

- **GitHub says "Unverified - the email in this signature doesn't match the
  committer email":** your commits use `<your-noreply>` but the key has no UID
  with that email. Add it (Case B, step 2), re-upload the key (step 4) and you
  are done.
- **"gpg failed to sign the data":** the agent did not start or `gpg.program`
  points to the wrong place. Check `git config --global gpg.program` and try
  `echo test | & "C:\Program Files\GnuPG\bin\gpg.exe" --clearsign`.
- **It keeps asking for the passphrase on every commit:** reload the agent
  (`gpg-connect-agent reloadagent /bye`) and check that `ignore-cache-for-signing`
  is not enabled.
- **"No public key" when listing the key:** you are using the `gpg` on the PATH
  (Gpg4win), which does not see your keys. Use the full path of the standalone one.
