import assert from "node:assert/strict";
// This fixture inventory is independent of both the native observer and CTRF.
export function assertNativeScenario(
	native,
	mode,
	parallel = false,
	partition = "one",
) {
	const passed = [
		"suite pass",
		"suite isolated",
		"suite unicode ✓",
		"suite first duplicate",
		"suite second duplicate",
	].map((name) => [name, "passed", 0]);
	let expected;
	if (partition === "two") expected = [["second file pass", "passed", 0]];
	else if (mode === "empty") expected = [];
	else if (mode === "all-skipped")
		expected = [
			["suite skip", "pending", 0],
			["suite pending", "pending", 0],
		];
	else if (mode === "hooks-and-timeout")
		expected = [
			['hook failure "before all" hook for "unreached"', "failed", 0],
			["timeout times out", "failed", 0],
		];
	else
		expected = [
			...passed,
			...(mode === "mixed"
				? [
						["suite skip", "pending", 0],
						["suite pending", "pending", 0],
						["suite flaky", "passed", 1],
						["suite failure", "failed", 2],
					]
				: []),
			...(parallel ? [["second file pass", "passed", 0]] : []),
		];
	const sort = (items) => items.sort((a, b) => a[0].localeCompare(b[0]));
	assert.deepEqual(
		sort(native.map((t) => [t.name, t.state, t.retry])),
		sort(expected),
		"Native fixture cases/outcomes/retries differ from the independent scenario inventory",
	);
	for (const test of native)
		assert.equal(
			test.attempts.length,
			test.retry,
			"Missing independent retry events",
		);
}
