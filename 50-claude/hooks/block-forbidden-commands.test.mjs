// Tests for the global hook's rules: it blocks what is forbidden and lets through what Claude does.
// A safety regex that stops matching gives no warning: it shows only after something is deleted.

import assert from "node:assert/strict";
import { test } from "node:test";
import { findRule } from "./block-forbidden-commands.mjs";
import os from "node:os";
import path from "node:path";
import { buildCommandRules, findCommandRule, isMainPromotion, toNativePath } from "./command-rules.mjs";

/** @param {string} command */
const decide = (command) => findRule(command, process.cwd())?.decision ?? "allow";

test("creating a signed tag passes, in any folder", () => {
	assert.equal(decide('git tag -s v0.1.3 -m "0.1.3"'), "allow");
	assert.equal(decide("git -C ../other-repo tag --sign v1 -m v1"), "allow");
});

test("deleting or moving a tag is blocked", () => {
	assert.equal(decide("git tag -d v0.1.3"), "deny");
	assert.equal(decide("git tag --delete v0.1.3"), "deny");
	assert.equal(decide("git tag -s -f v0.1.3 -m x"), "deny");
});

test("an unsigned tag is blocked", () => {
	assert.equal(decide("git tag v0.1.3"), "deny");
	assert.equal(decide('git tag -a v0.1.3 -m "x"'), "deny");
	assert.equal(decide("git tag -s --no-sign v0.1.3 -m x"), "deny");
});

test("listing tags passes and does not hide a write after it", () => {
	assert.equal(decide("git tag -l"), "allow");
	assert.equal(decide("git tag --list 'v*'"), "allow");
	assert.equal(decide("git -C ../other-repo tag -v v0.1.3"), "allow");
	assert.equal(decide("git tag -l; git reset --hard"), "deny");
	assert.equal(decide('git tag -s v1 -m "v1"; git reset --hard'), "deny");
});

test("what loses work or rewrites what is published stays blocked", () => {
	assert.equal(decide("git reset --hard HEAD~1"), "deny");
	assert.equal(decide("git commit --no-gpg-sign -m x"), "deny");
	assert.equal(decide("git add -A"), "deny");
	assert.equal(decide("git push --force origin staging"), "deny");
});

test("an agent's branch work passes: switch, create, merge, rebase local commits, stash", () => {
	for (const command of [
		"git switch staging",
		"git switch -c qa/flaky-test",
		"git checkout main",
		"git checkout -b qa/flaky-test",
		"git branch qa/flaky-test",
		"git branch -d qa/flaky-test",
		"git worktree add ../core-qa staging",
		"git merge --ff-only qa/flaky-test",
		"git merge --no-ff qa/flaky-test",
		"git rebase origin/staging",
		"git cherry-pick abc1234",
		"git revert abc1234",
		"git stash",
		"git stash push -m wip",
		"git stash pop",
		"git stash list",
		"git restore --staged a.ts",
		"git clean -n",
	])
		assert.equal(decide(command), "allow", command);
});

test("pulls pass: fast-forward, rebase or merge keep every version", () => {
	assert.equal(decide("git pull --ff-only"), "allow");
	assert.equal(decide("git -C ~/dotfiles-windows pull --ff-only"), "allow");
	assert.equal(decide("git pull --rebase --autostash origin staging"), "allow");
	assert.equal(decide("git pull"), "allow");
	assert.equal(decide("git pull --ff-only; git reset --hard"), "deny");
	assert.equal(decide("git fetch origin"), "allow");
});

test("what discards uncommitted work, untracked files, a stash or unmerged commits is blocked", () => {
	for (const command of [
		"git checkout -- a.ts",
		"git checkout .",
		"git checkout -f main",
		"git switch -f main",
		"git switch --discard-changes main",
		"git restore a.ts",
		"git restore --staged --worktree a.ts",
		"git clean -fd",
		"git clean -xfd",
		"git stash drop",
		"git stash clear",
		"git branch -D qa/flaky-test",
		"git rebase -i HEAD~3",
		"git pull --force origin staging",
		"git switch staging && git reset --hard origin/staging",
	])
		assert.equal(decide(command), "deny", command);
});

test("applying a patch asks", () => {
	assert.equal(decide("git apply fix.patch"), "ask");
	assert.equal(decide("git am 0001-fix.patch"), "ask");
});

