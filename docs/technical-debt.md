# 😬 Technical Debt

## ESLint v9 Lock-in

We pin ESLint to v9 and exclude it from `update:latest` because **eslint-plugin-react** does not yet support ESLint 10. Upgrading to ESLint 10 causes:

```
TypeError: Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function
```

ESLint 10 changed the rule context API; the React plugin still relies on the old `getFilename` API.

### Current state

- **Pinned:** `eslint@^9.39.2`, `@eslint/js@^9.39.2`
- **Excluded from update:latest** (this repo and `@blgc/config`):
  - `eslint`
  - `@eslint/js`

### When to revisit

- When [eslint-plugin-react supports ESLint 10](https://github.com/jsx-eslint/eslint-plugin-react/issues/3977), remove the version pin and the `update:latest` exclusions, then upgrade to ESLint 10.
