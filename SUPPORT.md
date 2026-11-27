# Support

## Questions and spec discussion

Open a GitHub issue with the `question` label or the `spec` label. Include the
validator version (`node bin/validate-config.js --version`) and the config that
produced the result.

## Bug reports

Use the bug report issue template. A useful report contains:

- the version
- the config file
- the command you ran
- the output you expected and the output you received

## Security reports

Do not open a public issue. Follow [`SECURITY.md`](SECURITY.md).

## Scope

This repository defines an allocation convention and validates configuration
files. It does not analyze Rust source for collisions. Use
[`codepact-core`](https://github.com/codepacct/codepact-core) for that.

## Response expectations

Maintainers aim to reply to new issues within three working days.
