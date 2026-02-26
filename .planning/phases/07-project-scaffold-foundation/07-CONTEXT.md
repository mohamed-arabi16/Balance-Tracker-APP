# Phase 7: Project Scaffold + Foundation - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up the Expo SDK 52 project scaffold, wire Supabase client with polyfills, copy portable logic layer from web, and establish all native UX patterns (safe areas, keyboard avoidance, haptics, RTL, theming, privacy screen, empty states) as architectural decisions before any feature screen is built.

</domain>

<decisions>
## Implementation Decisions

### Language switch UX
- On first launch, detect iOS device language — Arabic devices get Arabic + RTL, everything else gets English
- Language preference stored locally (AsyncStorage) — not synced to Supabase, faster startup, works before login
- When user switches language in Settings, show a persistent banner: "Restart to see changes" — user closes and reopens the app themselves (no forced restart)
- RTL layout applied via I18nManager.forceRTL() on app startup based on stored preference

### Empty state style
- Minimal design with a prominent CTA button — no custom illustrations, clean like Apple's native apps
- Encouraging tone for messages: "Start tracking your income to see it here." rather than "No income yet."
- Every list screen that can be empty gets an empty state with a CTA to add the first item

### Claude's Discretion
- Privacy screen implementation (blur vs solid color vs logo overlay)
- Theme color palette — match web or adapt for iOS conventions
- Dark/light mode system sync + manual override mechanics
- Haptic feedback intensity and which actions get haptics
- Keyboard avoidance library choice
- Project folder structure and how portable layer files are organized
- Safe area implementation details

</decisions>

<specifics>
## Specific Ideas

- Language banner should not be intrusive — persistent but dismissable, not a blocking alert
- Empty states should feel native iOS, not web-ported — follow Apple HIG spacing and typography

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-project-scaffold-foundation*
*Context gathered: 2026-02-26*
