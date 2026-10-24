import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { configuredOptions, expectedReport } from "../expected.mjs";
const require = createRequire(import.meta.url);
const Reporter = require("../../../../dist/index.cjs");
export function unitContext() {
	const directory = mkdtempSync(path.join(tmpdir(), "ctrf-mocha-unit-"));
	const samples = [];
	try {
		for (const [name, options, mode] of [
			["full", configuredOptions],
			["repeated", configuredOptions],
			["defaults", {}],
			["minimal-option", { minimal: true }],
			["empty-run-id", { runId: "" }],
			["empty-run", {}, "empty"],
			[
				"custom-identity",
				{
					customIdentity: true,
					testIdResolver: ({ name }) => `custom:${name}`,
				},
			],
			["shard-one", { ...configuredOptions, shardId: "one" }],
			["shard-two", { ...configuredOptions, shardId: "two" }],
			["fractional-build-number", { ...configuredOptions, buildNumber: 1.5 }],
			[
				"nonfinite-build-number",
				{ ...configuredOptions, buildNumber: Infinity },
			],
		]) {
			const start = Date.now();
			const runner = new EventEmitter();
			runner.stats = {};
			new Reporter(runner, {
				reporterOptions: {
					...options,
					outputDir: directory,
					outputFile: `${name}.json`,
				},
			});
			const native = [];
			runner.emit("start");
			for (const [title, state, retry] of mode === "empty"
				? []
				: [
						["pass", "passed", 0],
						["unicode ✓", "passed", 0],
						["failure", "failed", 2],
						["skip", "pending", 0],
						["skipped", "skipped", 0],
						["unknown", "disabled", 0],
						["flaky", "passed", 1],
						["duplicate", "passed", 0],
						["duplicate", "passed", 0],
					]) {
				const suite = native.length === 8 ? "second" : "suite";
				const file = path.resolve("fixture/cases.cjs");
				let attempt = 0;
				const test = {
					slow: () => 75,
					title,
					state,
					duration: title === "unicode ✓" ? undefined : 12,
					file,
					fullTitle: () => `${suite} ${title}`,
					titlePath: () => [suite, title],
					currentRetry: () => attempt,
				};
				const attempts = [];
				const extra =
					title === "pass"
						? { owner: "last", nested: { a: 1, b: 2 }, list: ["one", "two"] }
						: undefined;
				for (let i = 0; i < retry; i++) {
					const error = new Error(`attempt ${i + 1} failure`);
					attempts.push({ duration: test.duration });
					runner.emit("retry", test, error);
					attempt++;
				}
				runner.emit("test", test);
				if (extra) {
					Reporter.ctrf.extra({
						owner: "first",
						nested: { a: 1 },
						list: ["one"],
					});
					Reporter.ctrf.extra({
						owner: "last",
						nested: { b: 2 },
						list: ["two"],
					});
				}
				const error =
					state === "failed" ? new Error("fixture failure") : undefined;
				runner.emit(
					state === "failed" ? "fail" : state === "passed" ? "pass" : "pending",
					test,
					error,
				);
				native.push({
					title,
					name: test.fullTitle(),
					state,
					duration: test.duration,
					file,
					retry,
					attempts,
					extra,
					...(error
						? {
								error: {
									name: error.name,
									message: error.message,
									stack: error.stack,
								},
							}
						: {}),
				});
			}
			runner.emit("end");
			const bytes = readFileSync(path.join(directory, `${name}.json`));
			samples.push({
				name,
				bytes,
				report: JSON.parse(bytes),
				expected: expectedReport(native, options),
				runWindow: [start, Date.now()],
			});
		}
		return {
			samples,
			repeated: samples.slice(0, 2),
			shards: samples.filter((s) => s.name.startsWith("shard-")),
			warnings: [],
		};
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}
