# Convenciones de repo

Todo repo mío (personal, de una organización propia o de un empleador) tiene:

- En GitHub: descripción en inglés de una frase, web si la hay, de 6 a 10 topics y
  `main` protegido contra borrado y push forzado (ruleset).
- Licencia y documentos según `~/.claude/skills/new-repo/docs-standard.md`, todos en todo
  repo, privado o público: README, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY,
  LICENSE (propietaria si no se licencia) y las plantillas de PR e issues. Secciones en su
  orden, desde sus plantillas, y `check-docs.mjs` (o el check de la organización) en el CI.
- Cabecera del README con la receta del skill `new-repo` (logo claro y oscuro en
  `<picture>`, descripción centrada, fila de enlaces, badges), igual que la de
  los otros repos del mismo dueño: se compara con una de ellas, no de memoria.
- `.editorconfig`, `.prettierrc.json` y `.gitattributes` propios.
- `.vscode/tasks.json` con el typecheck en vivo y el lint del repo hacia el panel de Problemas:
  los errores de todo el proyecto se ven sin abrir cada archivo.
- `CLAUDE.md` del repo: qué es, stack, comandos, convenciones y enlace a sus docs.
- CI mínimo: lint, formato, tests y el check de docs.
- Registro en el catálogo del cerebro, si su organización tiene uno.
- La versión de Node (o del runtime) en un solo sitio, `engines.node` de `package.json`,
  que leen el CI (`node-version-file: package.json`), el despliegue, pnpm y fnm. Exacta
  en lo que se despliega; mínimo (`>=24`) en lo que instalan otros, con su CI probando
  el mínimo y el LTS. Nunca escrita también en el YAML del CI ni en un segundo archivo.

Al crear un repo, usa el skill `new-repo`, que tiene el detalle. En un repo que
ya existe y al que le falta algo de esta lista, avísalo como hallazgo y ofrece
completarlo con el mismo skill. Lo específico de una empresa (organización, web,
nombres de repos) vive en su cerebro, no aquí.
