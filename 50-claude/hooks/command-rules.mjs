// @ts-check
// Reglas universales de comandos, compartidas por el hook global (dotfiles) y el de cada proyecto.
//
// FUENTE ÚNICA: este archivo vive en `dotfiles/50-claude/hooks/` y cada proyecto lleva una copia
// idéntica en `.claude/hooks/`, porque su hook viaja a proyectos extraídos donde los dotfiles no
// existen. Se edita aquí y se copia tal cual; el check `hook-rules-copy` de cada proyecto falla si
// las dos copias difieren. Lo propio de un proyecto (su gestor, sus puertos, su `main`) va en su
// hook, nunca aquí.
//
// Va en un hook y no en `permissions.deny` porque un patrón de permisos casa por prefijo: no ve un
// `git commit` detrás de un `cd x &&`, ni dentro de PowerShell, ni un `/MIR` en mitad de un
// `robocopy`. `ask` no bloquea: le pasa la decisión al usuario.

import path from "node:path";

/**
 * @typedef {object} CommandRule
 * @property {RegExp} pattern Se prueba contra el comando con el contenido de las comillas tapado.
 * @property {(command: string, cwd: string) => boolean} [applies] Condición extra, sobre el
 *   comando original y la carpeta de la sesión.
 * @property {"deny" | "ask"} decision
 * @property {string} reason
 */

