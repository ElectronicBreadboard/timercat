Review my staged and unstaged tracked changes before committing:

**CRITICAL: NEVER stage changes with `git add` and NEVER commit changes with `git commit`. This is a review-only command.**

1. Run `git diff` and `git diff --staged` to see all tracked changes
2. Ignore untracked files. They are not ready for review yet.
3. Read all relevant rules from `.claude/rules/` for each changed file (e.g., `.tsx` files should usually follow both `react.md` and `typescript.md`; `.ts` files should follow `typescript.md`; `.rs` files should follow `rust.md`)
4. For each changed file:
   - Summarize what changed
   - Check for potential issues (bugs, security, performance)
   - Verify it follows the rules in `.claude/rules/`
5. Give me a brief summary:
   - What's good
   - Any concerns or suggestions
   - Ready to commit? (yes/no with reason)
6. Suggest a commit message:
   - Extract issue number from branch name (e.g., `3-focuscat-poc` → `#3`)
   - Format: `#<issue> <short description>`
   - Keep it concise (50 chars or less)

Keep the review concise and actionable.
