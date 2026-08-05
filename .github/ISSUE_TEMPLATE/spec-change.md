---
name: Spec change
about: Argue with a rule in SPEC.md
title: 'spec: '
labels: spec
---

**Which rule**

SPEC.md rule number and its current wording.

**The workspace it does not fit**

A real repository layout, ideally a public one, that the rule breaks or makes
awkward. Concrete beats hypothetical.

**Proposed wording**

What the rule should say instead.

**Who this invalidates**

Would a workspace that is valid today become invalid? If so, this needs a major
version bump and a migration note.

**Enforcement**

What would check the new rule, and at what severity? A rule nothing can enforce
is allowed, but it must say so.
