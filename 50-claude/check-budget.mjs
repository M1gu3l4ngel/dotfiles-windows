#!/usr/bin/env node
// Line budget for the global Claude Code layer: keeps CLAUDE.md and the layer's files from
// growing unchecked. Exits 0 if every file fits and 1 if one exceeds its budget, so it can run in
// tools/check.ps1 or a pre-commit hook. Runs the same on Windows and Linux.
//
// Usage: node 50-claude/check-budget.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

// CLAUDE.md is the one that really costs context in every session; the rest are sanity caps so
// the layer does not bloat.
const BUDGETS = [
  { file: 'CLAUDE.md', maxLines: 60 },
  { file: 'statusline.mjs', maxLines: 120 },
  { file: 'hooks/block-shell-edits.mjs', maxLines: 160 },
  { file: 'hooks/block-forbidden-commands.mjs', maxLines: 100 },
  // The git patterns share one prefix and name their option lists, so each one stays readable;
  // the push to staging reads its refspecs, since a pattern cannot tell `:staging` from `HEAD:staging`,
  // and so does the promotion of main, which must be exactly `origin/staging:main` and alone;
  // git writes are judged by what they discard, one commented line per kind; and a command is split
  // into steps, each judged in the folder its `cd` leaves it in.
  { file: 'hooks/command-rules.mjs', maxLines: 340 },
  { file: 'hooks/reply-in-spanish.mjs', maxLines: 200 },
  // The rule loads in every session, like CLAUDE.md: keep it short. The skill loads only when used.
  { file: 'rules/repo-conventions.md', maxLines: 30 },
  { file: 'skills/new-repo/SKILL.md', maxLines: 150 },
  { file: 'skills/new-repo/docs-standard.md', maxLines: 170 },
];

let failed = false;
for (const { file, maxLines } of BUDGETS) {
  let lines;
  try {
    lines = readFileSync(join(HERE, file), 'utf8').split(/\r?\n/).length;
  } catch {
    // A watched file that is missing (renamed, moved) would leave its budget silently unwatched.
    failed = true;
    console.log(`  XX  ${file} — not found: update BUDGETS`);
    continue;
  }
  const ok = lines <= maxLines;
  if (!ok) failed = true;
  console.log(`  ${ok ? 'OK ' : 'XX '} ${file} — ${lines}/${maxLines} lines`);
}

console.log(failed
  ? '\nBudget EXCEEDED: trim before committing (the global layer is only universal behavior).'
  : '\nBudget OK.');
process.exit(failed ? 1 : 0);
