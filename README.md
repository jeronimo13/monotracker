# Monobank Transaction Manager

A comprehensive React + TypeScript + Vite application for managing and analyzing Monobank transactions with advanced filtering, categorization, and analytics capabilities.

## 🚀 Features

### Core Functionality

- **Real-time API Integration**: Fetch transactions from Monobank API using personal tokens
- **Data Persistence**: Automatic localStorage caching with 24-hour expiration
- **Incremental Updates**: Smart data fetching that only retrieves new transactions
- **Year-long Data Fetching**: Bulk download of entire year's transaction history with progress tracking

### Advanced Filtering & Search

- **Multi-dimensional Filters**: Filter by description, MCC codes, categories, and search terms
- **Faceted Navigation**: Sidebar with category and MCC code facets for quick filtering
- **Smart Search**: Full-text search across descriptions, comments, and categories
- **Special Toggles**: Show only uncategorized transactions or negative transactions
- **Filter Persistence**: Active filters are maintained and displayed as removable chips

### Transaction Management

- **Automatic Categorization**: Add categories to filtered transactions with type-ahead suggestions
- **Category Management**: Persistent category storage with cleanup of unused categories
- **Transaction Details**: Rich transaction information including MCC descriptions, tooltips, and metadata
- **Date Grouping**: Transactions organized by date with clear visual separation

### Analytics & Reporting

- **Real-time Statistics**: Dynamic balance, income, and expense calculations
- **Category Breakdown**: Comprehensive analysis by category with expandable/collapsible views
- **Monthly Analysis**: Tabbed interface for transaction list and monthly breakdown views
- **Visual Indicators**: Transaction status indicators (hold, receipts, business transactions)

### User Experience

- **Responsive Design**: Modern UI with Tailwind CSS styling
- **Keyboard Navigation**: Arrow key support for type-ahead dropdowns
- **Auto-focus Management**: Smart focus handling for better workflow
- **Progress Tracking**: Visual progress bars for long-running operations
- **Error Handling**: Comprehensive error messages and recovery options

