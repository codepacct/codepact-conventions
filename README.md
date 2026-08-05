<p align="center">
  <img src="https://raw.githubusercontent.com/codepacct/codepact-core/main/assets/codepact-banner.svg" alt="Codepact" width="860">
</p>

# Codepact Conventions

The written convention behind the tooling: how a Soroban workspace should
allocate error codes so that collisions are structurally impossible instead of
caught by luck.

- **[SPEC.md](SPEC.md)** — seven rules, with the reasoning for each.
- **[schema/codepact.config.schema.json](schema/codepact.config.schema.json)** —
  JSON Schema for `codepact.config.json`, so your editor completes and validates
  it as you type.
- **`bin/validate-config.js`** — checks the things a schema cannot express.

## Why a separate repository

[`codepact-core`](https://github.com/codepacct/codepact-core) answers *"do two
codes collide?"* That is a question about the code you already wrote.

This repository answers the earlier question: *"which contract should own this
code in the first place?"* That is an allocation decision, and no analyzer can
make it for you. It has to be written down before a tool can enforce it.

## Use the schema

Add one line to your config and your editor will validate it:

```json
{
  "$schema": "https://raw.githubusercontent.com/codepacct/codepact-conventions/main/schema/codepact.config.schema.json",
  "ranges": {
    "TokenError": [100, 199],
    "RouterError": [200, 299]
  }
}
```

## Validate the allocation itself

```bash
node bin/validate-config.js codepact.config.json --strict
```

A JSON Schema can say a block is two integers. It cannot say that two blocks
overlap, that a block sits in the reserved `0-99` range, or that you allocated
`[100,149]` and `[150,199]` back to back and left the first contract nowhere to
grow. Those are the mistakes that cause a collision six months later, so they
are checked here.

```
error: reserved-range [SPEC rule 2]
  ScaffoldError begins at 1, inside the reserved 0-99 block.
error: block-overlap [SPEC rule 4]
  RouterError owns 200-320 and FactoryError owns 300-399.
advice: gapless-allocation [SPEC rule 5]
  PairError ends at 449 and StakingError begins at 450 with no gap.
```

Exit codes: `0` clean, `1` findings, `2` could not run.

## The rule no tool can enforce

Spec rule 6: a published code must never be reused or repurposed. Renaming a
variant is fine, the number is the contract. Changing what a variant *means* is
a new code.

No analyzer can catch that, because only a human knows whether a meaning
changed. This is why rule 7 asks you to commit the generated registry: it turns
a silent semantic change into a visible diff in review.

## Related

- [`codepact-core`](https://github.com/codepacct/codepact-core) — the analyzer.
- [`codepact-action`](https://github.com/codepacct/codepact-action) — enforcement
  in CI, annotated on the diff.

## Contributing

The spec is a draft and disagreement is useful — particularly on the reserved
range and the reference allocation. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
