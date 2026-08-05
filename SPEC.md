# The Codepact error-code allocation convention

Version 0.1. Status: draft.

## The problem this solves

A deployed Soroban contract that rejects a call hands the caller a number.

That number arrives with no contract identity attached. If the router returns
`300` and the factory also returns `300`, an integrator staring at a failed
transaction cannot tell which contract refused, and neither can your own
frontend. The number is the entire error surface of your protocol, and by
default nothing in the toolchain stops two contracts from claiming the same one.

`rustc` will catch two variants of *one* enum sharing a discriminant, as E0081.
It has nothing to say about two different enums in the same workspace, which is
where the damaging collisions actually happen.

This document defines how a workspace allocates codes so that collisions are
structurally impossible rather than caught by luck.

## Terms

- **Code** — the `u32` discriminant of a `#[contracterror]` enum variant.
- **Block** — a contiguous inclusive range of codes reserved for one contract.
- **Registry** — the full set of codes a workspace defines, and their meanings.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as in RFC
2119.

## Rules

### 1. Every variant MUST have an explicit discriminant

```rust
pub enum TokenError {
    NotInitialized = 100,   // correct
    AlreadyInitialized,     // wrong
}
```

An implicit discriminant is assigned by declaration order. Inserting a variant
above it renumbers everything below, silently, with no compiler error and no
diff on the affected lines. Every client already deployed against the old
numbering now misreads your errors.

This is the single most consequential rule in this document. A variant without
an explicit code is a breaking change waiting for an unrelated pull request.

### 2. Codes 0-99 are reserved

A workspace MUST NOT allocate contract error codes below 100. Low numbers
collide with host and SDK conventions and with the reflexive habit of returning
`1` for "something went wrong" from example code and test scaffolding.

### 3. Each contract MUST own exactly one block

One contract, one contiguous block, declared in `codepact.config.json`:

```json
{
  "ranges": {
    "TokenError": [100, 199],
    "RouterError": [200, 299],
    "FactoryError": [300, 399]
  }
}
```

A contract that outgrows its block MUST be given a larger block, not a second
one. Two disjoint blocks for one contract defeats the property that makes this
convention useful: that a reader can infer the origin of a code from its
magnitude alone.

### 4. Blocks MUST NOT overlap

Overlapping blocks make the other rules unenforceable. This is the one rule with
no exceptions and no configuration to disable it.

### 5. Blocks SHOULD be allocated with gaps

Blocks SHOULD be 100 codes wide, aligned to 100, and allocated in order with at
least one empty block between groups of related contracts.

Allocating `[100, 149]` then `[150, 199]` is legal and unwise. The first
contract to add a fiftieth error forces a renumbering, and renumbering a
deployed error code is a breaking change for every integrator.

Codes are free. Gaps cost nothing. Leave them.

### 6. A published code MUST NOT be reused or repurposed

Once a code has shipped to a public network it is part of your API.

- Removing a variant: the code MUST be left unallocated, not backfilled by the
  next variant added.
- Renaming a variant: allowed, the number is the contract.
- Changing what a variant *means*: this is a new code. Deprecate the old one.

The convention is that a code, once published, means one thing forever. A
reserved-but-dead code costs one line of a table. A recycled code costs an
integrator a wrong error message in production, and they will never suspect the
number.

### 7. The registry SHOULD be committed

A generated Markdown table of every code, in the repository, updated by CI.
Integrators need something to read that is not your source tree, and a committed
registry makes a code change visible in review as a diff.

`codepact-action` writes this with `markdown-out`.

## Reference allocation

For a typical AMM-shaped workspace:

| Block | Contract | Notes |
| --- | --- | --- |
| 0-99 | _reserved_ | Host, SDK, scaffolding. Never allocate. |
| 100-199 | Token | |
| 200-299 | Router | |
| 300-399 | Factory | |
| 400-499 | Pair / Pool | |
| 500-599 | _gap_ | Room for a core contract added later. |
| 600-699 | Governance | |
| 700-799 | Staking / Rewards | |
| 800-899 | _gap_ | |
| 900-999 | Shared / library errors | Only if genuinely shared. |

Nothing here is mandatory. The mandatory part is that you write *your* version
down and let CI enforce it.

## Enforcement

| Rule | Enforced by | Severity |
| --- | --- | --- |
| 1. Explicit discriminants | `implicit-discriminant` | warning, error under `strict` |
| 2. Reserved 0-99 | `validate-config` in this repo | error |
| 3. One block per contract | `validate-config` | error |
| 4. No overlap | `validate-config`, `range-overlap` | error |
| 5. Gaps | `validate-config` | advice |
| 6. No reuse | Not automatable. Review, and the committed registry. | — |
| 7. Committed registry | `markdown-out` plus a diff check in CI | — |

Rule 6 is the one that will eventually bite, and no tool can catch it, because
only a human knows whether a meaning changed. This is what the committed
registry is for.

## Changes to this document

The spec is versioned. A change that would make a previously valid workspace
invalid requires a major version bump and a migration note.
