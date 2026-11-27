# Roadmap

## 0.2.0: a usable allocation workflow

- [x] JSON output for the validator
- [x] Starter config generation from existing enums
- [x] Explicit CLI argument parsing and exit code tests
- [ ] Compare a config with the enums that actually exist
- [ ] Report enum names in the config that no source file defines
- [ ] Add a `--check` mode for CI that combines both checks

## 0.3.0: shared error types

- [ ] Resolve spec rule 3 for enums shared by more than one contract
- [ ] Document a shared-error allocation pattern with examples
- [ ] Add a test for a workspace with two contracts using one enum

## 0.4.0: registry and releases

- [ ] Document a committed registry check for CI
- [ ] Publish versioned releases of the spec
- [ ] Add a migration guide for a major spec change
- [ ] Link the schema from the Codepact organisation profile

## Later

- Generate a human readable allocation table from the config
- Validate that a block has enough free codes for the next release
- Offer a machine readable allocation report
