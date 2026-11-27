# Examples

These are starting points, not rules. The mandatory part is that a workspace
writes its allocation down and lets CI enforce it.

## A single contract

```json
{
  "ranges": {
    "TokenError": [100, 199]
  }
}
```

The reserved `0-99` block is untouched. The contract has 100 codes, which is
usually enough for a first release.

## An AMM-shaped workspace

```json
{
  "ranges": {
    "TokenError": [100, 199],
    "RouterError": [210, 309],
    "FactoryError": [320, 419],
    "PairError": [430, 529],
    "GovernanceError": [650, 749]
  }
}
```

The 10 code gaps between blocks let a contract grow without renumbering a
published code. The empty 540-649 range is deliberate room for a core contract
added later.

## Shared error types

A shared enum used by more than one contract breaks the "one block per contract"
assumption. Give the shared enum its own block and treat it as a contract for
allocation purposes:

```json
{
  "ranges": {
    "SharedError": [900, 999],
    "TokenError": [100, 199],
    "RouterError": [210, 309]
  }
}
```

Document which contracts use the shared enum. A reader should be able to infer
the origin of a code from its magnitude alone.

## Migrating an existing workspace

1. Run `node bin/validate-config.js --init contracts/` to get a draft.
2. Move any block that starts below 100.
3. Merge or rename enums that share a block.
4. Add gaps where blocks touch.
5. Commit the config and run the validator with `--strict`.
6. Add `codepact-core` and `codepact-action` to CI.

Do not renumber a code that has shipped to a public network. If the existing
numbers cannot be changed, record them as they are and use a reviewed baseline
in `codepact-core` until the next breaking release.
