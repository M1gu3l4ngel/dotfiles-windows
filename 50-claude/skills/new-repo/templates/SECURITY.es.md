[English](SECURITY.md) | **Español**

# Seguridad

## Versiones con soporte

Solo <la última versión | el último commit de `main`> recibe arreglos. Cada versión está en
[`CHANGELOG.es.md`](CHANGELOG.es.md).

## Reportar una vulnerabilidad

No abras un issue público. Repórtala en privado de una de estas formas:

1. **En GitHub:** en este repositorio, abre **Security**, luego **Report a vulnerability**, y
   rellena el formulario.
2. **Por correo:** <solo con una dirección de la organización: escribe a `<support address>` con
   el asunto `Security: <repo>`. Sin ella, quita este punto.>

Incluye qué se ve afectado (<las piezas de este repositorio>), los pasos para reproducirlo y el
impacto que ves. Recibes una respuesta que confirma el reporte, y se te informa hasta que esté
arreglado. Cuando el arreglo se publica, el reporte se hace público con tu crédito, salvo que
prefieras lo contrario.

## Alcance

- **Dentro:** <lo que este repositorio ejecuta o publica>, y cualquier cosa en él que pueda
  filtrar un secreto o ejecutar código que el usuario no esperaba.
- **Fuera:** las vulnerabilidades de <herramientas de terceros>, que van a sus propios proyectos.
