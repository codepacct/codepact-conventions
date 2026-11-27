# Example configurations

Each file demonstrates the boundary between JSON Schema shape checks and allocation checks:

| File | Schema valid | Default validator (`exit`) | `--strict` (`exit`) | What it demonstrates |
| --- | --- | --- | --- | --- |
| [`valid.codepact.config.json`](valid.codepact.config.json) | Yes | Clean (`0`) | Clean (`0`) | Disjoint 100-code blocks with reserved gaps for growth. |
| [`adjacent.codepact.config.json`](adjacent.codepact.config.json) | Yes | Advice (`0`) | Fails (`1`) | Back-to-back blocks (`[100, 149]` and `[150, 199]`) leave no room to grow (`gapless-allocation`), plus a spaced gap before `[300, 399]`. |
| [`overlap.codepact.config.json`](overlap.codepact.config.json) | Yes | Fails (`1`) | Fails (`1`) | Valid JSON Schema types/ranges (`[200, 320]` and `[300, 399]`), rejected by allocation check (`block-overlap`). |
| [`invalid.codepact.config.json`](invalid.codepact.config.json) | No (`ignore` includes unknown rule) | Fails (`1`) | Fails (`1`) | Multiple violations together: reserved range, overlapping blocks, gapless blocks, suppressed error rule, and unknown rule ID. |

Run all schema and validator checks locally without network access:

```bash
npm test
npm run check:valid
```
