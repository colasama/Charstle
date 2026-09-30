import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  chmodSync,
  existsSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const targets = [
  ["win32", "windows", "x64", "amd64"],
  ["win32", "windows", "arm64", "arm64"],
  ["darwin", "darwin", "x64", "amd64"],
  ["darwin", "darwin", "arm64", "arm64"],
  ["linux", "linux", "x64", "amd64"],
  ["linux", "linux", "arm64", "arm64"],
];
const requested = process.argv[2] ?? "all";
if (
  requested !== "all" &&
  !targets.some(([os, , arch]) => requested === os + "-" + arch)
)
  throw Error("Unknown release target: " + requested);
if (!existsSync(join(root, "web/dist/index.html")))
  throw Error("Build the frontend first: npm run build:web");
function run(command, args, options = {}) {
  const r = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw Error(command + " failed: " + r.status);
}
const checksums = [];
for (const [os, goos, arch, goarch] of targets) {
  const target = os + "-" + arch;
  if (requested !== "all" && requested !== target) continue;
  const name = "charstle-" + target;
  const dir = join(root, "dist/npm", name);
  mkdirSync(join(dir, "bin"), { recursive: true });
  const binary = join(
    dir,
    "bin",
    goos === "windows" ? "charstle.exe" : "charstle",
  );
  run(
    process.env.GO ?? "go",
    [
      "build",
      "-trimpath",
      "-ldflags",
      "-s -w -X main.version=" + pkg.version,
      "-o",
      binary,
      "./cmd/charstle",
    ],
    { env: { ...process.env, GOOS: goos, GOARCH: goarch, CGO_ENABLED: "0" } },
  );
  chmodSync(binary, 0o755);
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name,
        version: pkg.version,
        description: "Native binary for Charstle on " + target,
        license: pkg.license,
        repository: pkg.repository,
        os: [os],
        cpu: [arch],
        files: ["bin"],
      },
      null,
      2,
    ) + "\n",
  );
  copyFileSync(join(root, "README.md"), join(dir, "README.md"));
  const release = join(
    root,
    "dist",
    "charstle-" +
      pkg.version +
      "-" +
      target +
      (goos === "windows" ? ".exe" : ""),
  );
  copyFileSync(binary, release);
  chmodSync(release, 0o755);
  checksums.push(
    createHash("sha256").update(readFileSync(release)).digest("hex") +
      "  " +
      release.split(/[\\/]/).pop(),
  );
}
writeFileSync(
  join(root, "dist", "SHA256SUMS-" + requested + ".txt"),
  checksums.join("\n") + "\n",
);
console.log("Built native release files and npm platform packages in dist/.");
