const assert = require("node:assert/strict");
const { appendFileSync } = require("node:fs");
const { ctrf } = require("mocha-ctrf-json-reporter");
const mode = process.env.CTRF_FIXTURE_MODE;
function observe(test, extra) {
	appendFileSync(
		process.env.CTRF_NATIVE_ACTIONS,
		JSON.stringify({
			pid: process.pid,
			file: __filename,
			name: test.fullTitle(),
			extra,
		}) + "\n",
	);
}
if (mode === "hooks-and-timeout") {
	describe("hook failure", () => {
		before(() => {
			throw new Error("fixture hook failure");
		});
		it("unreached", () => {});
	});
	describe("timeout", () => {
		it("times out", function (_done) {
			this.timeout(15);
		});
	});
} else if (mode !== "empty")
	describe("suite", () => {
		if (mode === "all-skipped") {
			it.skip("skip", () => {});
			it("pending");
			return;
		}
		it("pass", function () {
			observe(this.test, {
				owner: "last",
				nested: { a: 1, b: 2 },
				list: ["one", "two"],
			});
			ctrf.extra({ owner: "first", nested: { a: 1 }, list: ["one"] });
			ctrf.extra({ owner: "last", nested: { b: 2 }, list: ["two"] });
		});
		it("isolated", function () {
			observe(this.test, { isolated: true });
			ctrf.extra({ isolated: true });
		});
		it("unicode ✓", () => {});
		describe("first", () => {
			it("duplicate", () => {});
		});
		describe("second", () => {
			it("duplicate", () => {});
		});
		if (mode === "mixed") {
			it.skip("skip", () => {});
			it("pending");
			it("flaky", function () {
				this.retries(1);
				assert.equal(this.test.currentRetry(), 1, "first failure");
			});
			it("failure", function () {
				this.retries(2);
				throw new Error("fixture failure");
			});
		}
	});
