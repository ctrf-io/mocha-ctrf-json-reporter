const Mocha = require("mocha");
const path = require("node:path");
const options = JSON.parse(process.env.CTRF_FIXTURE_OPTIONS);
if (process.env.CTRF_FIXTURE_SCENARIO === "nonfinite-build-number")
	options.buildNumber = Infinity;
if (options.customIdentity)
	options.testIdResolver = ({ name }) => `custom:${name}`;
const mocha = new Mocha({
	reporter: require("./native-reporter.cjs"),
	reporterOptions: options,
	parallel: process.env.CTRF_PARALLEL === "true",
	jobs: 2,
	timeout: 3000,
	color: false,
});
mocha.addFile(
	path.resolve(
		process.env.CTRF_PARTITION === "two"
			? "fixtures/second.cjs"
			: "fixtures/cases.cjs",
	),
);
if (process.env.CTRF_PARALLEL === "true")
	mocha.addFile(path.resolve("fixtures/second.cjs"));
mocha.run((failures) => {
	process.exitCode = Math.min(failures, 255);
});
