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

function parseArguments(argv) {
	const args = argv.slice(2)
	const options = {
		strict: false,
		help: false,
		targets: [],
	}

	for (const entry of args) {
		switch (entry) {
			case "-h":
			case "--help":
				options.help = true
				break
			case "--strict":
				options.strict = true
				break
			default:
				if (entry.startsWith("-")) {
					throw new Error("Unknown option: " + entry)
				}
				options.targets.push(entry)
		}
	}

	if (!options.help) {
		if (options.targets.length === 0) {
			throw new Error("No config file given.")
		}
		if (options.targets.length > 1) {
			throw new Error("Expected a single config file, got: " + options.targets.slice(1).join(", "))
		}
	}

	return options
}

function main(argv) {
	let options
	try {
		options = parseArguments(argv)
	} catch (error) {
		process.stderr.write("validate-config: " + error.message + "\n" + USAGE + "\n")
		return 2
	}

	if (options.help) {
		process.stdout.write(USAGE + "\n")
		return 0
	}

	const target = options.targets[0]

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

	return counts.errors > 0 || (options.strict && counts.advice > 0) ? 1 : 0
}

process.exitCode = main(process.argv)