test("unstaging paths passes, moving HEAD asks and --hard stays blocked", () => {
	assert.equal(decide("git reset -- README.md docs/tasks.md"), "allow");
	assert.equal(decide("git reset -q HEAD -- a.mjs"), "allow");
	assert.equal(decide("git -C ../other reset -- a.mjs"), "allow");
	assert.equal(decide("git reset"), "ask");
	assert.equal(decide("git reset --soft HEAD~1"), "ask");
	assert.equal(decide("git reset --mixed HEAD~1"), "ask");
	assert.equal(decide("git reset HEAD~1 -- a.mjs"), "ask");
	assert.equal(decide("git reset --hard HEAD~1"), "deny");
	assert.equal(decide("git reset --merge"), "deny");
	assert.equal(decide("git reset --keep HEAD~1"), "deny");
	assert.equal(decide("git reset -- a.mjs; git reset --hard"), "deny");
	assert.equal(decide("git reset -- a.mjs; git clean -fd"), "deny");
});

test("git rm and git mv by path pass, recursive or forced asks", () => {
	assert.equal(decide("git rm -q scripts/a.ts scripts/a.test.ts"), "allow");
	assert.equal(decide("git rm --cached secrets.txt"), "allow");
	assert.equal(decide("git mv old-name.ts new-name.ts"), "allow");
	assert.equal(decide("git -C ../other rm a.mjs"), "allow");
	assert.equal(decide("git rm -r docs/old"), "ask");
	assert.equal(decide("git rm -rf docs/old"), "ask");
	assert.equal(decide("git rm -f a.mjs"), "ask");
	assert.equal(decide("git mv --force a.mjs b.mjs"), "ask");
	assert.equal(decide("git rm a.mjs; git reset --hard"), "deny");
	assert.equal(decide("git rm a.mjs; git checkout -- ."), "deny");
});

test("repeated calls give the same decision", () => {
	for (let i = 0; i < 3; i++) {
		assert.equal(decide("git stash drop"), "deny");
		assert.equal(decide("git reset --soft HEAD~1"), "ask");
	}
});

test("Linux paths get the same decisions", () => {
	assert.equal(decide("git -C ~/dotfiles-windows tag -l"), "allow");
	assert.equal(decide("git -C ~/Dev/projects/x push"), "ask");
	assert.equal(decide("rm -rf ~/Dev/projects/x"), "ask");
	assert.equal(decide("rm -rf /tmp/x"), "allow");
	assert.equal(decide("rm -rf ~/Dev/scratch/x"), "allow");
	assert.equal(decide("git -C ~/Dev/projects/x add -A"), "deny");
});

test("a command inside quotes is not a command", () => {
	assert.equal(decide('rg "git reset --hard" docs'), "allow");
});

test("pushing a tag asks, like any push", () => {
	assert.equal(decide("git push origin v0.1.3"), "ask");
});

test("only the push of the remote staging to main, alone, counts as a promotion", () => {
	assert.equal(isMainPromotion("git push origin origin/staging:main"), true);
	assert.equal(isMainPromotion("git push origin main"), false);
	assert.equal(isMainPromotion("git push origin staging:main"), false);
	assert.equal(isMainPromotion("git push -u origin origin/staging:main"), false);
	assert.equal(isMainPromotion("git push origin origin/staging:main && git push origin main"), false);
});

test("a main-only repo pushes to main like staging; a protected main stays denied", () => {
	const brain = path.resolve("..", "brain");
	const isMainOnly = /** @param {string} dir */ (dir) => dir === brain;
	const rules = buildCommandRules({ isMainProtected: (dir) => !isMainOnly(dir) });
	const decideIn = /** @param {string} command */ (command) => findCommandRule(rules, command, process.cwd())?.decision ?? "allow";
	assert.equal(decideIn("git -C ../brain push origin main"), "allow");
	assert.equal(decideIn("git -C ../brain push --force origin main"), "deny");
	assert.equal(decideIn("git -C ../brain push origin main --tags"), "ask");
	assert.equal(decideIn("git push origin main"), "deny");
	assert.equal(decideIn("git push origin origin/staging:main"), "allow");
});

test("a push that only updates staging passes; a bare or wider push asks", () => {
	assert.equal(decide("git push origin staging"), "allow");
	assert.equal(decide("git push -u origin HEAD:staging"), "allow");
	assert.equal(decide("git push"), "ask");
	assert.equal(decide("git push origin :staging"), "ask");
	assert.equal(decide("git push --tags origin staging"), "ask");
	assert.equal(decide("git push origin staging && git push origin feature"), "ask");
});

test("a Git Bash drive path is the Windows folder it names", () => {
	assert.equal(toNativePath("/d/Dev/projects/brain", "win32"), "D:/Dev/projects/brain");
	assert.equal(toNativePath("/c", "win32"), "C:/");
	assert.equal(toNativePath("/d/Dev", "linux"), "/d/Dev");
	assert.equal(toNativePath("/usr/local", "win32"), "/usr/local");
});

test("a tilde path is the home folder", () => {
	assert.equal(toNativePath("~/dotfiles"), path.join(os.homedir(), "dotfiles"));
	assert.equal(toNativePath("~"), os.homedir());
	assert.equal(toNativePath("../brain"), "../brain");
});
