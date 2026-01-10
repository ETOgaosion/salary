# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `easy-salary`, a Chinese salary calculator implementing China's 2022 individual income tax regulations. The project provides:

1. **NPM Package** (`easy-salary`) - Core calculation library published to npm
2. **Web App** - Interactive web interface hosted at https://etogaosion.github.io/salary
3. **WeChat Mini Program** - Native WeChat mini program version

The calculator handles:
- Monthly salary and year-end bonuses
- Social insurance and housing fund (五险一金) calculations
- Personal income tax using cumulative withholding method
- Special additional deductions (rent, mortgage, dependents, etc.)
- Housing fund upper/lower limits

## Development Commands

### Web Application
```bash
# Start development server (opens browser automatically)
npm run dev

# Build for production (web app)
npm run build

# Build GitHub Pages deployment
npm run build:page

# Lint TypeScript files in src/
npm run lint
```

### NPM Package
The npm package is built from the `src/calculator/` directory. Build outputs go to `npm/` directory for publishing.

### WeChat Mini Program
Located in `miniprogram/` directory. Use WeChat Developer Tools to develop and preview.

## Architecture

### Core Calculator (`src/calculator/`)

The calculation engine is modular and consists of:

- **`index.ts`** - Main `Salary` class entry point that orchestrates the calculation
- **`calculator.ts`** - Core `calculateSalary()` function implementing the cumulative tax withholding algorithm
- **`tax.ts`** - Personal income tax calculations using progressive tax brackets
- **`award.ts`** - Year-end bonus tax calculations (separate tax treatment)
- **`fund.ts`** - Social insurance and housing fund calculations with min/max caps
- **`type.d.ts`** - TypeScript type definitions (internal)
- **`index.d.ts`** - Public API type definitions (exported to npm)
- **`utils.ts`** - Array utilities (sum, average)

#### Tax Calculation Algorithm

**Monthly Salary Tax (Cumulative Withholding):**
```
累计应纳税所得额 = (月薪 - 起征点 - 五险一金 - 专项附加扣除) × 月数
当月个税 = (累计应纳税所得额 × 预扣率 - 速算扣除数) - 累计已缴税额
```

Progressive tax brackets are defined in `tax.ts` with values ranging from 3% (≤36,000) to 45% (>960,000 annually).

**Year-End Bonus Tax:**
Year-end bonuses use a separate calculation method (see `award.ts`) with different tax brackets. When monthly salary < starting salary threshold, the deficit is deducted from the bonus before tax calculation.

### Web UI (`src/ui/`)

- **`index.ts`** - DOM manipulation and calculation result rendering
- **`map.ts`** - Input field configuration mapping (salary, deductions, insurance rates, etc.)
- **`toast.ts`** - Simple toast notification system

UI uses vanilla TypeScript with direct DOM manipulation. No framework dependencies.

### WeChat Mini Program (`miniprogram/`)

Standard WeChat mini program structure using TypeScript:
- `miniprogram/app.ts` - App entry point
- `miniprogram/pages/` - Page components
- `miniprogram/utils/` - Shared utilities

Uses the same calculation logic from `src/calculator/` but adapted for the mini program environment.

### Build System (`webpack-config/`)

Three webpack configurations:
- **`dev.js`** - Development server with hot reload
- **`build.js`** - Production build (outputs to `npm/easy-salary.min.js`)
- **`build-page.js`** - GitHub Pages build (outputs to `public/`)

## Key Technical Details

### Insurance and Fund Rates (Shanghai Default)

Personal contribution rates:
- Pension: 8%
- Medical: 2%
- Unemployment: 0.5%
- Housing Fund: 7%
- Supplementary Fund: 5% (optional)

Housing fund has min/max base limits (Shanghai 2022: min 2,590, max 34,188).

### Data Flow

1. User inputs salary and configuration
2. `Salary` class initialized with options
3. `calculate()` method calls `calculateSalary()` in `calculator.ts`
4. Each month's tax calculated using cumulative method
5. Year-end bonus calculated separately using `calculateYearEndAwardsTax()`
6. Results include 12-month arrays for tax, pre-tax, and after-tax amounts

### Type System

Two type definition files serve different purposes:
- `type.d.ts` - Internal types used during development
- `index.d.ts` - Public API exported to npm package consumers

The `ICalculateResult` interface provides comprehensive output including monthly breakdowns, totals, and insurance/fund details.

## Package Manager

This project uses `pnpm` (lockfile: `pnpm-lock.yaml`). Use `pnpm install` to install dependencies.

## Code Quality

- ESLint configured with Standard style (`.eslintrc.js`)
- TypeScript strict mode enabled (`noImplicitAny`, `strictNullChecks`)
- Commitlint enforces conventional commits via Husky hooks