## 🛠️ Technical Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite with HMR
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect, useRef)
- **Data Storage**: localStorage with automatic cleanup
- **API Integration**: Monobank Personal API
- **Code Quality**: ESLint with TypeScript rules

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ChipComponent.tsx    # Filter chip display
│   ├── Tooltip.tsx         # Hover tooltips
│   ├── TabSwitcher.tsx     # Tab navigation
│   └── facets/             # Filter facet components
│       ├── SidebarCategoryFacets.tsx
│       └── SidebarMccFacets.tsx
├── scenes/               # Main application views
│   └── StatisticsScene.tsx # Statistics dashboard
├── utils/                # Utility functions
│   ├── formatters.ts      # Data formatting helpers
│   └── dateHelpers.ts     # Date manipulation utilities
├── data/                 # Static data files
│   ├── transactions.json  # Sample transaction data
│   └── mcc.json          # MCC code descriptions
├── types/                 # TypeScript type definitions
├── App.tsx               # Main application component
└── main.tsx              # Application entry point
```

## 🔧 Setup & Installation

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd monobank-transaction-manager

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Configuration

The application uses localStorage for data persistence and doesn't require environment variables. However, you'll need a valid Monobank personal token to fetch real transaction data.

## 🔑 Monobank API Integration

### Getting Your Token

1. Log into your Monobank account
2. Navigate to Settings → API
3. Generate a personal token
4. Use this token in the application

### API Endpoints Used

- `GET /personal/statement/0/{from}/{to}` - Fetch transactions for a date range
- Rate limit: 60 seconds between calls (enforced automatically)
- Maximum period: 31 days + 1 hour

### Data Handling

- **Incremental Updates**: Only fetches new transactions since last update
- **Smart Merging**: Prevents duplicate transactions using signature matching
- **Error Recovery**: Handles rate limits, authentication errors, and network issues
- **Progress Persistence**: Saves fetch progress to resume interrupted operations

## 💾 Data Management

### Storage Strategy

- **localStorage Key**: `monobankData`
- **Data Structure**:
  ```typescript
  interface StoredData {
    token: string;
    transactions: Transaction[];
    timestamp: number;
    useRealData: boolean;
    categories: { [key: string]: string };
  }
  ```
- **Expiration**: 24 hours from last API call
- **Cleanup**: Automatic removal of unused categories

### Transaction Data Model

```typescript
interface Transaction {
  id: string;
  time: number;
  description: string;
  mcc: number;
  originalMcc: number;
  hold: boolean;
  amount: number;
  operationAmount: number;
  currencyCode: number;
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  comment: string;
  receiptId: string;
  invoiceId: string;
  counterEdrpou: string;
  counterIban: string;
  category?: string;
}
```

## 🎯 Key Features Deep Dive

### Smart Filtering System

- **Description Filter**: Click on transaction descriptions to filter
- **MCC Filter**: Click on MCC codes to filter by merchant category
- **Category Filter**: Click on categories to filter by transaction type
- **Search Filter**: Full-text search with real-time results
- **Facet Filters**: Multi-select filtering for categories and MCC codes

### Category Management

- **Auto-suggestion**: Type-ahead dropdown with previously used categories
- **Keyboard Navigation**: Arrow keys, Enter, and Escape support
- **Bulk Assignment**: Add categories to all currently filtered transactions
- **Smart Cleanup**: Remove categories from individual transactions

### Data Visualization

- **Statistics Cards**: Real-time balance, income, and expense display
- **Category Breakdown**: Expandable view with transaction counts and amounts
- **Monthly Analysis**: Tabbed view for different data perspectives
- **Progress Indicators**: Visual feedback for long-running operations

## 🔒 Security & Privacy

- **Token Storage**: Personal tokens stored locally in browser
- **No External Storage**: All data remains on user's device
- **API Rate Limiting**: Built-in protection against API abuse
- **Data Validation**: Comprehensive input validation and sanitization

## 🚨 Error Handling

### Common Error Scenarios

- **Invalid Token**: Clear error messages with recovery instructions
- **Rate Limiting**: Automatic retry with exponential backoff
- **Network Issues**: Graceful degradation with offline data
- **API Changes**: Version compatibility checking

### Recovery Mechanisms

- **Automatic Retry**: Smart retry logic for transient failures
- **Data Fallback**: Use cached data when API is unavailable
- **Progress Persistence**: Resume interrupted operations
- **User Notifications**: Clear status updates and progress indicators

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Tablet Support**: Responsive layout for medium screens
- **Desktop Experience**: Full-featured interface for large screens
- **Touch Friendly**: Optimized for touch interactions

## 🧪 Development & Testing

### Development Commands

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Type checking
npm run type-check

# Build and preview
npm run build && npm run preview
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Comprehensive linting rules
- **Prettier**: Consistent code formatting
- **Component Architecture**: Modular, reusable components

## 🔮 Future Enhancements

### Planned Features

- **Export Functionality**: CSV/Excel export of filtered data
- **Advanced Analytics**: Charts and graphs for spending patterns
- **Budget Tracking**: Set and monitor spending limits
- **Multi-account Support**: Manage multiple Monobank accounts
- **Offline Mode**: Enhanced offline functionality with sync

### Technical Improvements

- **Service Workers**: Background sync and offline support
- **IndexedDB**: Enhanced local storage for large datasets
- **Web Workers**: Background processing for data analysis
- **PWA Support**: Installable web application

## 🤝 Contributing

### Development Guidelines

- Follow TypeScript best practices
- Use functional components with hooks
- Maintain consistent code style
- Add comprehensive error handling
- Include TypeScript types for all functions

### Code Structure

- Keep components small and focused
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Implement proper error boundaries
- Follow React performance best practices

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Monobank**: For providing the public API
- **React Team**: For the excellent framework
- **Tailwind CSS**: For the utility-first CSS framework
- **Vite**: For the fast build tool

## 📞 Support

For issues, questions, or contributions:

- Create an issue in the repository
- Check existing documentation
- Review the code examples
- Test with sample data before using real tokens

---

**Note**: This application is designed for personal use and educational purposes. Always follow Monobank's API terms of service and respect rate limits when fetching data.
