# Project Rules & Guidelines ("Meri Dukan" / Anshika Enterprises)

## Protocol: Single Source of Truth (`CONTEXT.md`)
1. **Always Read CONTEXT.md First:**
   - At the beginning of any session or new task prompt, inspect and read `CONTEXT.md` in the root directory.
   - Do not scan the entire repository repeatedly unless you need to examine a specific implementation file.
2. **Mandatory Updates on Every Change:**
   - Whenever any file is added, edited, or deleted (e.g. features, bug fixes, refactoring, migrations, new routes, UI updates), `CONTEXT.md` must be updated within the same task.
   - Maintain the Changelog with date, summary of changes, and list of files modified.
3. **Code is Ground Truth:**
   - If `CONTEXT.md` contradicts the active code, the code is assumed to be correct and `CONTEXT.md` must be updated immediately.
4. **Zero-Leak Staff Shielding:**
   - Staff role must NEVER see profit numbers, purchase/cost prices, margins, or valuation data across API responses or UI screens.
