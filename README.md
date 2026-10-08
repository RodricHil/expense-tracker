# Expense Tracker

A modern expense tracker built with Next.js, MongoDB, and NextAuth. This app helps users log spending, visualize trends, and explore category-based insights in a polished analytics dashboard.


## Features

- User authentication with NextAuth
- Expense CRUD via serverless API endpoints
- Dashboard with date filtering and expense list management
- Interactive analytics page with daily, weekly, monthly, yearly, and custom views
- Category spending insights and payment mode breakdowns
- Online Card / UPI details, saved card networks (Visa, Mastercard, RuPay), and bank / RuPay credit funding sources
- Personal category management (add, rename, delete) from Categories in the navbar, plus additional UPI apps, scoped to the signed-in user
- Merchant and platform details
- Full / partial refund history with sources and dates, preserving original purchase amounts
- Local PDF / image receipt scanning with review required before saving
- Gross and net spending plus daily averages across every calendar day in the selected range
- Responsive design for desktop and mobile

## Getting Started

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

- `app/components` — shared UI components such as `Navbar`, `DateRangeFilter`, and modals
- `app/dashboard/dashboardclient.tsx` — main expense dashboard page
- `app/analytics/page.tsx` — analytics dashboard with charts
- `app/add-expenses/addexpense.tsx` — add expense form
- `app/api/expenses/route.ts` — expense CRUD API route
- `lib` — MongoDB connection utilities
- `models` — Mongoose schemas for expenses and users

## Analytics

The analytics page supports:

- Daily, weekly, monthly, and yearly charting
- Custom date range selection
- Category spending rankings
- Cash vs online payment mode breakdowns

## Environment Variables

Create a `.env.local` file in the project root and add:

```env
MONGODB_URI=<your-mongodb-connection-string>
NEXTAUTH_SECRET=<your-random-secret>
NEXTAUTH_URL=http://localhost:3000
```

Add any provider-specific values required by your NextAuth provider.

## Deployment

This app can be deployed to Vercel or any Node.js hosting platform with Next.js support.

### Recommended steps

1. Set environment variables in your hosting provider.
2. Build the app with:

```bash
npm run build
```

3. Start the production server with:

```bash
npm start
```

## Notes

- Use the dashboard to manage expenses and trigger updates.
- Visit `/analytics` to explore advanced visualizations.
- The architecture is documented in `ARCHITECTURE.md`.

## Receipt privacy and compatibility

Choose **Scan receipt** in the Add expense dialog. English OCR suggests merchant,
description, a labelled total, and an unambiguous date. Review the extracted text,
correct the form, and check the review confirmation before saving. Unsupported or
missing details must be entered manually. Scanning never creates an expense.

Files are processed in browser memory and are never uploaded or saved. OCR and PDF
workers, fonts, decoders, and the English model are served from this app, without a
third-party receipt API or CDN. Limits: 10 MB, 5 PDF pages, JPG / PNG / WebP images.
The English model is included under `public/receipt-assets/lang`; `predev` and
`prebuild` copy worker assets from pinned dependencies.

New expense/card fields are optional. Existing records need no migration and are
not rewritten. Existing expense category labels and gross totals remain compatible. Personal
categories are saved separately and checked for ownership on expense writes.

Refunds are attached to the original expense, with integer cents, date, and source.
A conditional database update prevents cumulative refunds exceeding the purchase,
including concurrent submissions. Purchase edits cannot reduce the amount below
recorded refunds. Refund/net figures are attributed to the original purchase date
in the selected range; charts and existing spending figures continue showing gross
purchase amounts. A full remaining refund completes any prior partial refunds.

Personal categories are managed on `/categories`. Deletion archives the category
so past expenses keep their names and assignments. Archived categories cannot be
chosen for new expenses; existing expenses can retain them during edits.

New expenses use only categories created by the signed-in user. There are no
shared/default choices in the forms or category manager. Legacy category labels
remain on old expenses and may be retained when editing those records.
