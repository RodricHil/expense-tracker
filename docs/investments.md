# Investments and insurance

The Investments tab is a manual tracker, separate from expense accounting. Match Finex's existing navigation, panels, stat cards, dropdowns, date pickers, confirmation dialogs and theme tokens when extending it.

## Scope

- Types: mutual fund SIPs and lump sums, FD, RD, PPF, EPF, NPS, stocks, ETFs, bonds, gold, real estate, health insurance, life insurance/LIC and other investments.
- Create, edit and delete tracking records. Deleting a record never cancels a policy, sells a holding or withdraws money.
- Search by nickname and filter by type/status. The header currency scopes all records and totals. Summaries cover every matching record, not just the displayed page.
- Store the record's currency at creation; never relabel or silently convert existing amounts. Currency is immutable when editing.
- Total invested excludes insurance. Gain/loss compares current value with invested amounts only for holdings with a supplied current value. Unknown is distinct from zero. Insurance premiums are shown separately.
- Contributions and premiums are informational schedules. They do not automatically increase totals or generate expenses. There is no market-price feed, return projection, payment processing or financial advice.

## Privacy and security requirements

Collect only: nickname, instrument type, status, currency, invested/premiums-paid amount, optional current value, optional recurring amount/frequency, start date and optional maturity/renewal date.

Do not add fields for account, folio or policy numbers; PAN/Aadhaar; dates of birth; medical details; addresses; login information; passwords; API keys; broker/bank credentials; document uploads; or full payment details. Do not add unrestricted notes. Nicknames must not contain sensitive information. Validation rejects obvious long numeric identifiers, PAN-like identifiers and email addresses, but cannot recognize every possible secret entered into free text.

- Every API operation authenticates and scopes its database condition to the immutable session subject. Never authorize by an ID supplied in the body or by email.
- JSON mutations use the shared origin/content-type protection. Strict schemas reject unknown fields, negative/fractional minor units, excessive amounts, invalid IDs and invalid date ranges.
- Store amounts as integer minor units. Responses omit owner identifiers and use private/no-store cache headers.
- Keep search literal, length-bounded and escaped; enforce server pagination. Insurance does not contribute to portfolio valuation/returns.
- No system is unhackable. Do not make security guarantees or claim that labels/amounts are harmless to disclose. Preserve the app's authentication and privacy controls.

## Validation

Unit and route tests cover privacy validation, money/date constraints, authentication, ownership, forged IDs, request origins, literal search, pagination, totals, unknown values and insurance separation. Real browser checks and deployed database behavior require a signed-in environment.
