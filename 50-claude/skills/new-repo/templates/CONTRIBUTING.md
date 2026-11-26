# Contributing

Thank you for helping. <What this repository is, and what is not edited here.>

## Before you start

- **A bug or a small fix:** open a pull request directly.
- **<A new piece, a change to the structure>:** open an issue first and describe the problem it
  solves. <Why it is agreed before it is written.>
- **A vulnerability:** never in a public issue; follow [`SECURITY.md`](SECURITY.md).
- **Conduct:** everyone who takes part follows the [code of conduct](CODE_OF_CONDUCT.md).

## Set up

It needs <requirements>; the [README](README.md#getting-started) explains how to install them.
From the repository root, as a normal user:

```bash
<install command>
<check command>
```

The checks are the same ones CI runs.

## What a change has to keep

- **Nothing personal or from a client:** no username, email, hostname, key or token.
- **Documents in English only:** no translated copies and no language selector. <The check>
  verifies it, links and anchors included.
- **English** in code comments, script output and test names.
- **Tests:** new logic comes with its test.
- **<Invariant of this repository>:** <one line>.

## Commits and pull requests

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`
  in English and in the imperative, up to 72 characters, with a body that lists each concrete
  change.
- A pull request does one thing and fills in its template. A change people notice adds its line
  under "Unreleased" in [`CHANGELOG.md`](CHANGELOG.md) and under "Sin publicar" in its Spanish
  pair.
- CI has to pass: <what it runs>.

## License

By contributing, you agree that your contribution is licensed under [<License>](LICENSE), like
the rest of the repository.
