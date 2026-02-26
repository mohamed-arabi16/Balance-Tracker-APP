/**
 * income-form.tsx
 *
 * Re-export of the income add/edit form screen.
 * The form implementation lives in add-income.tsx (Phase 9 named it so).
 * This file satisfies the Phase 11 artifact contract and can be used
 * as an alternative route entry-point in future phases.
 *
 * Features:
 * - Title, amount, currency, category, status, date fields
 * - Optional client picker (visible only when isAdvanced is true)
 * - Edit mode pre-population via ?id= search param
 * - client_id included in mutation payload (null when no client selected or in Simple mode)
 */
export { default } from './add-income';
