import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import Reporter from "mocha-ctrf-json-reporter";
import { CURRENT_SPEC_VERSION, validateStrict } from "ctrf";

function createReporter(reporterOptions = {}) {
	const runner = new EventEmitter();
	runner.stats = {};
	const reporter = new Reporter(runner, {
		reporter: "mocha-ctrf-json-reporter",
		reporterOptions,
		"reporter-option": {},
	});
	return reporter;
}

function createTest(overrides = {}) {
	let retry = 0;
	return {
		state: "passed",
		duration: 10,
		file: "/path/to/test.js",
		err: undefined,
		fullTitle: () => "suite conformant test",
		currentRetry: () => retry,
		setCurrentRetry: (value) => {
			retry = value;
		},
		...overrides,
	};
}

describe("CTRF conformance", () => {
	it("emits the current CTRF specification version", () => {
		const reporter = createReporter();

		assert.equal(reporter.ctrfReport.specVersion, CURRENT_SPEC_VERSION);
	});

	it("produces a strictly valid base report", () => {
		const reporter = createReporter();

		assert.doesNotThrow(() =>
			validateStrict(reporter.ctrfReport, {
				specVersion: CURRENT_SPEC_VERSION,
			}),
		);
	});

	it("emits a numeric environment build number", () => {
		const reporter = createReporter({ buildNumber: 100 });
		reporter.handleStart();

		assert.equal(reporter.ctrfReport.results.environment.buildNumber, 100);
		assert.doesNotThrow(() =>
			validateStrict(reporter.ctrfReport, {
				specVersion: CURRENT_SPEC_VERSION,
			}),
		);
	});

	it("emits conformant history for retried tests", () => {
		const reporter = createReporter();
		const test = createTest();

		reporter.handleRetry(test, new Error("first failure"));
		test.setCurrentRetry(1);
		reporter.handleRetry(test, new Error("second failure"));
		test.setCurrentRetry(2);
		reporter.handleTestEnd(test);

		const result = reporter.ctrfReport.results.tests[0];
		assert.equal(result.retries, 2);
		assert.equal(result.flaky, true);
		assert.deepEqual(
			result.retryAttempts.map(({ attempt, status, message }) => ({
				attempt,
				status,
				message,
			})),
			[
				{ attempt: 1, status: "failed", message: "Error first failure" },
				{ attempt: 2, status: "failed", message: "Error second failure" },
			],
		);
		assert.doesNotThrow(() =>
			validateStrict(reporter.ctrfReport, {
				specVersion: CURRENT_SPEC_VERSION,
			}),
		);
	});
});
