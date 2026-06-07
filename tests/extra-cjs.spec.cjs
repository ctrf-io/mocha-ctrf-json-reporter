const assert = require("node:assert/strict");
const Reporter = require("mocha-ctrf-json-reporter");
const { ctrf, extra } = Reporter;

describe("Runtime API CJS", () => {
	it("exposes the reporter and attaches extra metadata", () => {
		assert.equal(typeof Reporter, "function");
		assert.equal(typeof extra, "function");
		assert.equal(typeof ctrf.extra, "function");

		extra({
			api: "cjs",
			tags: ["root-extra"],
			nested: { first: true },
		});
		ctrf.extra({
			tags: ["ctrf-extra"],
			nested: { second: true },
		});
	});
});
