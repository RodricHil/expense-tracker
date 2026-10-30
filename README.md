<div align="center">
  <img src="public/brand-mark.svg" width="72" height="72" alt="Finex logo" />
  <h1>Finex</h1>
  <p><strong>Expenses, investments, and insurance. One clear view.</strong></p>
  <p>A personal finance tracker with shared filters, spending insights, refunds,<br />private receipt scanning, and simple investment tracking.</p>
  <p>
    <a href="https://finex-tracker.vercel.app"><strong>Open Finex</strong></a>
    &nbsp;·&nbsp;
    <a href="#run-locally">Run locally</a>
    &nbsp;·&nbsp;
    <a href="#privacy--security">Privacy &amp; security</a>
    &nbsp;·&nbsp;
    <a href="docs/investments.md">Investment guide</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-16-111827?style=flat-square&amp;logo=nextdotjs" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-111827?style=flat-square&amp;logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/MongoDB-116149?style=flat-square&amp;logo=mongodb&amp;logoColor=white" alt="MongoDB" />
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-116149?style=flat-square" alt="MIT license" /></a>
  </p>
</div>

---

## At a glance

| Expenses | Analytics | Investments | Settings |
| :--- | :--- | :--- | :--- |
| Purchases, payments, receipts, and refunds | Spending trends, categories, payment methods, and net spending | Holdings, contributions, valuations, and insurance | Debit/credit cards, personal categories, UPI apps, and preferences |

### Track everyday spending

- Add, edit, and delete expenses with merchant, platform, and payment details.
- Filter by **date range, payment method/card, and category**. Summary cards and transactions follow the same selection.
- Record cash, online card, UPI, and direct card payments, including Visa, Mastercard, RuPay, and supported funding sources.
- Manage personal categories and UPI apps. Archived categories retain their labels on historical purchases.
- Record full or partial refunds with dates and sources, while preserving the original purchase amount.

### Understand your money

- Explore daily, weekly, monthly, and yearly spending charts.
- Compare categories and payment methods with labelled proportion bars.
- View refunds, net spending, and daily averages across every calendar day in a selected range.
- Use light, dark, or system appearance across responsive desktop and mobile layouts.

### Keep investments simple

Track **SIPs, mutual funds, FD/RD, PPF, EPF, NPS, stocks, ETFs, bonds, gold, real estate, health insurance, life insurance/LIC, and other investments**.

- Add a nickname, amounts, status, start date, and optional maturity/renewal date.
- Search by nickname and filter by type, status, and currency, with paginated results.
- See total invested, current value, gain/loss, and insurance premiums separately.
- Leave unknown valuations blank; they are excluded from gain/loss calculations.
- Record recurring contribution or premium details without connecting financial accounts.

> Investments are tracked manually and separately from Expenses. Contributions do not automatically create payments or increase totals. No live prices, trading, or return forecasts are provided.

## Run locally

**Requirements:** Node.js **24+**, npm **12+**, a MongoDB database, and a Google OAuth client. The repository includes an `.nvmrc` for Node setup.

### 1. Install

```bash
git clone https://github.com/RodricHil/expense-tracker.git
cd expense-tracker
npm ci
```

### 2. Configure your environment

Create `.env.local` in the project root:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/finex
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-random-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

Use your MongoDB Atlas connection string instead of the local URI if applicable. Generate a secret with:

```bash
openssl rand -base64 32
```

In your Google OAuth configuration, register:

| Setting | Local value |
| :--- | :--- |
| Authorized JavaScript origin | `http://localhost:3000` |
| Authorized redirect URI | `http://localhost:3000/api/auth/callback/google` |

If the OAuth app is in testing mode, add your Google account as a test user. Keep `.env.local` and all credentials out of version control.

### 3. Start Finex

```bash
npm run dev
```

