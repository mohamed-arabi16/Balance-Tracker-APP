# Balance Tracker App Overview

Balance Tracker is a comprehensive personal finance management application designed to help users track their assets, debts, income, and expenses in one place. It provides a clear picture of financial health through an intuitive dashboard and detailed tracking pages.

## Core Features

- **Dashboard**: A bird's-eye view of your financial status, including total net worth, asset distribution, and recent transactions.
- **Assets Management**: Track various types of assets, including cash, bank accounts, investments, and physical assets like gold or real estate.
- **Debt Tracking**: Keep track of liabilities, loans, and credit card balances.
- **Income & Expense Tracking**: Categorize and monitor your cash flow to understand your spending habits and earning patterns.
- **Multilingual Support**: Fully localized in English and Arabic with Right-to-Left (RTL) support.
- **Progressive Web App (PWA)**: Installable on mobile and desktop for offline access and a native-like experience.

## Technology Stack

- **Frontend**: React with Vite for a fast and modern development experience.
- **Styling**: Tailwind CSS for responsive design and Shadcn/UI for premium, accessible components.
- **Backend & Database**: Supabase (PostgreSQL) for real-time data storage and authentication.
- **State Management**: React Query (TanStack Query) for efficient data fetching and caching.
- **Internationalization**: i18next for managing translations.

## Architecture

The application follows a modern frontend-heavy architecture:

1. **Pages**: Located in `src/pages/`, representing different routes like Dashboard, Assets, etc.
2. **Components**: Reusable UI elements built with Shadcn/UI and Tailwind CSS in `src/components/`.
3. **Hooks**: Custom React hooks in `src/hooks/` for shared logic and data fetching.
4. **Contexts**: Global state management for themes, authentication, and layout settings in `src/contexts/`.
5. **Database**: Managed by Supabase with Row-Level Security (RLS) for data protection.

## Getting Started

1. Install dependencies: `npm install`
2. Set up environment variables in `.env` (refer to `.env.example`).
3. Run development server: `npm run dev`
