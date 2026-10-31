/**
 * Deep merge two objects following CTRF merge rules:
 * - Arrays: concatenated
 * - Objects: recursively merged
 * - Primitives: overwritten
 */
export function mergeExtra(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
): Record<string, unknown> {
	const result = { ...target };

	for (const [key, sourceValue] of Object.entries(source)) {
		const targetValue = result[key];

		if (Array.isArray(sourceValue)) {
			result[key] = Array.isArray(targetValue)
				? [...targetValue, ...sourceValue]
				: [...sourceValue];
		} else if (
			sourceValue !== null &&
			typeof sourceValue === "object" &&
			!Array.isArray(sourceValue)
		) {
			result[key] =
				targetValue !== null &&
				typeof targetValue === "object" &&
				!Array.isArray(targetValue)
					? mergeExtra(
							targetValue as Record<string, unknown>,
							sourceValue as Record<string, unknown>,
						)
					: { ...sourceValue };
		} else {
			result[key] = sourceValue;
		}
	}

	return result;
}
