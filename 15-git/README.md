**English** | [Español](README.es.md)

# 15-git

The git configuration: identity, signed commits and tags, and which GitHub account each
remote uses, so Git Credential Manager never asks which one to pick.

| Path | Linked to | What it is |
|---|---|---|
| `gitconfig` | `~/.gitconfig` | Name, `noreply` email, signed commits and tags, and the account rules that can be public |
| `gitconfig-personal` | `~/.gitconfig-personal` | The personal GitHub account, for its repositories and organizations |

The account follows the owner of the remote (`includeIf "hasconfig:remote.*.url:…"`), not the
folder: every repository lives in the same `D:\Dev\projects`.

## What stays on the machine

This repository is public, so client and work organizations and their accounts never enter it,
and neither does the signing key, which is specific to each machine. They live in
`~/.gitconfig.local`, which `gitconfig` includes last and git skips if it is missing:

```ini
[user]
	signingkey = <fingerprint>
[includeIf "hasconfig:remote.*.url:https://github.com/example-org/**"]
	path = ~/.gitconfig-example
```

## Check

```powershell
git -C <repository> config --get credential.https://github.com.username
```
