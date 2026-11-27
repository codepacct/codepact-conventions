const test = require("node:test")
const assert = require("node:assert/strict")
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs")
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

test("--json returns findings and a summary", () => {
	const dir = mkdtempSync(join(tmpdir(), "codepact-conv-json-"))
	try {
		const file = join(dir, "config.json")
		writeFileSync(file, JSON.stringify({ ranges: { TokenError: [10, 199] } }))
		const result = runCli([file, "--json"])
		assert.equal(result.status, 1, result.stderr)
		const report = JSON.parse(result.stdout)
		assert.equal(report.file, file)
		assert.equal(report.summary.errors, 1)
		assert.equal(report.findings[0].rule, "reserved-range")
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test("--init writes a starter config and refuses to overwrite it", () => {
	const dir = mkdtempSync(join(tmpdir(), "codepact-conv-init-"))
	const previous = process.cwd()
	try {
		const contracts = join(dir, "contracts")
		mkdirSync(contracts)
		writeFileSync(
			join(contracts, "token.rs"),
			"#[contracterror]\npub enum TokenError { NotInit = 100 }\n",
		)
		writeFileSync(
			join(contracts, "router.rs"),
			"// #[contracterror]\n#[soroban_sdk::contracterror]\npub enum RouterError { Bad = 200 }\n",
		)
		process.chdir(dir)
		const first = runCli(["--init", contracts, "--json"])
		assert.equal(first.status, 0, first.stderr)
		const report = JSON.parse(first.stdout)
		assert.deepEqual(report.enums, ["RouterError", "TokenError"])
		assert.deepEqual(report.ranges.RouterError, [100, 199])
		assert.deepEqual(report.ranges.TokenError, [210, 309])
		assert.ok(existsSync(join(dir, "codepact.config.json")))

		const config = JSON.parse(readFileSync(join(dir, "codepact.config.json"), "utf8"))
		assert.deepEqual(Object.keys(config.ranges), ["RouterError", "TokenError"])

		const second = runCli(["--init", contracts])
		assert.equal(second.status, 2)
		assert.match(second.stderr, /Refusing to overwrite/)
	} finally {
		process.chdir(previous)
		rmSync(dir, { recursive: true, force: true })
	}
})

test("--init reports a directory with no error enums", () => {
	const dir = mkdtempSync(join(tmpdir(), "codepact-conv-empty-"))
	const previous = process.cwd()
	try {
		process.chdir(dir)
		const result = runCli(["--init", dir])
		assert.equal(result.status, 2)
		assert.match(result.stderr, /No #\[contracterror\] enums found/)
	} finally {
		process.chdir(previous)
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
