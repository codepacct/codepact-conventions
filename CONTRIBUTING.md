# Contributing to Codepact Conventions

Node.js 20 and a clone. No install step.

```bash
npm test
npm run check:valid
npm run check:invalid
```

## Changing the spec

`SPEC.md` is a draft and arguing with it is the most useful contribution you can
make, especially if you maintain a real Soroban workspace that the convention
would not fit.

When proposing a change:

1. **Open an issue before a pull request.** A spec change is a discussion, not a
   patch.
2. **Say which rule and give a real workspace it breaks.** "This is unnecessary"
   is not actionable. "Our workspace has one enum shared by four contracts, so
   rule 3 cannot hold" is.
3. **A change that invalidates a previously valid workspace needs a major
   version bump and a migration note.** People will have committed configs.
4. **Update the enforcement table.** Every rule states what enforces it. A rule
   nothing enforces should say so plainly rather than pretending.

## Changing the validator

- Every finding carries the spec rule number it comes from. A finding with no
  rule behind it means either the spec is missing something or the check should
  not exist.
- **Severity is not a matter of taste.** `error` means the allocation is
  unworkable. `advice` means it will hurt later. Rule 5 gaps are advice because
  a gapless allocation is legal, just unwise.
- Add a case to `test/rules.test.js` for every new finding, and one asserting a
  valid config still produces nothing.
- No dependencies.

## Changing the schema

The schema and the validator must agree. If the schema starts accepting
something the validator rejects, the editor tells contributors one thing and CI
tells them another. That is worse than having no schema.

## Every change lands through a pull request

Including the maintainer's own.
