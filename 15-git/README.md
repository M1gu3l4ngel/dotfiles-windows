# 15-git

The git configuration: identity, signed commits and tags, and which GitHub account each
remote uses, so Git Credential Manager never asks which one to pick.

| Path | Linked to | What it is |
|---|---|---|
| `gitconfig` | `~/.gitconfig` | Signed commits and tags, the default branch, and the account rules that can be public |
| `gitconfig-personal` | `~/.gitconfig-personal` | The personal GitHub account, for its repositories and organizations |

The account follows the owner of the remote (`includeIf "hasconfig:remote.*.url:…"`), not the
folder: every repository lives in the same `D:\Dev\projects`.

## What stays on the machine

This repository is public, so what belongs to a person or a machine does not enter it: the
identity (name and `noreply` email), the signing key, and any organization, your own, a client's
or a work one, with its account. They live in `~/.gitconfig.local`, which `gitconfig` includes
last and git skips if it is missing. Whoever forks the repository commits under their own name.

`bootstrap.ps1` writes the identity there when the machine has none, from `-GitName` and
`-GitEmail` (the owner's by default; a fork passes its own), and `install.ps1 -Check` reports it
if it is missing. The rest is written by hand: the signing key, an organization of yours pointing
to `~/.gitconfig-personal`, and a work one to its own account file:

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

## Check

```powershell
git -C <repository> config --get credential.https://github.com.username
```
