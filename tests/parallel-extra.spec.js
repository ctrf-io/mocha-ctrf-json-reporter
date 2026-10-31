import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateStrict } from "ctrf";

const root = fileURLToPath(new URL("../", import.meta.url));

function fixture(source, imports, actions) {
	return `${imports}
const assert = requireAssert;
const reused = { value: 'initial' };
const record = () => appendFileSync(${JSON.stringify(actions)}, JSON.stringify({ source: ${JSON.stringify(source)}, pid: process.pid }) + '\\n');
describe('worker metadata', () => {
  before(() => extra({ outsideTest: true }));
  afterEach(() => extra({ afterTest: true }));
  it('merged', async function () {
    record();
    extra({ reused });
    reused.value = 'first test';
    ctrf.extra({ source: ${JSON.stringify(source)}, owner: 'first', nested: { a: 1 }, list: ['one'], reserved: { $$value: 'literal', __mocha_id__: 'user' } });
    await new Promise(resolve => setTimeout(resolve, 15));
    extra({ owner: 'last', nested: { b: 2 }, list: ['two'] });
  });
  it('empty', () => { reused.value = 'later test'; });
  it('same title', () => extra({ duplicate: 1 }));
  it('same title', () => extra({ duplicate: 2 }));
  it('recovered', function () {
    this.retries(1);
    extra({ attempts: [this.test.currentRetry()] });
    assert.equal(this.test.currentRetry(), 1);
  });
  it('failed', function () {
    this.retries(1);
    extra({ failedAttempts: [this.test.currentRetry()] });
    throw new Error('metadata fixture failure');
  });
  it('skipped', function () { extra({ skipped: true }); this.skip(); });
  it.skip('never started', () => extra({ shouldNotRun: true }));
});
`;
}

for (const format of ["cjs", "esm"]) {
	for (const parallel of [false, true]) {
		it(`runtime metadata / ${format} reporter, ${parallel ? "parallel workers" : "serial"}`, function () {
			this.timeout(30000);
			const scratch = mkdtempSync(path.join(tmpdir(), "ctrf-mocha-runtime-"));
			try {
				const actions = path.join(scratch, "actions.jsonl");
				const files = ["first.cjs", "second.mjs", "third.cjs"];
				for (const source of files) {
					const imports = source.endsWith(".mjs")
						? `import requireAssert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import { ctrf } from ${JSON.stringify(pathToFileURL(path.join(root, "dist/index.js")).href)};
import { extra } from ${JSON.stringify(pathToFileURL(path.join(root, "dist/runtime.js")).href)};`
						: `const requireAssert = require('node:assert/strict');
const { appendFileSync } = require('node:fs');
const { ctrf } = require(${JSON.stringify(path.join(root, "dist/index.cjs"))});
const { extra } = require(${JSON.stringify(path.join(root, "dist/runtime.cjs"))});`;
					writeFileSync(
						path.join(scratch, source),
						fixture(source, imports, actions),
					);
				}
				writeFileSync(
					path.join(scratch, "run.mjs"),
					`import Mocha from ${JSON.stringify(pathToFileURL(path.join(root, "node_modules/mocha/index.js")).href)};
import Reporter from ${JSON.stringify(pathToFileURL(path.join(root, `dist/index.${format === "cjs" ? "cjs" : "js"}`)).href)};
const mocha = new Mocha({ reporter: Reporter, parallel: ${parallel}, jobs: 2, timeout: 3000, reporterOptions: { outputDir: ${JSON.stringify(scratch)} } });
for (const file of ${JSON.stringify(files)}) mocha.addFile(file);
await mocha.loadFilesAsync();
mocha.run(failures => { process.exitCode = failures; });
`,
				);
				const child = spawnSync(process.execPath, ["run.mjs"], {
					cwd: scratch,
					encoding: "utf8",
					timeout: 25000,
				});
				assert.ifError(child.error);
				assert.equal(child.signal, null);
				assert.equal(child.status, 3, `${child.stdout}\n${child.stderr}`);
				const report = JSON.parse(
					readFileSync(path.join(scratch, "ctrf-report.json")),
				);
				validateStrict(report, { specVersion: "0.2.0" });
				assert.equal(report.results.tests.length, 24);
				for (const source of files) {
					const tests = report.results.tests.filter(
						(t) => path.basename(t.filePath) === source,
					);
					assert.deepEqual(
						tests.map((t) => t.extra),
						[
							{
								source,
								owner: "last",
								nested: { a: 1, b: 2 },
								list: ["one", "two"],
								reserved: { $$value: "literal", __mocha_id__: "user" },
								reused: { value: "first test" },
							},
							undefined,
							{ duplicate: 1 },
							{ duplicate: 2 },
							{ attempts: [0, 1], afterTest: true },
							{ failedAttempts: [0, 1], afterTest: true },
							{ skipped: true },
							undefined,
						],
					);
				}
				const observations = readFileSync(actions, "utf8")
					.trim()
					.split("\n")
					.map(JSON.parse);
				assert.equal(observations.length, 3);
				assert.equal(
					new Set(observations.map((a) => a.pid)).size,
					parallel ? 2 : 1,
				);
				if (parallel) {
					assert.ok(observations.every((a) => a.pid !== child.pid));
				}
			} finally {
				rmSync(scratch, { recursive: true, force: true });
			}
		});
	}
}
