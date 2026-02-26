import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DIST_ASSETS_DIR = resolve(process.cwd(), "dist/assets");
const budgetKb = Number(process.env.BUNDLE_GZIP_BUDGET_KB ?? "350");
const budgetBytes = budgetKb * 1024;

const assetFiles = readdirSync(DIST_ASSETS_DIR);
const entryChunk = assetFiles.find(
  (file) => file.startsWith("index-") && file.endsWith(".js"),
);

if (!entryChunk) {
  console.error("Bundle budget check failed: could not find dist/assets/index-*.js");
  process.exit(1);
}

const content = readFileSync(resolve(DIST_ASSETS_DIR, entryChunk));
const gzipSize = gzipSync(content).byteLength;

if (gzipSize > budgetBytes) {
  console.error(
    `Bundle budget exceeded: ${entryChunk} is ${(gzipSize / 1024).toFixed(
      2,
    )} kB gzipped (budget ${budgetKb} kB).`,
  );
  process.exit(1);
}

console.log(
  `Bundle budget passed: ${entryChunk} is ${(gzipSize / 1024).toFixed(
    2,
  )} kB gzipped (budget ${budgetKb} kB).`,
);
