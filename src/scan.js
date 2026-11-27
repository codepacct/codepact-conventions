/**
 * Small scanner used by `--init` to find `#[contracterror]` enum names.
 *
 * This is not the analyzer. It only needs to be good enough to produce a starter
 * configuration, so it blanks comments and literals and then looks for an
 * attribute followed by an enum declaration.
 */

const ATTRIBUTE =
	/#\s*\[\s*(?:::\s*)?(?:(?:r#)?[A-Za-z_][A-Za-z0-9_]*\s*::\s*)*contracterror\s*\]/g

function blankComments(source) {
	const out = source.split("")
	const length = source.length
	let i = 0

	const blank = (from, to) => {
		for (let k = from; k < to && k < length; k++) {
			if (out[k] !== "\n") out[k] = " "
		}
	}

	while (i < length) {
		const ch = source[i]

		if (ch === "/" && source[i + 1] === "/") {
			let j = i
			while (j < length && source[j] !== "\n") j++
			blank(i, j)
			i = j
			continue
		}

		if (ch === "/" && source[i + 1] === "*") {
			let depth = 1
			let j = i + 2
			while (j < length && depth > 0) {
				if (source[j] === "/" && source[j + 1] === "*") {
					depth++
					j += 2
					continue
				}
				if (source[j] === "*" && source[j + 1] === "/") {
					depth--
					j += 2
					continue
				}
				j++
			}
			blank(i, j)
			i = j
			continue
		}

		if (ch === "r" || (ch === "b" && source[i + 1] === "r")) {
			const start = ch === "b" ? i + 1 : i
			const previous = i > 0 ? source[i - 1] : " "
			if (!/[A-Za-z0-9_]/.test(previous)) {
				let j = start + 1
				let hashes = 0
				while (source[j] === "#") {
					hashes++
					j++
				}
				if (source[j] === '"') {
					const terminator = '"' + "#".repeat(hashes)
					const end = source.indexOf(terminator, j + 1)
					const stop = end === -1 ? length : end + terminator.length
					blank(i, stop)
					i = stop
					continue
				}
			}
		}

		if (ch === '"') {
			let j = i + 1
			while (j < length) {
				if (source[j] === "\\") {
					j += 2
					continue
				}
				if (source[j] === '"') {
					j++
					break
				}
				j++
			}
			blank(i, j)
			i = j
			continue
		}

		if (ch === "'") {
			const window = source.slice(i, i + 16)
			const match = /^'(\\(?:x[0-9a-fA-F]{2}|u\{[0-9a-fA-F]{1,6}\}|.)|[^\\'])'/.exec(window)
			if (match) {
				blank(i, i + match[0].length)
				i += match[0].length
				continue
			}
		}

		i++
	}

	return out.join("")
}

/**
 * @param {string} source
 * @returns {string[]} Unique enum names, in source order.
 */
function findErrorEnums(source) {
	const clean = blankComments(source)
	const names = []
	const seen = new Set()

	ATTRIBUTE.lastIndex = 0
	let attribute
	while ((attribute = ATTRIBUTE.exec(clean)) !== null) {
		const rest = clean.slice(ATTRIBUTE.lastIndex)
		const match = /\benum\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(rest)
		if (!match) continue
		const name = match[1]
		if (seen.has(name)) continue
		seen.add(name)
		names.push(name)
	}

	return names
}

module.exports = { blankComments, findErrorEnums }
