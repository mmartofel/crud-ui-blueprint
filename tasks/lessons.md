# Lessons

Patterns learned from user corrections. Review at session start; add a rule after every correction.

<!-- Format:
## <short title>
- **Mistake:** what went wrong
- **Rule:** what to do instead
-->

## Scope locator replacements to the lines meant
- **Mistake:** a global `sed` renamed every `page.getByRole('dialog')` in `e2e/shell.spec.ts`, including the navigation
  sheet's, and broke an unrelated test.
- **Rule:** when changing a common locator or call, edit the intended occurrences by line (or with Edit), then grep
  for what else matched before running the suite.
