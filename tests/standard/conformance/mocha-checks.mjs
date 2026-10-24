import assert from "node:assert/strict";
import { checkEntry } from "./shared/checks.mjs";
export function checkMochaEntry(entry, context) {
	if (entry.path === "results.tests[].extra") {
		for (const sample of context.samples)
			assert.deepEqual(
				sample.report.results.tests.map((t) => t.extra),
				sample.expected.results.tests.map((t) => t.extra),
				`${sample.name}: runtime metadata source mapping`,
			);
	}
	// Missing optional error fields on unaffected tests must not hide mapping errors.
	if (
		["results.tests[].message", "results.tests[].trace"].includes(entry.path)
	) {
		const key = entry.path.split(".").at(-1);
		for (const sample of context.samples)
			assert.deepEqual(
				sample.report.results.tests.map((t) => t[key]),
				sample.expected.results.tests.map((t) => t[key]),
				`${sample.name}: native ${key} mapping`,
			);
	}
	checkEntry(entry, context);
}
