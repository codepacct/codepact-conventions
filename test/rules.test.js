const test = require("node:test")
const assert = require("node:assert/strict")

const { validateConfig, summarize } = require("../src/rules.js")

const rules = (findings) => findings.map((entry) => entry.rule)

test("the reference allocation from the spec validates clean", () => {
	const findings = validateConfig({
		ranges: {
			TokenError: [100, 199],
			RouterError: [200, 299],
			FactoryError: [300, 399],
		},
	})

	assert.deepEqual(findings, [])
})

test("an empty configuration is valid, since ranges are optional", () => {
	assert.deepEqual(validateConfig({}), [])
})

test("overlapping blocks are an error, naming both contracts", () => {
	const findings = validateConfig({
		ranges: { RouterError: [200, 320], FactoryError: [300, 399] },
	})

	assert.deepEqual(rules(findings), ["block-overlap"])
	assert.match(findings[0].message, /RouterError/)
	assert.match(findings[0].message, /FactoryError/)
	assert.equal(findings[0].spec, "4")
})

test("a block touching the reserved range is an error", () => {
	const findings = validateConfig({ ranges: { TokenError: [50, 150] } })

	assert.deepEqual(rules(findings), ["reserved-range"])
	assert.equal(findings[0].spec, "2")
})

test("code 99 is reserved and code 100 is not", () => {
	assert.equal(validateConfig({ ranges: { A: [99, 199] } }).length, 1)
	assert.deepEqual(validateConfig({ ranges: { A: [100, 199] } }), [])
})

test("adjacent blocks with no gap are advice, not an error", () => {
	const findings = validateConfig({
		ranges: { TokenError: [100, 149], RouterError: [150, 199] },
	})

	assert.deepEqual(rules(findings), ["gapless-allocation"])
	assert.equal(findings[0].severity, "advice")
	assert.equal(summarize(findings).errors, 0)
})

test("a block that is exactly one code wide is legal", () => {
	assert.deepEqual(validateConfig({ ranges: { A: [500, 500] } }), [])
})

test("an inverted block is caught rather than silently matching nothing", () => {
	const findings = validateConfig({ ranges: { A: [300, 200] } })

	assert.deepEqual(rules(findings), ["inverted-block"])
})

test("a non-integer bound is rejected", () => {
	assert.deepEqual(rules(validateConfig({ ranges: { A: [100.5, 199] } })), ["malformed"])
	assert.deepEqual(rules(validateConfig({ ranges: { A: ["100", 199] } })), ["malformed"])
})

test("a bound above u32 is rejected", () => {
	assert.deepEqual(rules(validateConfig({ ranges: { A: [100, 4294967296] } })), ["malformed"])
})

test("a three element block is rejected", () => {
	assert.deepEqual(rules(validateConfig({ ranges: { A: [100, 199, 200] } })), ["malformed"])
})

test("a misspelled top-level key is rejected rather than ignored", () => {
	const findings = validateConfig({ range: { A: [100, 199] } })

	assert.deepEqual(rules(findings), ["unknown-key"])
})

test("$schema is allowed, so editors can validate the file", () => {
	assert.deepEqual(validateConfig({ $schema: "./schema.json", ranges: { A: [100, 199] } }), [])
})

test("an unknown rule id in ignore is an error, since it suppresses nothing", () => {
	const findings = validateConfig({ ignore: ["duplicate-discriminants"] })

	assert.deepEqual(rules(findings), ["unknown-rule"])
})

test("suppressing an error-severity rule is allowed but noted", () => {
	const findings = validateConfig({ ignore: ["code-collision"] })

	assert.deepEqual(rules(findings), ["suppressed-error-rule"])
	assert.equal(findings[0].severity, "advice")
})

test("suppressing a warning-severity rule is unremarkable", () => {
	assert.deepEqual(validateConfig({ ignore: ["implicit-discriminant"] }), [])
})

test("a rule listed twice is noted", () => {
	const findings = validateConfig({
		ignore: ["implicit-discriminant", "implicit-discriminant"],
	})

	assert.deepEqual(rules(findings), ["duplicate-ignore"])
})

test("a non-object configuration is reported, not thrown", () => {
	assert.deepEqual(rules(validateConfig([])), ["malformed"])
	assert.deepEqual(rules(validateConfig(null)), ["malformed"])
	assert.deepEqual(rules(validateConfig("{}")), ["malformed"])
})

test("several independent mistakes are all reported in one pass", () => {
	const findings = validateConfig({
		ranges: { A: [10, 99], B: [100, 199], C: [150, 250] },
	})

	assert.ok(rules(findings).includes("reserved-range"))
	assert.ok(rules(findings).includes("block-overlap"))
	assert.equal(summarize(findings).errors, 2)
})
