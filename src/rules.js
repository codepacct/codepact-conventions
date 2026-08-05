/**
 * Validation of a codepact.config.json against SPEC.md.
 *
 * A JSON Schema can say a block is a two-element array of integers. It cannot
 * say that two blocks overlap, that a block sits inside the reserved range, or
 * that blocks were allocated with no room to grow. Those are the mistakes that
 * actually cause collisions later, so they are checked here.
 *
 * Every finding carries the spec rule it comes from, so the error message can
 * point at the reasoning instead of just asserting.
 */

const RESERVED_MAX = 99
const U32_MAX = 4294967295

const KNOWN_RULES = [
	"duplicate-discriminant",
	"code-collision",
	"range-violation",
	"range-overlap",
	"implicit-discriminant",
]

const ERROR_SEVERITY_RULES = new Set([
	"duplicate-discriminant",
	"code-collision",
	"range-violation",
])

function finding(severity, rule, spec, message) {
	return { severity: severity, rule: rule, spec: spec, message: message }
}

/**
 * @param {unknown} config Parsed contents of a codepact.config.json.
 * @returns {Array<{severity: string, rule: string, spec: string, message: string}>}
 */
function validateConfig(config) {
	const findings = []

	if (config === null || typeof config !== "object" || Array.isArray(config)) {
		return [finding("error", "malformed", "-", "The configuration must be a JSON object.")]
	}

	for (const key of Object.keys(config)) {
		if (key === "ranges" || key === "ignore" || key === "$schema") continue
		findings.push(
			finding(
				"error",
				"unknown-key",
				"-",
				'Unknown top-level key "' +
					key +
					'". A misspelled key is silently ignored by the analyzer, so it is rejected here instead.',
			),
		)
	}

	findings.push(...validateIgnore(config.ignore))

	const blocks = []
	const ranges = config.ranges

	if (ranges !== undefined) {
		if (ranges === null || typeof ranges !== "object" || Array.isArray(ranges)) {
			findings.push(
				finding("error", "malformed", "3", '"ranges" must be an object mapping enum names to blocks.'),
			)
		} else {
			for (const name of Object.keys(ranges)) {
				const block = parseBlock(name, ranges[name], findings)
				if (block) blocks.push(block)
			}
		}
	}

	blocks.sort((a, b) => a.low - b.low)

	for (let i = 0; i < blocks.length; i++) {
		for (let j = i + 1; j < blocks.length; j++) {
			const a = blocks[i]
			const b = blocks[j]
			if (a.high < b.low) continue
			findings.push(
				finding(
					"error",
					"block-overlap",
					"4",
					a.name +
						" owns " +
						a.low +
						"-" +
						a.high +
						" and " +
						b.name +
						" owns " +
						b.low +
						"-" +
						b.high +
						". Overlapping blocks make every other allocation rule unenforceable.",
				),
			)
		}
	}

	for (let i = 1; i < blocks.length; i++) {
		const previous = blocks[i - 1]
		const current = blocks[i]
		if (current.low > previous.high + 1) continue
		if (current.low <= previous.high) continue
		findings.push(
			finding(
				"advice",
				"gapless-allocation",
				"5",
				previous.name +
					" ends at " +
					previous.high +
					" and " +
					current.name +
					" begins at " +
					current.low +
					" with no gap. The first contract to outgrow its block will force a renumbering, " +
					"and renumbering a published code is a breaking change.",
			),
		)
	}

	return findings
}

function parseBlock(name, value, findings) {
	if (!Array.isArray(value) || value.length !== 2) {
		findings.push(
			finding(
				"error",
				"malformed",
				"3",
				name + " must be a two element array of the form [low, high].",
			),
		)
		return null
	}

	const low = value[0]
	const high = value[1]

	for (const bound of [low, high]) {
		if (!Number.isInteger(bound) || bound < 0 || bound > U32_MAX) {
			findings.push(
				finding(
					"error",
					"malformed",
					"3",
					name + " has bound " + JSON.stringify(bound) + ", which is not a u32 integer.",
				),
			)
			return null
		}
	}

	if (low > high) {
		findings.push(
			finding(
				"error",
				"inverted-block",
				"3",
				name + " declares " + low + "-" + high + ", which is inverted. Blocks are [low, high].",
			),
		)
		return null
	}

	if (low <= RESERVED_MAX) {
		findings.push(
			finding(
				"error",
				"reserved-range",
				"2",
				name +
					" begins at " +
					low +
					", inside the reserved 0-" +
					RESERVED_MAX +
					" block. Low numbers collide with host and SDK conventions and with scaffolding " +
					"that returns 1 for any failure.",
			),
		)
	}

	return { name: name, low: low, high: high }
}

function validateIgnore(ignore) {
	if (ignore === undefined) return []

	if (!Array.isArray(ignore)) {
		return [finding("error", "malformed", "-", '"ignore" must be an array of rule ids.')]
	}

	const findings = []
	const seen = new Set()

	for (const entry of ignore) {
		if (typeof entry !== "string") {
			findings.push(
				finding("error", "malformed", "-", "Every entry of \"ignore\" must be a rule id string."),
			)
			continue
		}

		if (!KNOWN_RULES.includes(entry)) {
			findings.push(
				finding(
					"error",
					"unknown-rule",
					"-",
					'"' +
						entry +
						'" is not a known rule id. An ignore entry that matches nothing looks like \
						suppression but silently does nothing. Known ids: ' +
						KNOWN_RULES.join(", ") +
						".",
				),
			)
			continue
		}

		if (seen.has(entry)) {
			findings.push(
				finding("advice", "duplicate-ignore", "-", '"' + entry + '" is listed more than once.'),
			)
		}
		seen.add(entry)

		if (ERROR_SEVERITY_RULES.has(entry)) {
			findings.push(
				finding(
					"advice",
					"suppressed-error-rule",
					"-",
					'"' +
						entry +
						'" reports genuine collisions rather than style. Suppressing it workspace-wide \
						hides the exact class of bug this tooling exists to catch.',
				),
			)
		}
	}

	return findings
}

function summarize(findings) {
	return {
		errors: findings.filter((entry) => entry.severity === "error").length,
		advice: findings.filter((entry) => entry.severity === "advice").length,
	}
}

module.exports = {
	validateConfig,
	summarize,
	KNOWN_RULES,
	RESERVED_MAX,
}
