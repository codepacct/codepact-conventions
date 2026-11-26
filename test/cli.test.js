const test = require("node:test")
const assert = require("node:assert/strict")
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs")
const { tmpdir } = require("node:os")
const { join } = require("node:path")
const { spawnSync } = require("node:child_process")

const cli = require.resolve("../bin/validate-config.js")

function runCli(args) {
	return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" })
}

test("--help prints usage and exits 0", () => {
	for (const flag of ["--help", "-h"]) {
		const result = runCli([flag])
		assert.equal(result.status, 0, result.stderr)
		assert.match(result.stdout, /Usage: validate-config/)
		assert.equal(result.stderr, "")
	}
})

test("missing arguments, unknown flags, and extra positional args exit 2 with usage", () => {
	const missing = runCli([])
	assert.equal(missing.status, 2)
	assert.match(missing.stderr, /No config file given/)
	assert.match(missing.stderr, /Usage: validate-config/)

	const unknownFlag = runCli(["examples/valid.codepact.config.json", "--bogus"])
	assert.equal(unknownFlag.status, 2)
	assert.match(unknownFlag.stderr, /Unknown option: --bogus/)
	assert.match(unknownFlag.stderr, /Usage: validate-config/)

	const extraPositional = runCli([
		"examples/valid.codepact.config.json",
		"examples/invalid.codepact.config.json",
	])
	assert.equal(extraPositional.status, 2)
	assert.match(extraPositional.stderr, /Expected a single config file/)
	assert.match(extraPositional.stderr, /Usage: validate-config/)
})

test("valid config exits 0, advice exits 0 without --strict and 1 with --strict", () => {
	const dir = mkdtempSync(join(tmpdir(), "codepact-conv-"))
	try {
		const cleanFile = join(dir, "clean.json")
		writeFileSync(
			cleanFile,
			JSON.stringify({ ranges: { TokenError: [100, 199], RouterError: [300, 399] } }),
		)
		const clean = runCli([cleanFile, "--strict"])
		assert.equal(clean.status, 0, clean.stderr)
		assert.match(clean.stdout, /conforms to the allocation convention/)

		const adviceFile = join(dir, "advice.json")
		writeFileSync(
			adviceFile,
			JSON.stringify({ ranges: { TokenError: [100, 149], RouterError: [150, 199] } }),
		)
		const nonStrict = runCli([adviceFile])
		assert.equal(nonStrict.status, 0, nonStrict.stderr)
		assert.match(nonStrict.stdout, /advice: gapless-allocation/)

		const strict = runCli([adviceFile, "--strict"])
		assert.equal(strict.status, 1, strict.stderr)
		assert.match(strict.stdout, /0 error\(s\), 1 advisory note\(s\)/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test("error findings exit 1, and malformed JSON or missing files exit 2", () => {
	const dir = mkdtempSync(join(tmpdir(), "codepact-conv-err-"))
	try {
		const errorFile = join(dir, "error.json")
		writeFileSync(errorFile, JSON.stringify({ ranges: { TokenError: [10, 199] } }))
		const failed = runCli([errorFile])
		assert.equal(failed.status, 1, failed.stderr)
		assert.match(failed.stdout, /error: reserved-range/)

		const malformedFile = join(dir, "broken.json")
		writeFileSync(malformedFile, "{ not valid json")
		const malformed = runCli([malformedFile])
		assert.equal(malformed.status, 2)
		assert.match(malformed.stderr, /Could not read/)

		const missingFile = runCli([join(dir, "does-not-exist.json")])
		assert.equal(missingFile.status, 2)
		assert.match(missingFile.stderr, /Could not read/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
