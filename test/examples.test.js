const test = require("node:test")
const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { join } = require("node:path")
const { spawnSync } = require("node:child_process")

const root = join(__dirname, "..")
const cli = require.resolve("../bin/validate-config.js")
const schema = JSON.parse(
	readFileSync(join(root, "schema/codepact.config.schema.json"), "utf8"),
)

function validateAgainstLocalSchema(config) {
	const errors = []
	if (config === null || typeof config !== "object" || Array.isArray(config)) {
		return ["Root value must be a JSON object"]
	}

	const allowedTopKeys = new Set(Object.keys(schema.properties))
	for (const key of Object.keys(config)) {
		if (schema.additionalProperties === false && !allowedTopKeys.has(key)) {
			errors.push(`Unexpected top-level property "${key}"`)
		}
	}

	if (config.$schema !== undefined && typeof config.$schema !== "string") {
		errors.push('"$schema" must be a string')
	}

	if (config.ranges !== undefined) {
		if (config.ranges === null || typeof config.ranges !== "object" || Array.isArray(config.ranges)) {
			errors.push('"ranges" must be an object')
		} else {
			const namePattern = new RegExp(schema.properties.ranges.propertyNames.pattern)
			const itemSpec = schema.properties.ranges.additionalProperties.items
			for (const [name, bounds] of Object.entries(config.ranges)) {
				if (!namePattern.test(name)) {
					errors.push(`Invalid enum name "${name}"`)
				}
				if (!Array.isArray(bounds) || bounds.length !== 2) {
					errors.push(`Range for "${name}" must have exactly 2 items`)
					continue
				}
				for (const bound of bounds) {
					if (!Number.isInteger(bound) || bound < itemSpec.minimum || bound > itemSpec.maximum) {
						errors.push(`Range bound ${JSON.stringify(bound)} for "${name}" is out of u32 range`)
					}
				}
			}
		}
	}

	if (config.ignore !== undefined) {
		if (!Array.isArray(config.ignore)) {
			errors.push('"ignore" must be an array')
		} else {
			const allowedRules = new Set(schema.properties.ignore.items.enum)
			const seen = new Set()
			for (const entry of config.ignore) {
				if (typeof entry !== "string" || !allowedRules.has(entry)) {
					errors.push(`Unknown ignored rule "${entry}" in schema enum`)
				}
				if (seen.has(entry)) {
					errors.push(`Duplicate ignored rule "${entry}"`)
				}
				seen.add(entry)
			}
		}
	}

	return errors
}

function readExample(name) {
	const file = join(root, "examples", name)
	return { file, parsed: JSON.parse(readFileSync(file, "utf8")) }
}

function runValidator(args) {
	return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" })
}

test("valid example satisfies schema and passes strict allocation checks", () => {
	const { file, parsed } = readExample("valid.codepact.config.json")
	assert.deepEqual(validateAgainstLocalSchema(parsed), [])

	const result = runValidator([file, "--strict"])
	assert.equal(result.status, 0, result.stderr)
	assert.match(result.stdout, /conforms to the allocation convention/)
})

test("overlapping example satisfies schema shape but fails allocation validator", () => {
	const { file, parsed } = readExample("overlap.codepact.config.json")
	assert.deepEqual(validateAgainstLocalSchema(parsed), [])

	const result = runValidator([file])
	assert.equal(result.status, 1, result.stderr)
	assert.match(result.stdout, /error: block-overlap \[SPEC rule 4\]/)
})

test("adjacent and spaced gap example satisfies schema and surfaces gapless advice under --strict", () => {
	const { file, parsed } = readExample("adjacent.codepact.config.json")
	assert.deepEqual(validateAgainstLocalSchema(parsed), [])

	const relaxed = runValidator([file])
	assert.equal(relaxed.status, 0, relaxed.stderr)
	assert.match(relaxed.stdout, /advice: gapless-allocation \[SPEC rule 5\]/)

	const strict = runValidator([file, "--strict"])
	assert.equal(strict.status, 1, strict.stderr)
	assert.match(strict.stdout, /0 error\(s\), 1 advisory note\(s\)/)
})

test("invalid example fails schema ignore enum and triggers multi-rule validator errors", () => {
	const { file, parsed } = readExample("invalid.codepact.config.json")
	const schemaErrors = validateAgainstLocalSchema(parsed)
	assert.ok(schemaErrors.some((msg) => msg.includes("nonexistent-rule")))

	const result = runValidator([file])
	assert.equal(result.status, 1, result.stderr)
	assert.match(result.stdout, /reserved-range/)
	assert.match(result.stdout, /block-overlap/)
	assert.match(result.stdout, /gapless-allocation/)
})