Open **[localhost:3000](http://localhost:3000)** and sign in with Google.

The `predev` and `prebuild` scripts prepare the local OCR/PDF worker assets automatically.

## Pages

| Route | Purpose |
| :--- | :--- |
| `/dashboard` | Expense filters, summary cards, and transactions |
| `/analytics` | Spending charts, category/payment breakdowns, and refund summary |
| `/investments` | Manual investment and insurance tracking |
| `/settings` | Preferences, debit/credit cards, categories, and UPI apps |
| `/categories` | Dedicated personal category manager |
| `/add-expenses` | Standalone expense entry |

## Privacy & security

Finex minimizes what it asks you to enter:

- **Cards:** nickname, type, network, and last four digits. No full card numbers, CVV, PIN, OTP, or expiry dates.
- **Investments and insurance:** tracking details only. No account, folio, policy, PAN/Aadhaar numbers, medical details, or credentials. Avoid sensitive information in nicknames.
- **Receipts:** files are processed in browser memory, not uploaded. Only the reviewed expense details you save are sent to the server.

Protected APIs authenticate requests and scope database operations to the signed-in owner. Runtime schemas validate input; mutation routes check request origin and JSON content type. Investment amounts and refunds use integer minor units. Security headers are configured centrally; CSP is currently **report-only**.

<details>
<summary><strong>Receipt scanning: formats and limits</strong></summary>

Choose **Scan receipt** in the Add expense dialog. English OCR suggests merchant, description, a labelled total, and an unambiguous date. Review and correct the fields, then confirm the review before saving. Scanning alone never creates an expense.

- Formats: PDF, JPG, PNG, and WebP.
- Limits: **10 MB**, **5 PDF pages**, and **25 megapixels** for images.
- OCR/PDF workers, fonts, decoders, and the English model are served from this app, without a third-party receipt API or CDN.
- Asset details and third-party licenses live in [`public/receipt-assets`](public/receipt-assets/README.md).

</details>

<details>
<summary><strong>Refunds, currencies, and historical records</strong></summary>

**Refunds:** Refunds belong to their original purchase. Date filters attribute refund/net figures to the purchase date, even if the refund arrived later. Charts show original purchase amounts. Atomic database conditions prevent cumulative refunds exceeding a purchase, and edits cannot reduce the purchase below its recorded refunds.

**Currencies:** Expense currency selection is a display preference and does not convert amounts. Investment records retain their original currency; changing the header currency filters those records instead of relabelling them. Editing cannot change an investment's currency.

**Categories:** Imported legacy and personal category keys are combined when filtering their corresponding category. Category deletion archives the option rather than erasing historical labels.

**Identity:** Accounts use immutable Google subjects. Existing verified subject bindings preserve access to historical records; sign-in migrates their email-owned expense rows to that subject. Unbound legacy accounts or conflicting identity bindings require verified recovery rather than automatic email linking. Old sessions without a subject must sign in again.

</details>

## Development

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Check TypeScript |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage reports |
| `npm run build` | Build for production |
| `npm start` | Serve the production build |

Tests cover ownership boundaries, authentication, mutation origins, input validation, refunds, category matching, investment privacy, money precision, date ranges, and chart grouping. They mock database/authentication boundaries; signed-in browser flows and deployment configuration need separate verification.

### Project layout

```text
app/
├── dashboard/       Expense summaries and transactions
├── analytics/       Charts and spending breakdowns
├── investments/     Investment/insurance page and form
├── settings/        Preferences and saved-card management
├── categories/      Personal category manager
├── components/      Shared navigation, filters, dialogs, and providers
└── api/             Authenticated API route handlers
lib/                 Validation, queries, identity, money, and date helpers
models/              Mongoose schemas
tests/               Unit and API regression tests
docs/                Feature behavior and privacy requirements
public/              Brand assets and local receipt-scanning resources
proxy.ts             Protected-page routing
```

## Deployment

Deploy to Vercel or a Node.js host that supports Next.js and the required runtime versions.

1. Configure the five environment variables above in your hosting provider.
2. Set `NEXTAUTH_URL` to the deployment's HTTPS origin and register its Google OAuth callback: `https://your-domain/api/auth/callback/google`.
3. Configure database connectivity and access restrictions for your hosting environment.
4. Build with `npm run build`. On a self-hosted deployment, start with `npm start`.
5. Verify sign-in, expense/refund flows, investment CRUD, filters, and mobile layouts on the deployed site.

On Vercel, request-origin validation also recognizes the platform-provided `VERCEL_URL` for preview deployments. A preview that needs Google sign-in must have a matching authorized OAuth callback.

---

<div align="center">
  <strong>Finex</strong> · Built with Next.js, React, MongoDB, NextAuth, and Recharts.<br />
  Licensed under the <a href="LICENSE">MIT License</a>.
</div>
