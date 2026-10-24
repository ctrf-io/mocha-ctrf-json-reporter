const { appendFileSync } = require("node:fs");
const { ctrf } = require("mocha-ctrf-json-reporter");
describe("second file", () => {
	it("pass", function () {
		const extra = { file: "second" };
		appendFileSync(
			process.env.CTRF_NATIVE_ACTIONS,
			JSON.stringify({
				pid: process.pid,
				file: __filename,
				name: this.test.fullTitle(),
				extra,
			}) + "\n",
		);
		ctrf.extra(extra);
	});
});
