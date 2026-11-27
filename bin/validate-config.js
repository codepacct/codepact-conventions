#!/usr/bin/env node

/**
 * Validate a codepact.config.json against SPEC.md, or generate a starter file.
 *
 *   node bin/validate-config.js path/to/codepact.config.json [--strict] [--json]
 *   node bin/validate-config.js --init contracts/ [--json]
 *
 * Exit codes: 0 clean, 1 findings, 2 could not run.
 */

const fs = require("node:fs")
const path = require("node:path")

const { validateConfig, summarize } = require("../src/rules.js")
const { findErrorEnums } = require("../src/scan.js")

const VERSION = JSON.parse(
	fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
).version

const USAGE = [
	"Usage: validate-config <config.json> [--strict] [--json]",
	"       validate-config --init <dir> [--json]",
	"",
	"  --strict   Treat advice as failure.",
	"  --json     Emit machine readable JSON.",
	"  --init     Scan a directory for #[contracterror] enums and write",
	"             codepact.config.json in the current directory.",
	"  -v, --version  Print the version.",
	"  -h, --help Show this message.",
].join("\n")

function fail(message) {
	process.stderr.write(message + "\n")
	return 2
}

function collectRustFiles(root) {
	const found = []
	const stack = [root]
	const skipped = new Set([".git", "node_modules", "target", "dist", "build"])

	while (stack.length > 0) {
		const current = stack.pop()
		const stats = fs.statSync(current)
		if (stats.isDirectory()) {
			for (const entry of fs.readdirSync(current)) {
				if (skipped.has(entry)) continue
				stack.push(path.join(current, entry))
			}
			continue
		}
		if (current.endsWith(".rs")) found.push(current)
	}

	return found.sort()
}

function starterRanges(names) {
	const ranges = {}
	let low = 100
	for (const name of names) {
		ranges[name] = [low, low + 99]
		low += 110
	}
	return ranges
}

function init(directory, json) {
	let files
	try {
		files = collectRustFiles(directory)
	} catch (error) {
		return fail('Could not read "' + directory + '": ' + error.message)
	}

	const names = []
	for (const file of files) {
		let source
		try {
			source = fs.readFileSync(file, "utf8")
		} catch (error) {
			return fail('Could not read "' + file + '": ' + error.message)
		}
		for (const name of findErrorEnums(source)) {
			if (!names.includes(name)) names.push(name)
		}
	}

	if (names.length === 0) {
		return fail('No #[contracterror] enums found under "' + directory + '".')
	}

	const target = path.resolve("codepact.config.json")
	if (fs.existsSync(target)) {
		return fail('Refusing to overwrite "' + target + '". Move it first.')
	}

	const config = { ranges: starterRanges(names) }
	fs.writeFileSync(target, JSON.stringify(config, null, 2) + "\n")

	if (json) {
		process.stdout.write(JSON.stringify({ written: target, enums: names, ranges: config.ranges }, null, 2) + "\n")
	} else {
		process.stdout.write("Wrote " + target + " with " + names.length + " block(s).\n")
		for (const name of names) {
			const block = config.ranges[name]
			process.stdout.write("  " + name + " " + block[0] + "-" + block[1] + "\n")
		}
	}
	return 0
}

function main(argv) {
	const args = argv.slice(2)

	if (args.length === 0) {
		process.stderr.write("No config file given.\n" + USAGE + "\n")
		return 2
	}
	if (args.includes("-h") || args.includes("--help")) {
		process.stdout.write(USAGE + "\n")
		return 0
	}
	if (args.includes("-v") || args.includes("--version")) {
		process.stdout.write(VERSION + "\n")
		return 0
	}

	const strict = args.includes("--strict")
	const json = args.includes("--json")
	const initIndex = args.indexOf("--init")
	const known = new Set(["--strict", "--json", "--init"])

	for (const argument of args) {
		if (argument.startsWith("-") && !known.has(argument)) {
			return fail("Unknown option: " + argument + "\n" + USAGE)
		}
	}

	if (initIndex !== -1) {
		const directory = args[initIndex + 1]
		if (!directory || directory.startsWith("-")) {
			return fail("--init requires a directory.\n" + USAGE)
		}
		const positional = args.filter((entry, index) => index !== initIndex && index !== initIndex + 1 && !entry.startsWith("-"))
		if (positional.length > 0) {
			return fail("--init does not accept a config path.\n" + USAGE)
		}
		return init(directory, json)
	}

	const positional = args.filter((entry) => !entry.startsWith("-"))
	if (positional.length === 0) {
		return fail("No config file given.\n" + USAGE)
	}
	if (positional.length > 1) {
		return fail("Expected a single config file.\n" + USAGE)
	}

	const target = positional[0]
	let parsed
	try {
		parsed = JSON.parse(fs.readFileSync(target, "utf8"))
	} catch (error) {
		return fail('Could not read "' + target + '": ' + error.message)
	}

	const findings = validateConfig(parsed)
	const counts = summarize(findings)
	const failed = counts.errors > 0 || (strict && counts.advice > 0)

	if (json) {
		process.stdout.write(
			JSON.stringify({ file: target, findings, summary: counts, strict }, null, 2) + "\n",
		)
	} else {
		for (const entry of findings) {
			const spec = entry.spec === "-" ? "" : " [SPEC rule " + entry.spec + "]"
			process.stdout.write(entry.severity + ": " + entry.rule + spec + "\n  " + entry.message + "\n")
		}

		if (findings.length === 0) {
			process.stdout.write(target + " conforms to the allocation convention.\n")
		} else {
			process.stdout.write(
				"\n" + counts.errors + " error(s), " + counts.advice + " advisory note(s).\n",
			)
		}
	}

	return failed ? 1 : 0
}

process.exitCode = main(process.argv)
