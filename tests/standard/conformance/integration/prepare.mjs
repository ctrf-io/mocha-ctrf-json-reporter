import assert from "node:assert/strict";
import { assertNativeScenario } from "./evidence.mjs";
import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { catalogue, checkEntry } from "../shared/checks.mjs";
import { configuredOptions, expectedReport } from "../expected.mjs";
export function integrationContext(root, diagnostics) {
	const consumer = mkdtempSync(path.join(tmpdir(), "ctrf-mocha-consumer-"));
	const npm = process.platform === "win32" ? "npm.cmd" : "npm";
	const env = { ...process.env, CI: "true", FORCE_COLOR: "0" };
	delete env.NODE_PATH;
	delete env.NODE_OPTIONS;
	function execute(command, args, name, expected = 0) {
		const result = spawnSync(command, args, {
			cwd: consumer,
			env,
			encoding: "utf8",
			timeout: 300000,
			maxBuffer: 16 * 1024 * 1024,
		});
		if (diagnostics)
			writeFileSync(
				path.join(diagnostics, `${name}.log`),
				`${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error ?? ""}`,
			);
		assert.ifError(result.error);
		assert.equal(result.signal, null, name);
		assert.equal(
			result.status,
			expected,
			`${name}: expected exit ${expected}\n${result.stdout}\n${result.stderr}`,
		);
		return result;
	}
	try {
		const pkg = JSON.parse(readFileSync(path.join(root, "package.json")));
		const packed = JSON.parse(
			execute(npm, ["pack", root, "--json", "--ignore-scripts"], "pack").stdout,
		)[0];
		assert.ok(
			packed.files.every((f) => !f.path.startsWith("tests/")),
			"Test sources leaked into package",
		);
		writeFileSync(
			path.join(consumer, "package.json"),
			JSON.stringify({ private: true }),
		);
		execute(
			npm,
			[
				"install",
				"--ignore-scripts",
				"--no-audit",
				"--no-fund",
				"--save-exact",
				`./${packed.filename}`,
				`mocha@${pkg.devDependencies.mocha}`,
			],
			"install",
		);
		cpSync(
			new URL("./fixtures/", import.meta.url),
			path.join(consumer, "fixtures"),
			{ recursive: true },
		);
		const samples = [];
		const scenarios = [
			{ name: "full", mode: "mixed", options: configuredOptions, exit: 1 },
			{ name: "repeated", mode: "mixed", options: configuredOptions, exit: 1 },
			{
				name: "parallel",
				mode: "passed",
				options: configuredOptions,
				exit: 0,
				parallel: true,
			},
			{
				name: "hooks-and-timeout",
				mode: "hooks-and-timeout",
				options: {},
				exit: 2,
			},
			{ name: "defaults", mode: "passed", options: {}, exit: 0 },
			{
				name: "minimal-option",
				mode: "mixed",
				options: { minimal: true },
				exit: 1,
			},
			{ name: "empty-run-id", mode: "passed", options: { runId: "" }, exit: 0 },
			{
				name: "custom-identity",
				mode: "passed",
				options: { customIdentity: true },
				exit: 0,
			},
			{ name: "all-skipped", mode: "all-skipped", options: {}, exit: 0 },
			{ name: "empty-run", mode: "empty", options: {}, exit: 0 },
			{
				name: "shard-one",
				mode: "passed",
				options: { ...configuredOptions, shardId: "one" },
				exit: 0,
			},
			{
				name: "shard-two",
				mode: "passed",
				options: { ...configuredOptions, shardId: "two" },
				exit: 0,
			},
			{
				name: "fractional-build-number",
				mode: "passed",
				options: { buildNumber: 1.5 },
				exit: 0,
			},
			{
				name: "nonfinite-build-number",
				mode: "passed",
				options: { buildNumber: Infinity },
				exit: 0,
			},
		];
		for (const scenario of scenarios) {
			const outputDir = path.join(consumer, scenario.name);
			mkdirSync(outputDir);
			env.CTRF_PARTITION = scenario.name === "shard-two" ? "two" : "one";
			env.CTRF_FIXTURE_SCENARIO = scenario.name;
			env.CTRF_FIXTURE_MODE = scenario.mode;
			env.CTRF_PARALLEL = String(!!scenario.parallel);
			env.CTRF_FIXTURE_OPTIONS = JSON.stringify({
				...scenario.options,
				outputDir,
			});
			env.CTRF_NATIVE_OUTPUT = path.join(outputDir, "native.json");
			env.CTRF_NATIVE_ACTIONS = path.join(outputDir, "actions.jsonl");
			const start = Date.now();
			execute(
				process.execPath,
				["fixtures/run.cjs"],
				scenario.name,
				scenario.exit,
			);
			const bytes = readFileSync(path.join(outputDir, "ctrf-report.json"));
			const evidence = JSON.parse(readFileSync(env.CTRF_NATIVE_OUTPUT));
			if (scenario.parallel)
				assert.ok(
					new Set(evidence.actions.map((a) => a.pid)).size >= 2 &&
						evidence.actions.every((a) => a.pid !== evidence.reporterPid),
					"Parallel fixture did not prove two worker processes",
				);
			const native = evidence.native;
			assertNativeScenario(
				native,
				scenario.mode,
				!!scenario.parallel,
				env.CTRF_PARTITION,
			);
			// Repeated runs share native ordering; parallel ordering follows observed native events.
			const sample = {
				name: scenario.name,
				report: JSON.parse(bytes),
				base64: bytes.toString("base64"),
				expected: expectedReport(native, scenario.options),
				runWindow: [start, Date.now()],
			};
			assert.equal(
				sample.report.results.tests.length,
				native.length,
				"Missing native result",
			);
			samples.push(sample);
			if (diagnostics) {
				writeFileSync(
					path.join(diagnostics, `${scenario.name}-subject.json`),
					bytes,
				);
				writeFileSync(
					path.join(diagnostics, `${scenario.name}-native.json`),
					JSON.stringify(evidence, null, 2),
				);
			}
		}
		const original = samples.find((sample) => sample.name === "full");
		for (const [rule, mutate] of [
			[
				"single-json-object",
				(r) => {
					r.results.tests[0].duration = "invalid";
				},
			],
			[
				"summary-matches-final-results",
				(r) => {
					r.results.summary.passed++;
				},
			],
			[
				"retry-count-matches-history-length",
				(r) => {
					r.results.tests.find((t) => t.retries > 0).retries++;
				},
			],
			[
				"history-excludes-final-attempt",
				(r) => {
					r.results.tests.find((t) => t.retries > 0).retryAttempts[0].duration =
						999999;
				},
			],
		]) {
			const report = structuredClone(original.report);
			mutate(report);
			const sample = {
				...original,
				report,
				bytes: Buffer.from(JSON.stringify(report)),
			};
			assert.throws(
				() =>
					checkEntry(
						catalogue.entries.find((e) => e.rule === rule),
						{ samples: [sample] },
					),
				`Corruption was not rejected: ${rule}`,
			);
		}
		return {
			samples,
			repeated: ["full", "repeated"],
			shards: ["shard-one", "shard-two"],
			warnings: [],
		};
	} finally {
		rmSync(consumer, { recursive: true, force: true });
	}
}
