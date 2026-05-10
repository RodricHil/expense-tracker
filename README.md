# Expense Tracker

A modern expense tracker built with Next.js, MongoDB, and NextAuth. This app helps users log spending, visualize trends, and explore category-based insights in a polished analytics dashboard.


## Features

- User authentication with NextAuth
- Expense CRUD via serverless API endpoints
- Dashboard with date filtering and expense list management
- Interactive analytics page with daily, weekly, monthly, yearly, and custom views
- Category spending insights and payment mode breakdowns
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
