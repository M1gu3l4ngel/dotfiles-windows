[English](CONTRIBUTING.md) | **Español**

# Contribuir

Gracias por ayudar. <Qué es este repositorio, y qué no se edita aquí.>

## Antes de empezar

- **Un error o un arreglo pequeño:** abre un pull request directamente.
- **<Una pieza nueva, un cambio de estructura>:** abre antes un issue y describe el problema que
  resuelve. <Por qué se acuerda antes de escribirse.>
- **Una vulnerabilidad:** nunca en un issue público; sigue [`SECURITY.es.md`](SECURITY.es.md).
- **Conducta:** todo el que participa sigue el [código de conducta](CODE_OF_CONDUCT.es.md).

## Preparar

Necesita <requisitos>; el [README](README.es.md#cómo-empezar) explica cómo instalarlos. Desde la
raíz del repositorio, como usuario normal:

```bash
<install command>
<check command>
```

Las comprobaciones son las mismas que corre el CI.

## Qué tiene que mantener un cambio

- **Nada personal ni de un cliente:** ni usuario, ni email, ni hostname, ni clave, ni token.
- **Documentos en pareja:** `X.md` en inglés y `X.es.md` en español, con las mismas secciones,
  bloques de código idénticos y el selector de idioma en la línea 1. <El check> lo comprueba.
- **Inglés** en los comentarios del código, la salida de los scripts y los nombres de los tests.
- **Tests:** la lógica nueva llega con su test.
- **<Invariante de este repositorio>:** <una línea>.

## Commits y pull requests

- Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`
  en inglés y en imperativo, de hasta 72 caracteres, con un cuerpo que lista cada cambio
  concreto.
- Un pull request hace una sola cosa y rellena su plantilla. Un cambio que se nota añade su línea
  en «Sin publicar» de [`CHANGELOG.es.md`](CHANGELOG.es.md) y en «Unreleased» de su pareja en
  inglés.
- El CI tiene que pasar: <qué corre>.

## Licencia

Al contribuir, aceptas que tu contribución se licencia bajo [<License>](LICENSE), como el resto
del repositorio.
