# Convenciones de repo

Todo repo mío (personal, de una organización propia o de un empleador) tiene:

- En GitHub: descripción en inglés de una frase, web si la hay y de 6 a 10 topics.
- Licencia elegida a propósito: MIT o Apache-2.0 si es público; ninguna, y
  privado, si el código es de un empleador o cliente.
- README y CHANGELOG en pareja, CONTRIBUTING si es compartido, y diagrama Mermaid
  en el README si hay más de dos piezas que se relacionan.
- `.editorconfig`, `.prettierrc.json` y `.gitattributes` propios.
- `CLAUDE.md` del repo: qué es, stack, comandos, convenciones y enlace a sus docs.
- CI mínimo: lint, formato, tests y el check de docs bilingües.
- Registro en el catálogo del cerebro, si su organización tiene uno.

Al crear un repo, usa el skill `new-repo`, que tiene el detalle. En un repo que
ya existe y al que le falta algo de esta lista, avísalo como hallazgo y ofrece
completarlo con el mismo skill. Lo específico de una empresa (organización, web,
nombres de repos) vive en su cerebro, no aquí.
