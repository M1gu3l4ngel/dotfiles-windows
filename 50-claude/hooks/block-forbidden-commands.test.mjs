// Tests for the global hook's rules: it blocks what is forbidden and lets through what Claude does.
// A safety regex that stops matching gives no warning: it shows only after something is deleted.

import assert from "node:assert/strict";
import { test } from "node:test";
import { findRule } from "./block-forbidden-commands.mjs";
import { isMainPromotion } from "./command-rules.mjs";

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

test("rewriting history stays blocked", () => {
	assert.equal(decide("git reset --hard HEAD~1"), "deny");
	assert.equal(decide("git rebase main"), "deny");
	assert.equal(decide("git commit --no-gpg-sign -m x"), "deny");
	assert.equal(decide("git add -A"), "deny");
	assert.equal(decide("git push --force origin staging"), "deny");
});

test("a fast-forward pull asks and does not hide a write after it", () => {
	assert.equal(decide("git pull --ff-only"), "ask");
	assert.equal(decide("git -C ~/dotfiles-windows pull --ff-only"), "ask");
	assert.equal(decide("git pull"), "deny");
	assert.equal(decide("git pull --ff-only --rebase"), "deny");
	assert.equal(decide("git pull --ff-only --force"), "deny");
	assert.equal(decide("git pull --ff-only; git reset --hard"), "deny");
	assert.equal(decide("git fetch origin"), "allow");
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
	assert.equal(decide("git reset -- a.mjs; git rebase main"), "deny");
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
	assert.equal(decide("git rm a.mjs; git checkout main"), "deny");
});

test("repeated calls give the same decision", () => {
	for (let i = 0; i < 3; i++) {
		assert.equal(decide("git pull --ff-only"), "ask");
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

test("a push that only updates staging passes; a bare or wider push asks", () => {
	assert.equal(decide("git push origin staging"), "allow");
	assert.equal(decide("git push -u origin HEAD:staging"), "allow");
	assert.equal(decide("git push"), "ask");
	assert.equal(decide("git push origin :staging"), "ask");
	assert.equal(decide("git push --tags origin staging"), "ask");
	assert.equal(decide("git push origin staging && git push origin feature"), "ask");
});
