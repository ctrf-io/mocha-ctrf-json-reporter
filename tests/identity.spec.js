import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import Reporter from "mocha-ctrf-json-reporter";

describe("identity lifecycle", () => {
	it("keeps stable file-qualified logical identity and distinct retry IDs", () => {
		const create = () => {
			const runner = new EventEmitter();
			runner.stats = {};
			return new Reporter(runner, {
				reporterOptions: { runId: "run", shardId: "one" },
				"reporter-option": {},
			});
		};
		const one = create();
		const two = create();
		const test = {
			title: "case",
			state: "passed",
			duration: 1,
			file: "a.js",
			fullTitle: () => "suite case",
			titlePath: () => ["suite", "case"],
			currentRetry: () => 1,
		};
		one.handleRetry(test, new Error("fail"));
		one.handleTestEnd(test);
		two.handleTestEnd(test);
		assert.equal(one.ctrfReport.runId, "run");
		assert.equal(
			one.ctrfReport.results.tests[0].testId,
			two.ctrfReport.results.tests[0].testId,
		);
		assert.notEqual(
			one.ctrfReport.results.tests[0].executionId,
			two.ctrfReport.results.tests[0].executionId,
		);
		assert.ok(one.ctrfReport.results.tests[0].retryAttempts[0].attemptId);
		assert.ok(one.ctrfReport.results.tests[0].attemptId);
		assert.notEqual(
			one.ctrfReport.results.tests[0].attemptId,
			one.ctrfReport.results.tests[0].retryAttempts[0].attemptId,
		);
	});
});
