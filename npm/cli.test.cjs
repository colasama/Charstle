const test = require("node:test");
const assert = require("node:assert/strict");
const { binaryPath } = require("./cli.cjs");
test("unsupported platforms fail with an actionable message", () => {
  assert.throws(() => binaryPath("freebsd", "x64"), /Unsupported platform/);
});
test("missing optional binary explains how to repair installation", () => {
  assert.throws(
    () => binaryPath("linux", "arm64"),
    /Missing charstle-linux-arm64|native binary is missing/,
  );
});
