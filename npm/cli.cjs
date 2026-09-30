#!/usr/bin/env node
"use strict";
const { spawn } = require("node:child_process");
const { join, dirname } = require("node:path");
const { existsSync } = require("node:fs");

function binaryPath(platform = process.platform, arch = process.arch) {
  const supported = [
    "win32-x64",
    "win32-arm64",
    "darwin-x64",
    "darwin-arm64",
    "linux-x64",
    "linux-arm64",
  ];
  const target = platform + "-" + arch;
  if (!supported.includes(target))
    throw new Error(
      "Unsupported platform: " + target + ". Build Charstle from source.",
    );
  const pkg = "charstle-" + target;
  let manifest;
  try {
    manifest = require.resolve(pkg + "/package.json");
  } catch {
    throw new Error(
      "Missing " +
        pkg +
        ". Reinstall with optional dependencies enabled (npm --include=optional).",
    );
  }
  const path = join(
    dirname(manifest),
    "bin",
    platform === "win32" ? "charstle.exe" : "charstle",
  );
  if (!existsSync(path))
    throw new Error(
      "The native binary is missing from " + pkg + ". Reinstall the package.",
    );
  return path;
}
function main(args = process.argv.slice(2)) {
  let binary;
  try {
    binary = binaryPath();
  } catch (error) {
    console.error("Charstle: " + error.message);
    process.exitCode = 1;
    return;
  }
  const child = spawn(binary, args, { stdio: "inherit", windowsHide: true });
  const forward = (signal) => {
    // Windows console Ctrl+C reaches the Go child directly. child.kill would terminate it
    // without allowing the deferred system-proxy restoration to run.
    if (process.platform !== "win32") child.kill(signal);
  };
  const sigint = () => forward("SIGINT");
  const sigterm = () => forward("SIGTERM");
  process.on("SIGINT", sigint);
  process.on("SIGTERM", sigterm);
  child.on("error", (error) => {
    console.error("Charstle: " + error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.removeListener("SIGINT", sigint);
    process.removeListener("SIGTERM", sigterm);
    process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
  });
}
if (require.main === module) main();
module.exports = { binaryPath };
