const fs = require("node:fs");
const Reporter = require("mocha-ctrf-json-reporter");
const path = require("node:path");
// Listen to native Mocha events independently; never inspect reporter internals.
module.exports = class ObservedReporter extends Reporter {
	constructor(runner, options) {
		super(runner, options);
		const native = [];
		const histories = new Map();
		const key = (t) => JSON.stringify([t.file, t.fullTitle()]);
		runner.on("retry", (t) => {
			const values = histories.get(key(t)) ?? [];
			values.push({ duration: t.duration });
			histories.set(key(t), values);
		});
		for (const event of ["pass", "fail", "pending"])
			runner.on(event, (t, error) =>
				native.push({
					title: t.title,
					name: t.fullTitle(),
					state: t.state,
					file: t.file,
					duration: t.duration,
					retry: t.currentRetry(),
					attempts: histories.get(key(t)) ?? [],
					...(error
						? {
								error: {
									name: error.name,
									message: error.message,
									stack: error.stack,
								},
							}
						: {}),
				}),
			);
		runner.on("end", () => {
			const actions = fs.existsSync(process.env.CTRF_NATIVE_ACTIONS)
				? fs
						.readFileSync(process.env.CTRF_NATIVE_ACTIONS, "utf8")
						.trim()
						.split("\n")
						.filter(Boolean)
						.map(JSON.parse)
				: [];
			for (const t of native) {
				const action = actions.find(
					(a) => a.file === t.file && a.name === t.name && a.extra,
				);
				if (action) t.extra = action.extra;
			}
			fs.writeFileSync(
				process.env.CTRF_NATIVE_OUTPUT,
				JSON.stringify({ native, actions, reporterPid: process.pid }),
			);
		});
	}
};
