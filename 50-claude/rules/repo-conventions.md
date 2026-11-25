# Convenciones de repo

Todo repo mío (personal, de una organización propia o de un empleador) tiene:

- En GitHub: descripción en inglés de una frase, web si la hay, de 6 a 10 topics y
  `main` protegido contra borrado y push forzado (ruleset).
- Licencia elegida a propósito: MIT o Apache-2.0 si es público; ninguna, y
  privado, si el código es de un empleador o cliente.
- README y CHANGELOG en pareja, CONTRIBUTING si es compartido, y diagrama Mermaid
  en el README si hay más de dos piezas que se relacionan.
- `.editorconfig`, `.prettierrc.json` y `.gitattributes` propios.
- `CLAUDE.md` del repo: qué es, stack, comandos, convenciones y enlace a sus docs.
- CI mínimo: lint, formato, tests y el check de docs bilingües.
- Registro en el catálogo del cerebro, si su organización tiene uno.
- La versión de Node (o del runtime) en un solo sitio, `engines.node` de `package.json`,
  que leen el CI (`node-version-file: package.json`), el despliegue, pnpm y fnm. Exacta
  en lo que se despliega; mínimo (`>=24`) en lo que instalan otros, con su CI probando
  el mínimo y el LTS. Nunca escrita también en el YAML del CI ni en un segundo archivo.

Al crear un repo, usa el skill `new-repo`, que tiene el detalle. En un repo que
ya existe y al que le falta algo de esta lista, avísalo como hallazgo y ofrece
completarlo con el mismo skill. Lo específico de una empresa (organización, web,
nombres de repos) vive en su cerebro, no aquí.
