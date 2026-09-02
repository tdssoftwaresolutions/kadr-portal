# Kadr design language

Shared presentation rules for the admin SPA. Prefer tokens and workspace classes over per-view hex colors and duplicated scoped CSS.

## Tokens

Use CSS variables from `tokens.css` (`--kadr-*`). Do not introduce new hardcoded blues or grays in scoped styles.

## Page framing

| Situation | Use |
|-----------|-----|
| Dashboard home | `KadrDashboardHero` / `.hero-card` (welcome + stats) |
| Any other route | `KadrPageHeader` (title + subtitle + actions) |
| Nested `iq-card` for decoration only | Avoid — prefer `.section-card` or one surface |

Do not put a page header and a hero on the same viewport.

## Information hierarchy

```
overview-head / page header
  → quick-info-grid / stats (scannable facts)
  → section-card (one job per section)
  → empty state when no data
```

One job per section: title, one short explainer, one content type.

## Lists

- **Case context:** workspace layout (pills + main + sticky side).
- **Admin comparison at scale:** sortable `b-table` with toolbar; card stacks only on small screens.
- **Messaging:** master–detail inbox pattern.

## Empty states

Always use `KadrEmptyState` (or `.empty-state` / `.empty-box` / `.empty-data` from `_workspace.scss`). Include what happened and what to do next when a CTA exists. Prefer copy from `src/constants/messages.js`.

## Forms

Use `KadrFormField` for label + control + inline error. Reserve the global `Alert` for server/toast feedback, not field validation.
