// Expectations come from native events and fixture inputs, never CTRF output.
export const configuredOptions = {
	runId: "standard-run",
	shardId: "standard-shard",
	appName: "fixture-app",
	appVersion: "2.0.0",
	buildName: "standard-build",
	buildNumber: 0,
	buildUrl: "https://example.test/build/0",
	repositoryName: "fixture-repository",
	repositoryUrl: "https://example.test/repository",
	branchName: "fixture-branch",
	osPlatform: "fixture-platform",
	osRelease: "fixture-release",
	osVersion: "fixture-version",
	testEnvironment: "fixture-environment",
};
export function expectedReport(native, options = {}) {
	const tests = native.map((test) => {
		const status = ["passed", "failed", "pending", "skipped"].includes(
			test.state,
		)
			? test.state
			: "other";
		return {
			name: test.name,
			status,
			duration: test.duration ?? 0,
			...(test.state !== undefined ? { rawStatus: test.state } : {}),
			...(test.file ? { filePath: test.file } : {}),
			retries: test.retry,
			flaky: status === "passed" && test.retry > 0,
			...(options.customIdentity ? { testId: `custom:${test.title}` } : {}),
			...(test.error
				? {
						message: `${test.error.name} ${test.error.message}`,
						trace: test.error.stack,
					}
				: {}),
			...(test.extra ? { extra: test.extra } : {}),
			sourceAttempts: [
				...test.attempts.map((a) => ({
					status: "failed",
					...(a.duration !== undefined ? { duration: a.duration } : {}),
				})),
				{ status, duration: test.duration ?? 0 },
			],
		};
	});
	const summary = { tests: tests.length };
	for (const status of ["passed", "failed", "pending", "skipped", "other"])
		summary[status] = tests.filter((t) => t.status === status).length;
	const environment = Object.fromEntries(
		Object.keys(configuredOptions)
			.filter(
				(k) =>
					k !== "runId" &&
					options[k] !== undefined &&
					(k !== "buildNumber" || Number.isInteger(options[k])),
			)
			.map((k) => [k, options[k]]),
	);
	return {
		reportFormat: "CTRF",
		specVersion: "0.2.0",
		generatedBy: "mocha-ctrf-json-reporter",
		...(options.runId ? { runId: options.runId } : {}),
		results: { tool: { name: "mocha" }, summary, tests, environment },
	};
}
