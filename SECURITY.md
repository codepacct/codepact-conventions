# Security Policy

## Scope

This repository contains a specification, a JSON Schema, and a validator that
reads one JSON file. It makes no network calls and has no dependencies.

What is worth reporting:

- A configuration that hangs the validator or exhausts memory.
- A configuration the validator accepts that the spec forbids, or vice versa —
  a **false negative**. Workspaces gate merges on this check, so an allocation
  mistake that slips through can reach a deployed contract, where an error code
  cannot be changed without breaking every integrator.
- Disagreement between the JSON Schema and the validator, in either direction.

## Reporting

Use the **Report a vulnerability** button on the Security tab. Include the
smallest config that reproduces the problem.

Acknowledgement within 72 hours, assessment within 7 days. The report stays
private until a fix is on `main`, and you will be credited unless you prefer
not.
