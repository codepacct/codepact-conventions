#!/usr/bin/env node

/**
 * Validate a codepact.config.json against SPEC.md.
 *
 *   node bin/validate-config.js path/to/codepact.config.json [--strict] [--json]
 *
 * Exit codes: 0 clean, 1 findings, 2 could not run.
 */

const fs = require("node:fs")

const { validateConfig, summarize } = require("../src/rules.js")

const USAGE = [
	"Usage: validate-config <config.json> [--strict] [--json]",
	"",
	"  --strict   Treat advice as failure.",
	"  --json     Emit machine readable JSON instead of text.",
	"  -h, --help Show this message.",
].join("\n")

function parseArguments(argv) {
	const args = argv.slice(2)
	const options = {
		strict: false,
		json: false,
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
			case "--json":
				options.json = true
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
	const failed = counts.errors > 0 || (options.strict && counts.advice > 0)

	if (options.json) {
		process.stdout.write(
			JSON.stringify(
				{
					valid: !failed,
					strict: options.strict,
					summary: {
						errors: counts.errors,
						advice: counts.advice,
					},
					findings,
				},
				null,
				2,
			) + "\n",
		)
		return failed ? 1 : 0
	}

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

	return failed ? 1 : 0
}

process.exitCode = main(process.argv)
