// Tests for the brain sync hook: it only moves the clone when nothing local can be lost.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { decideBrainSync, findBrainDir } from "./sync-brain.mjs";

test("a brain at its remote's commit is left alone", () => {
	assert.equal(decideBrainSync({ behind: 0, ahead: 0, dirty: false }), "none");
	assert.equal(decideBrainSync({ behind: 0, ahead: 2, dirty: true }), "none");
});

test("a clean brain behind its remote is fast-forwarded", () => {
	assert.equal(decideBrainSync({ behind: 2, ahead: 0, dirty: false }), "fast-forward");
});

test("a brain behind with local work is reported, never moved", () => {
	assert.equal(decideBrainSync({ behind: 2, ahead: 0, dirty: true }), "report");
	assert.equal(decideBrainSync({ behind: 2, ahead: 1, dirty: false }), "report");
});

test("the brain is the sibling clone, and not the brain itself", () => {
	const root = mkdtempSync(path.join(tmpdir(), "brain-sync-"));
	mkdirSync(path.join(root, "brain", ".git"), { recursive: true });
	mkdirSync(path.join(root, "core"));
	assert.equal(findBrainDir(path.join(root, "core")), path.join(root, "brain"));
	assert.equal(findBrainDir(path.join(root, "brain")), null);
});

test("a project with no brain next to it gets nothing", () => {
	const root = mkdtempSync(path.join(tmpdir(), "brain-sync-"));
	mkdirSync(path.join(root, "app"));
	assert.equal(findBrainDir(path.join(root, "app")), null);
});
