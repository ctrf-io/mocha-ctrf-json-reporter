import assert from "node:assert/strict";
import Reporter, { ctrf, extra } from "mocha-ctrf-json-reporter";

describe("Runtime API ESM", () => {
	it("exposes the reporter and attaches extra metadata", () => {
		assert.equal(typeof Reporter, "function");
		assert.equal(typeof extra, "function");
		assert.equal(typeof ctrf.extra, "function");

		extra({
			api: "esm",
			tags: ["root-extra"],
			nested: { first: true },
		});
		ctrf.extra({
			tags: ["ctrf-extra"],
			nested: { second: true },
		});
	});
});
