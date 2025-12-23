# Market Risk Engine Frontend

Premium fintech dashboard for the Market Risk Engine, built with React, TypeScript, Vite, TailwindCSS, and shadcn/ui.

## Features

- **Portfolio Management**: Build and manage portfolios with any Yahoo Finance symbols
- **Market Data**: Fetch and visualize price data with missing data reporting
- **Risk Metrics**: Comprehensive risk analysis including volatility, drawdown, beta, correlation, and risk contributions
- **VaR/CVaR**: Value at Risk calculations using Historical, Parametric, and Monte Carlo methods
- **Stress Testing**: Test portfolio performance under predefined and custom shock scenarios
- **Backtesting**: Validate VaR model accuracy with Kupiec POF test
- **Export**: Download or copy portfolio and analysis results as JSON
- **Dark Mode**: Beautiful dark mode with theme persistence
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **shadcn/ui** for premium UI components
- **React Router** for navigation
- **TanStack Query** for data fetching and caching
- **Recharts** for data visualization
- **Zod** for validation
- **react-hook-form** for form management
- **Axios** for API calls

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend server running at `http://localhost:8000` (or configure `VITE_API_URL`)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

Edit `.env` and set `VITE_API_URL` to your backend URL (default: `http://localhost:8000`).

3. Start development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

```bash
npm run preview
```

Preview the production build locally.

## Project Structure

```
frontend/
  src/
    app/
      router.tsx          # React Router configuration
      queryClient.ts      # TanStack Query client
      providers.tsx       # Theme provider
    components/
      layout/             # App shell, sidebar, topbar
      common/             # Reusable components (PageHeader, KpiCard, etc.)
      charts/             # Chart components (Recharts)
      tables/             # Table components
      forms/              # Form components
      ui/                 # shadcn/ui components
    pages/                # Page components
    lib/
      api.ts              # API client
      types.ts            # TypeScript types
      validators.ts       # Zod schemas
      format.ts           # Formatting utilities
      constants.ts        # Constants
      utils.ts            # Utility functions
    main.tsx              # Entry point
    index.css             # Global styles
```

## Usage

1. **Portfolio**: Start by creating a portfolio on the Portfolio page. Add symbols and weights, or upload a CSV file.

2. **Market Data**: Fetch price data for your portfolio symbols with date range selection.

3. **Risk Metrics**: Compute comprehensive risk metrics including volatility, drawdown, beta, correlation, and risk contributions.

4. **VaR/CVaR**: Calculate Value at Risk using your preferred method (Historical, Parametric, or Monte Carlo).

5. **Stress Tests**: Test your portfolio under adverse scenarios (predefined or custom).

6. **Backtesting**: Validate your VaR model accuracy with historical backtesting.

7. **Export**: Download or copy your portfolio and analysis results.

## Data Persistence

The app automatically saves to localStorage:
- Portfolio configuration
- Date range preferences
- VaR method and confidence level
- Theme preference (light/dark)

## API Integration

The frontend communicates with the FastAPI backend at the configured `VITE_API_URL`. All API calls are made through the typed client in `src/lib/api.ts`.

## Styling

The app uses TailwindCSS with a custom design system based on shadcn/ui. The theme supports both light and dark modes with smooth transitions.

## Development

- Hot module replacement is enabled in development
- TypeScript strict mode is enabled
- ESLint is configured for code quality

## License

This project is provided as-is for educational and research purposes.
