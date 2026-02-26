import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const WAIVER_PATH = resolve(process.cwd(), "docs/security/DEPENDENCY_WAIVERS.md");

const runAudit = (args) => {
  const result = spawnSync("npm", ["audit", ...args, "--json"], {
    encoding: "utf8",
  });
  const output = result.stdout || result.stderr;

  if (!output) {
    throw new Error(`npm audit returned no output for args: ${args.join(" ")}`);
  }

  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`Failed to parse npm audit JSON output for args: ${args.join(" ")}`);
  }
};

const getRuntimeHighAndCritical = (auditJson) => {
  const metadata = auditJson?.metadata?.vulnerabilities;
  if (!metadata) {
    return 0;
  }
  return (metadata.high ?? 0) + (metadata.critical ?? 0);
};

const getRootAdvisoryNames = (auditJson) => {
  const vulnerabilities = auditJson?.vulnerabilities ?? {};
  const advisoryNames = new Set();

  Object.values(vulnerabilities).forEach((entry) => {
    const via = entry?.via ?? [];
    via.forEach((item) => {
      if (typeof item === "object" && item?.name) {
        advisoryNames.add(item.name.toLowerCase());
      }
    });
  });

  return [...advisoryNames];
};

const waiverDocument = readFileSync(WAIVER_PATH, "utf8").toLowerCase();

const runtimeAudit = runAudit(["--omit=dev", "--audit-level=high"]);
const runtimeHighAndCritical = getRuntimeHighAndCritical(runtimeAudit);

if (runtimeHighAndCritical > 0) {
  console.error(
    `Security baseline failed: runtime dependencies have ${runtimeHighAndCritical} high/critical vulnerabilities.`,
  );
  process.exit(1);
}

const fullAudit = runAudit(["--audit-level=high"]);
const unresolvedAdvisories = getRootAdvisoryNames(fullAudit).filter(
  (name) => !waiverDocument.includes(name),
);

if (unresolvedAdvisories.length > 0) {
  console.error(
    `Security baseline failed: missing waivers for advisories: ${unresolvedAdvisories.join(", ")}`,
  );
  process.exit(1);
}

console.log("Security baseline passed: runtime vulnerabilities clear and advisories are documented.");
