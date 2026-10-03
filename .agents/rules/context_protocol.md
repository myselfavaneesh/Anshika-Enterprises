# Context Protocol & Memory Rule

This rule is mandatory across all interactions and sessions on this repository ("Meri Dukan" / Anshika Enterprises).

## 1. Always Read CONTEXT.md First
- On every new prompt, first inspect and read `CONTEXT.md` in the project root to establish current architecture, database schema, active features, and open items.
- Read specific project files only when needed for targeted execution. Do not redundantly re-scan the entire codebase if `CONTEXT.md` already specifies the architecture.

## 2. Mandatory Update Rule
- After **every** code change (feature implementation, bug fix, refactor, Prisma migration, new endpoint, schema change, or UI update), `CONTEXT.md` **MUST** be updated in that same task before completing.
- Add an entry to the `## Changelog` section with:
  - Date
  - Summary of what changed
  - Affected files list
- Keep the Prisma schema summary, API routes table, and component registry synchronized.

## 3. Code is the Ground Truth
- If there is any discrepancy between `CONTEXT.md` and the actual codebase, treat the running code as ground truth and immediately correct `CONTEXT.md` to reflect the reality.
