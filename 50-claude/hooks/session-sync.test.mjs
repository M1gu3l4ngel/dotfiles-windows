// Tests for the session sync hook: it only moves a clone when nothing local can be lost, and it
// reports a workflow by its last finished run.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { decideSync, findBrainDir, listFailedWorkflows } from "./session-sync.mjs";

test("a clone at its remote's commit is left alone", () => {
	assert.equal(decideSync({ behind: 0, ahead: 0, dirty: false }), "none");
	assert.equal(decideSync({ behind: 0, ahead: 2, dirty: true }), "none");
});

test("a clean clone behind its remote is fast-forwarded", () => {
	assert.equal(decideSync({ behind: 2, ahead: 0, dirty: false }), "fast-forward");
});

test("a clone behind with local work is reported, never moved", () => {
	assert.equal(decideSync({ behind: 2, ahead: 0, dirty: true }), "report");
	assert.equal(decideSync({ behind: 2, ahead: 1, dirty: false }), "report");
});

test("the brain is the sibling clone, and not the brain itself", () => {
	const root = mkdtempSync(path.join(tmpdir(), "session-sync-"));
	mkdirSync(path.join(root, "brain", ".git"), { recursive: true });
	mkdirSync(path.join(root, "core"));
	assert.equal(findBrainDir(path.join(root, "core")), path.join(root, "brain"));
	assert.equal(findBrainDir(path.join(root, "brain")), null);
});

test("a project with no brain next to it gets nothing", () => {
	const root = mkdtempSync(path.join(tmpdir(), "session-sync-"));
	mkdirSync(path.join(root, "app"));
	assert.equal(findBrainDir(path.join(root, "app")), null);
});

/** @param {string} workflowName @param {string} conclusion @param {string} [status] */
const runOf = (workflowName, conclusion, status = "completed") => ({ workflowName, conclusion, status, url: `u/${workflowName}/${conclusion}` });

test("a workflow is judged by its newest finished run", () => {
	const failed = listFailedWorkflows([runOf("CI", "success"), runOf("CI", "failure"), runOf("Presets", "cancelled"), runOf("Presets", "success")]);
	assert.deepEqual(failed.map((run) => run.workflowName), ["Presets"]);
});

test("a run still going does not hide the last finished one", () => {
	const failed = listFailedWorkflows([runOf("CI", "", "in_progress"), runOf("CI", "failure")]);
	assert.deepEqual(failed.map((run) => run.conclusion), ["failure"]);
});

test("skipped and neutral runs are not failures", () => {
	assert.deepEqual(listFailedWorkflows([runOf("A", "skipped"), runOf("B", "neutral")]), []);
});
