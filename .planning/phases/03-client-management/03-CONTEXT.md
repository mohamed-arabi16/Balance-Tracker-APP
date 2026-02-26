# Phase 3: Client Management - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

CRUD operations for clients in Advanced mode — create, edit, delete, and search clients, plus a client detail page showing linked invoices and transactions. Bulk operations, photo uploads, and advanced filtering are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Client list presentation
- Card grid layout (not table or list rows)
- Card content: Claude's discretion — pick what fits the card design naturally (no strict field requirement specified)
- No avatar or initials badge — text only
- Empty state: illustration + friendly message + Add Client button

### Create & Edit UX
- Dedicated page for both create (/clients/new) and edit (/clients/:id/edit) — not a drawer or modal
- After saving (create or edit), navigate to the client detail page
- Delete available from the card via a ⋯ context menu — no navigation to edit page required
- Required fields: name only — email, phone, company, and notes are all optional

### Claude's Discretion
- Exact card fields displayed (name + company confirmed; additional info like email or invoice count at Claude's discretion)
- Form layout and field order on the create/edit page
- Delete confirmation pattern (dialog wording, etc.)
- Search bar placement and live-vs-submit behavior (user did not discuss search)
- Client detail page layout (user did not discuss this area)

</decisions>

<specifics>
## Specific Ideas

No specific references or "I want it like X" moments — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-client-management*
*Context gathered: 2026-02-24*
