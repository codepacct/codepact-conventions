#!/usr/bin/env node

/**
 * Validate a codepact.config.json against SPEC.md.
 *
 *   node bin/validate-config.js path/to/codepact.config.json [--strict]
 *
 * Exit codes: 0 clean, 1 findings, 2 could not run.
 */

const fs = require("node:fs")

const { validateConfig, summarize } = require("../src/rules.js")

const USAGE = [
	"Usage: validate-config <config.json> [--strict]",
	"",
	"  --strict   Treat advice as failure.",
	"  -h, --help Show this message.",
].join("\n")

function main(argv) {
	const args = argv.slice(2)

	if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
		process.stdout.write(USAGE + "\n")
		return args.length === 0 ? 2 : 0
	}

	const strict = args.includes("--strict")
	const target = args.find((entry) => !entry.startsWith("-"))

	if (!target) {
		process.stderr.write("No config file given.\n" + USAGE + "\n")
		return 2
	}

	let parsed
	try {
		parsed = JSON.parse(fs.readFileSync(target, "utf8"))
	} catch (error) {
		process.stderr.write('Could not read "' + target + '": ' + error.message + "\n")
		return 2
	}

	const findings = validateConfig(parsed)
	const counts = summarize(findings)

	for (const entry of findings) {
		const spec = entry.spec === "-" ? "" : " [SPEC rule " + entry.spec + "]"
		process.stdout.write(entry.severity + ": " + entry.rule + spec + "\n  " + entry.message + "\n")
	}

	if (findings.length === 0) {
		process.stdout.write(target + " conforms to the allocation convention.\n")
		return 0
	}

	process.stdout.write(
		"\n" + counts.errors + " error(s), " + counts.advice + " advisory note(s).\n",
	)

	return counts.errors > 0 || (strict && counts.advice > 0) ? 1 : 0
}

process.exitCode = main(process.argv)