// Temporales y cachés regenerables: borrarlos no pide confirmación.
const TEMP_TARGET =
	/\$\{?(env:)?(TEMP|TMP|TMPDIR)\b|(^|[\s"'\\/])(tmp|temp)[\\/]|scratchpad|[\\/]dev[\\/]scratch[\\/]|node_modules|[\\/]\.next\b|[\\/]coverage\b/i;

// Un `git push`, también con opciones globales delante (`git -C ../otro push`): sin ellas en el
// patrón, ese comando se saltaba todas las reglas de subida.
const GIT_PUSH = String.raw`\bgit(?:\s+-[cC]\s+\S+)*\s+push\b`;

// `add` y `commit` no están: los hace Claude al cerrar cada cambio verificado. Lo que reescribe
// historia o árbol es del usuario.
const GIT_WRITE =
	/\bgit\s+(?:-[cC]\s+\S+\s+)*(pull|reset|rebase|merge|checkout|switch|restore|clean|stash|cherry-pick|revert|tag|mv|rm|apply|am)\b/;

// Las formas de solo lectura de esos subcomandos (listar y verificar etiquetas, ver el stash). Se
// quitan del comando y se vuelve a buscar escritura en lo que queda: `git tag -l; git reset` bloquea.
const GIT_READ_ONLY =
	/\bgit\s+(?:-[cC]\s+\S+\s+)*(?:tag(?:\s+(?:-l|--list|-v|--verify|-n\d*|--contains|--points-at|--sort=\S+|--format=\S+)\b[^;&|]*)?\s*(?:$|[;&|])|stash\s+(?:list|show)\b)/g;

// La etiqueta firmada de una versión cierra un release, como el commit firmado cierra un cambio:
// la crea Claude, y se quita del comando como la lectura. Borrarla, moverla o crearla sin firma, no.
const GIT_TAG = String.raw`\bgit\s+(?:-[cC]\s+\S+\s+)*tag\b`;
const GIT_TAG_FORBIDDEN = new RegExp(
	String.raw`${GIT_TAG}[^;&|]*\s(?:-d|--delete|-f|--force|--no-sign)\b`,
);
const GIT_SIGNED_TAG = new RegExp(String.raw`${GIT_TAG}(?=[^;&|]*\s(?:-s|--sign)\b)[^;&|]*`, "g");

/**
 * Tapa el contenido de las comillas con `_`, conservando la longitud: un `git commit` dentro de
 * un patrón de búsqueda o de un mensaje no es un comando.
 *
 * @param {string} command
 */
export function stripQuotedText(command) {
	return command.replaceAll(
		/'[^']*'|"(?:[^"\\]|\\.)*"/g,
		(m) => `${m[0]}${"_".repeat(m.length - 2)}${m.at(-1)}`,
	);
}

/**
 * La carpeta donde corre el git del comando: la de un `cd`, `Set-Location` o `git -C` delante,
 * o la de la sesión.
 *
 * @param {string} command
 * @param {string} cwd
 */
export function resolveCommandDir(command, cwd) {
	const match = /(?:\bgit\s+-C\s+|\b(?:cd|Set-Location)\s+)("[^"]+"|'[^']+'|[^\s;&|]+)/i.exec(
		command,
	);
	if (!match?.[1]) return cwd;
	return path.resolve(cwd, match[1].replaceAll(/^["']|["']$/g, ""));
}

/**
 * Las reglas universales. Quien las usa decide en qué repos se protege `main`, porque eso depende
 * de su flujo de ramas.
 *
 * @param {{ isMainProtected: (dir: string) => boolean }} options
 * @returns {CommandRule[]}
 */
export function buildCommandRules({ isMainProtected }) {
	return [
		{
			pattern: /\bgit\b[^;&|]*(--no-gpg-sign|commit\.gpgsign=false)/,
			decision: "deny",
			reason:
				"commit sin firma: van siempre firmados; si la clave caducó, pide al usuario que la desbloquee.",
		},
		{
			pattern: /\bgit\s+add\b[^;&|]*\s(-A|--all|\.)(?=\s|$|[;&|])/,
			decision: "deny",
			reason: "git add -A o `.`: se añaden por ruta solo los archivos del cambio.",
		},
		{
			pattern: new RegExp(String.raw`${GIT_PUSH}[^;&|]*(\s-f\b|--force|\s\+)`),
			decision: "deny",
			reason: "push forzado: nunca, en ningún repo.",
		},
		{
			pattern: new RegExp(String.raw`${GIT_PUSH}[^;&|]*\b(main|master)\b`),
			applies: (command, cwd) => isMainProtected(resolveCommandDir(command, cwd)),
			decision: "deny",
			reason: "push a main: nunca; main lo promueve el usuario.",
		},
		{
			pattern: new RegExp(GIT_PUSH),
			decision: "ask",
			reason: "push: solo si el usuario lo pidió; cada push gasta minutos de Actions.",
		},
		{
			pattern: GIT_TAG_FORBIDDEN,
			decision: "deny",
			reason:
				"borrar o mover una etiqueta reescribe una versión ya publicada (si está mal, se publica " +
				"otra), y sin firma no se crea: `git tag -s <versión> -m <versión>`.",
		},
		{
			pattern: GIT_WRITE,
			applies: (command) =>
				GIT_WRITE.test(
					stripQuotedText(command).replaceAll(GIT_READ_ONLY, " ").replaceAll(GIT_SIGNED_TAG, " "),
				),
			decision: "deny",
			reason:
				"git de escritura: lo que reescribe historia o árbol lo hace el usuario. Sugiere el " +
				"comando; de lectura valen status, log, diff y show.",
		},
		{
			pattern: /\brobocopy\b/i,
			applies: (command) => /\/MIR\b/i.test(command) && !/\/XJ\b/i.test(command),
			decision: "deny",
			reason:
				"robocopy /MIR sin /XJ atraviesa las junctions y vacía la carpeta real del otro lado. " +
				"Añade /XJ.",
		},
		{
			pattern: /\bprettier\b[^;&|]*--write\b/,
			applies: (command) => /--write[^;&|]*(\*|\$\(|`)|xargs[^;&|]*prettier/.test(command),
			decision: "deny",
			reason:
				"prettier --write con un glob o una lista calculada reformatea archivos ajenos al " +
				"cambio. Escribe en el comando las rutas de los archivos editados.",
		},
		{
			pattern: /\brm\s+-[a-zA-Z]*[rR]|\bRemove-Item\b[^;&|]*-Recurse|\brmdir\s+\/s\b|\brd\s+\/s\b/i,
			applies: (command) => !TEMP_TARGET.test(command),
			decision: "ask",
			reason:
				"borrado recursivo fuera de un temporal: el trabajo se confirma siempre antes de " +
				"borrar, y `Remove-Item -Force` no usa papelera y atraviesa junctions.",
		},
	];
}

/**
 * La primera regla que casa con el comando, o `undefined`.
 *
 * @param {readonly CommandRule[]} rules
 * @param {string} command
 * @param {string} cwd
 */
export function findCommandRule(rules, command, cwd) {
	const masked = stripQuotedText(command);
	return rules.find((rule) => rule.pattern.test(masked) && (rule.applies?.(command, cwd) ?? true));
}

/**
 * Lee la llamada de Claude Code por stdin y, si una regla casa, contesta su decisión.
 *
 * @param {readonly CommandRule[]} rules
 * @param {string} label Quién bloquea, para que el motivo diga qué hook editar.
 */
export async function runCommandHook(rules, label) {
	let input = "";
	for await (const chunk of process.stdin) input += chunk;
	let parsed;
	try {
		parsed = JSON.parse(input);
	} catch {
		return;
	}
	const cwd = typeof parsed.cwd === "string" ? parsed.cwd : process.cwd();
	const rule = findCommandRule(rules, String(parsed.tool_input?.command ?? ""), cwd);
	if (!rule) return;
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: rule.decision,
				permissionDecisionReason: `${label}: ${rule.reason}`,
			},
		}),
	);
}
