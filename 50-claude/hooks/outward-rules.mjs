// Rules for what leaves the machine or cannot be undone: secrets read through the shell, merges,
// deletions on GitHub, and changes to Railway or a linked database. The read tool already asks
// before opening a `.env`, but `cat .env` in a shell does not go through it; and an agent of the
// office must never merge a pull request or delete a repository, an issue or a release.

/** @typedef {import("./command-rules.mjs").CommandRule} CommandRule */

// A file whose name starts with `.env`, other than the templates: `.env`, `.env.local`,
// `.env.production`, but not `.env.example` nor the files inside the `.env.example/` folder.
const ENV_FILE = String.raw`(?<=^|[\s"'/\\])\.env(?!\.example)(?:\.[\w-]+)?(?=$|[\s"'/;&|)])`;
const FILE_READERS = String.raw`\b(?:cat|type|more|less|head|tail|bat|nl|strings|xxd|od|grep|rg|sed|awk|cut|sort|Get-Content|gc|Select-String|sls|code|notepad)\b`;

/** @type {CommandRule[]} */
export const OUTWARD_RULES = [
	{
		// The path is often quoted, and the pattern sees quoted text masked: `applies` reads it raw.
		pattern: new RegExp(FILE_READERS, "i"),
		applies: (command) => new RegExp(`${FILE_READERS}[^;&|]*${ENV_FILE}`, "i").test(command),
		decision: "ask",
		reason:
			"reading a `.env` prints its secrets into the conversation: only if the user asked, and never echo a value.",
	},
	{
		pattern: /\bgh\s+pr\s+merge\b/,
		decision: "deny",
		reason:
			"merging a pull request is the Director's, or GitHub's auto-merge when its checks pass: never an agent.",
	},
	{
		pattern: /\bgh\s+repo\s+(?:delete|archive|rename)\b/,
		decision: "deny",
		reason: "deleting, archiving or renaming a repository is the Director's.",
	},
	{
		pattern: /\bgh\s+(?:issue|release|secret|variable|label|project)\s+delete\b/,
		decision: "deny",
		reason: "deleting on GitHub cannot be undone: an issue is closed, never deleted; the rest is the Director's.",
	},
	{
		pattern: /\bgh\s+api\b[^;&|]*(?:-X\s*|--method[\s=]+)(?:DELETE|PUT|PATCH)\b/i,
		decision: "ask",
		reason: "a write through `gh api` skips the guards of the `gh` commands: only if the user asked.",
	},
	{
		// `gh api` sends a POST on its own when it carries a body (`--input`, `-f`, `-F`), with no
		// `-X`: a write to the settings of a repository or an organization is told by its path.
		pattern: /\bgh\s+api\b[^;&|]*\b(?:rulesets|protection|hooks|collaborators|keys|environments|actions\/(?:permissions|secrets|variables)|secret-scanning|code-scanning|dependabot)\b/i,
		applies: (command) =>
			/(?:\s(?:-X|--method)[\s=]*(?!GET\b)[A-Z]+|\s--input\b|\s-f\s|\s--(?:raw-)?field\b)/i.test(command),
		decision: "ask",
		reason: "it changes the settings of a repository or an organization: only if the user asked.",
	},
	{
		pattern: /\bgh\s+(?:secret|variable)\s+set\b|\bgh\s+repo\s+edit\b/,
		decision: "ask",
		reason: "secrets, variables and repository settings are the Director's: only if the user asked.",
	},
	{
		pattern: /\brailway\b[^;&|]*\b(?:up|down|delete|redeploy)\b/i,
		decision: "ask",
		reason: "it changes a Railway environment: the Director runs it, after reading `railway config plan`.",
	},
	{
		pattern: /\brailway\b[^;&|]*(?:\bvariables?\s+(?:set|delete)\b|\bconfig\s+apply\b|\s--set\b)/i,
		decision: "ask",
		reason: "it changes a Railway environment: the Director runs it, after reading `railway config plan`.",
	},
	{
		pattern: /\bsupabase\b[^;&|]*(?:--linked|\bdb\s+(?:push|reset)\b)/i,
		decision: "ask",
		reason: "it writes to a linked Supabase database: migrations reach staging and production by deploying.",
	},
	{
		pattern: /\b(?:curl|wget|iwr|Invoke-WebRequest|irm|Invoke-RestMethod)\b[^;&]*\|\s*(?:sh|bash|zsh|iex|Invoke-Expression|node|python3?)\b/i,
		decision: "deny",
		reason: "running a script straight from the internet: download it, read it, and run it only if the user agrees.",
	},
];
