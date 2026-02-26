# Phase 4: Transaction-Client Linking - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Add an optional Client field to existing income and expense entry forms — Advanced mode only. The field associates a transaction with an existing client; it does not create or modify clients. Simple mode forms remain completely unchanged — no new field, no disabled field, not even a placeholder.

</domain>

<decisions>
## Implementation Decisions

### Client dropdown UX
- Searchable combobox (type to filter), not a plain select dropdown
- Default/empty state: placeholder text only (e.g. "Select a client...") — no explicit "None" option in the list
- When a client is selected, show a clear/× button so the user can deselect without re-opening the dropdown
- When the user has no clients yet: empty combobox list shows a message + a clickable link to /clients/new ("No clients yet — Add one")

### Claude's Discretion
- Where in the form the Client field is positioned (top, bottom, or after the main fields)
- Whether the field is conditionally rendered (hidden in Simple mode) or always present but hidden — either approach is fine as long as Simple mode users never see it
- Exact combobox placeholder wording
- Whether the "Add one" link opens in the same tab or navigates away
- Editing behavior for existing entries (user did not discuss this — Claude decides)
- Whether the client name appears in the income/expense list views (user did not discuss — Claude decides based on what's simplest)

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard combobox patterns that match the existing app style.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-transaction-client-linking*
*Context gathered: 2026-02-24*
