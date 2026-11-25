# Backlog — dotfiles-windows

Lo diferido que no bloquea nada. Cada bloque lleva su porqué y dónde se toca.

### El otro repo con panel propio pasa al global

**Plataforma:** Claude Code.

Ese repo genera su panel con `pnpm generate:panel` y una copia de la página. Dos
versiones que se desalinean: la global (`50-claude/panel/`) es la fuente. Se queda
solo su vista Estilo, como extensión, porque se genera del código de su app.

- [ ] Usar `~/.claude/panel/` para la vista Tareas y conservar Estilo como extensión

### Parrot sigue esta estructura

**Plataforma:** Repositorio.

dotfiles-parrot comparte el prompt y la capa de Claude; este repo pasa a ser la
fuente de esa capa.

- [ ] Numerar las carpetas de Parrot como aquí
- [ ] Tomar la capa de Claude de este repo en vez de mantener una copia

### Prompt de WSL

**Plataforma:** Shell.

Ubuntu 26.04 trae el `.bashrc` de serie: nadie le configura el prompt
(`.claude/rules/environment.md`).

- [ ] Enlazar en WSL un `.bashrc` que cargue oh-my-posh con el tema del repo

### Check del panel en el CI de otros repos

**Plataforma:** Claude Code.

`50-claude/panel/check.mjs` valida el formato sin generar nada; en el CI de cada repo
con panel evitaría tareas mal escritas.

- [ ] Documentar cómo llamarlo desde el CI de un repo que use el panel

### Ajustes de Windows por script

**Plataforma:** Instalación.

Developer Mode y ajustes del registro se hacen a mano en una PC nueva
(`bootstrap.ps1`, paso de pasos manuales).

- [ ] Script idempotente de ajustes de Windows, con `-DryRun`

### Volver a proteger C: con reglas concretas

**Plataforma:** Claude Code.

Se quitó la regla `ask` de Edit sobre todo el perfil porque pedía aprobación en
cada edición, incluso en modo automático. Faltan reglas `ask` estrechas para lo
que sí importa en `C:`.

- [ ] Reglas `ask` concretas en `~/.claude/settings.json` y, si valen en cualquier PC, en `50-claude/settings.template.json`

### Plugins LSP en la plantilla

**Plataforma:** Claude Code, Instalación.

Los plugins de TypeScript y Rust necesitan sus binarios; sin ellos fallan al
arrancar.

- [ ] `enabledPlugins` en `50-claude/settings.template.json` y sus binarios en `bootstrap.ps1`
