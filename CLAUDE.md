# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with Vite HMR
- `npm run build` - Build for production (runs TypeScript compilation + Vite build)  
- `npm run lint` - Run ESLint with TypeScript rules
- `npm run preview` - Preview production build locally

### Type Checking
- `tsc -b` - Run TypeScript compilation (part of build process)
- Use `tsconfig.app.json` for app code and `tsconfig.node.json` for build tools

## Project Architecture

### Technology Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Charts**: Chart.js with react-chartjs-2
- **State**: React hooks (no external state management)
- **Storage**: localStorage for data persistence
- **API**: Monobank Personal API integration

### Core Application Flow
This is a Monobank transaction manager that handles:
1. **Data Sources**: Can use sample data or real Monobank API data via personal tokens
2. **Storage Strategy**: Uses localStorage with 24-hour expiration and automatic cleanup
3. **Filtering System**: Multi-dimensional filters (description, MCC codes, categories, search)
4. **Category Management**: Persistent categorization with type-ahead suggestions

### Key Components Structure
```
src/
├── App.tsx                    # Main app with transaction management logic
├── scenes/                    # Main application views
│   ├── StatisticsScene.tsx    # Statistics dashboard and transaction list
│   └── CategoryBreakdownScene.tsx # Category analysis view
├── components/
│   ├── facets/               # Sidebar filtering components
│   ├── charts/               # Chart.js visualization components  
│   └── [UI components]       # Reusable UI elements
├── utils/
│   ├── formatters.ts         # Currency/date formatting utilities
│   ├── dateHelpers.ts        # Date manipulation for API calls
│   └── monthlyAnalytics.ts   # Analytics calculations
└── types/index.ts            # TypeScript interfaces
```

### Data Model
- **Transaction**: Core interface matching Monobank API response
- **StoredData**: localStorage structure with transactions, categories, timestamp
- **Filters**: Multi-select filtering state for UI

### API Integration Notes
- Monobank API has 60-second rate limits between calls
- Maximum 31-day periods per API call
- Incremental updates to avoid duplicate data
- Progress tracking for year-long data fetching operations

### State Management Patterns
- Single App.tsx manages global state via React hooks
- localStorage sync on data changes with automatic cleanup
- Filter state drives all transaction display logic
- Category management with persistent storage and cleanup of unused categories

### Development Notes
- No test framework currently configured
- ESLint configured with TypeScript and React rules
- Tailwind CSS with PostCSS for styling
- Vite for fast development and optimized builds