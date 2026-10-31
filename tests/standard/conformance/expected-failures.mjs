import { runExpectedFailure } from "./shared/expected-failures.mjs";
import { checkMochaEntry } from "./mocha-checks.mjs";

// Resolved defects run as ordinary conformance assertions.
export const expectedFailures = {};
export function expectedFailure(entry, level) {
	const issue = expectedFailures[entry.id];
	return issue?.samples[level] ? issue : undefined;
}
export function matchesKnownFailure() {
	return false;
}
export function runConformance(entry, context, level, check = checkMochaEntry) {
	return runExpectedFailure(
		entry,
		context,
		level,
		expectedFailure(entry, level),
		check,
		matchesKnownFailure,
	);
}
