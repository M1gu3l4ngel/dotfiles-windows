// Claude Code status line: model, context used and folder.
//
// Context is shown in tokens, not only as a percentage, because the measured target is a median
// context under 120k, and with 1M windows the percentage hides that threshold. Green up to 120k,
// yellow up to 300k, red above: past that point, close the goal and start a new session.

let input = "";
for await (const chunk of process.stdin) input += chunk;

let data = {};
try {
	data = JSON.parse(input);
} catch {
	// Without data, an empty bar is better than a broken one.
}

const model = data.model?.display_name ?? "?";
const folder = String(data.workspace?.current_dir ?? data.cwd ?? "").split(/[\\/]/).at(-1) ?? "";
const usage = data.context_window?.current_usage;
const tokens = usage
	? (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0)
	: 0;
const pct = Math.round(data.context_window?.used_percentage ?? 0);

const color = tokens < 120_000 ? "\u001B[32m" : tokens < 300_000 ? "\u001B[33m" : "\u001B[31m";
const reset = "\u001B[0m";
const context = usage ? `${color}${Math.round(tokens / 1000)}k (${pct}%)${reset}` : "no data yet";

process.stdout.write(`[${model}] context ${context} · ${folder}`);
