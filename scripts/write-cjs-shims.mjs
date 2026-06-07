import { writeFileSync } from "node:fs";

writeFileSync(
	"dist/index.cjs",
	`"use strict";

const mod = require("./index.generated.cjs");
const Reporter = mod.default || mod;

module.exports = Object.assign(Reporter, {
  ctrf: mod.ctrf,
  extra: mod.extra,
});
`,
);
