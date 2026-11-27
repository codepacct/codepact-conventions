const test = require("node:test")
const assert = require("node:assert/strict")

const { findErrorEnums } = require("../src/scan.js")

test("finds bare and qualified contracterror enums", () => {
	const source = [
		"#[contracterror]",
		"pub enum TokenError { NotInit = 100 }",
		"#[soroban_sdk::contracterror]",
		"enum RouterError { Bad = 200 }",
	].join("\n")
	assert.deepEqual(findErrorEnums(source), ["TokenError", "RouterError"])
})

test("ignores commented and quoted attributes", () => {
	const source = [
		"// #[contracterror]",
		"// enum Commented { A = 1 }",
		"const TEXT: &str = \"#[contracterror] enum Quoted { A = 1 }\";",
		"#[contracterror]",
		"enum Real { A = 100 }",
	].join("\n")
	assert.deepEqual(findErrorEnums(source), ["Real"])
})

test("deduplicates repeated enum names", () => {
	const source = [
		"#[contracterror]",
		"enum Same { A = 100 }",
		"#[contracterror]",
		"enum Same { B = 101 }",
	].join("\n")
	assert.deepEqual(findErrorEnums(source), ["Same"])
})

test("returns an empty list when there is no attribute", () => {
	assert.deepEqual(findErrorEnums("pub enum Plain { A = 1 }"), [])
})
