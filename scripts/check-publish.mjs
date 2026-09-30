import { readFileSync, existsSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
for (const [name, version] of Object.entries(pkg.optionalDependencies)) {
  if (version !== pkg.version)
    throw Error(name + " must use version " + pkg.version);
  if (!existsSync("dist/npm/" + name + "/bin"))
    throw Error(
      "Build all platform packages before publishing: npm run build:release",
    );
  const platform = JSON.parse(readFileSync("dist/npm/" + name + "/package.json", "utf8"));
  if (platform.name !== name || platform.version !== pkg.version)
    throw Error(name + " contains a stale build; rebuild all platforms.");
  const binary = "dist/npm/" + name + "/bin/charstle" + (name.includes("win32") ? ".exe" : "");
  if (!existsSync(binary)) throw Error("Missing binary: " + binary);
}
console.log(
  "Publish the six dist/npm platform packages at this version before publishing charstle.",
);
