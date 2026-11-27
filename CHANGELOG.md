# Changelog

## [Unreleased]

### Added

- `--json` output for the configuration validator.
- `--init <dir>` generates a starter `codepact.config.json` from the
  `#[contracterror]` enums found under a directory.
- `--version` and `-v`.
- `docs/EXAMPLES.md` with allocation patterns for single-contract, AMM-shaped,
  shared-error and migration cases.
- Repository governance files, issue templates and pull request template.

### Changed

- The validator has explicit argument parsing and a single usage message.
- The README now documents JSON output, starter config generation and the
  migration path.

## [0.1.0] - 2026-08-05

### Added

- The seven-rule allocation specification.
- JSON Schema for `codepact.config.json`.
- Validator for reserved ranges, overlapping blocks, gapless allocations,
  inverted blocks and unknown rule ids.
- MIT license.
