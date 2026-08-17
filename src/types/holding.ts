export type Action = "New Position" | "Added" | "Reduced" | "Unchanged" | "Sold Out";
export type HoldingTrend = "Accumulating" | "Trimming" | "Stable" | "Re-entered" | "Exited" | "New";
export type CostStatus = "official" | "hybrid" | "estimated" | "unavailable";
export type CostMethod = "reported" | "reported-carried" | "reported-plus-estimates" | "observed-period-estimate";
export type CostReason = "insufficient-history" | "missing-price" | "corporate-action" | "unsupported-security" | "sold-out";

export interface HoldingCost {
  status: CostStatus;
  basis: number | null;
  basisLow: number | null;
  basisHigh: number | null;
  averagePrice: number | null;
  method: CostMethod | null;
  sourceAsOf: string | null;
  sourceUrl: string | null;
  reason: CostReason | null;
}

export interface Holding {
  issuerName: string | null;
  ticker: string | null;
  cusip: string | null;
  value: number;
  shares: number;
  portfolioWeight: number;
  action: Action;
  filingDate: string | null;
  reportDate: string | null;
  secUrl: string | null;
  previousShares?: number;
  previousValue?: number;
  previousWeight?: number;
  shareChange?: number;
  shareChangePercent?: number | null;
  valueChange?: number;
  weightChange?: number;
  trend?: HoldingTrend | null;
  quartersHeld?: number;
  consecutiveQuartersHeld?: number;
  cost: HoldingCost;
}

export interface LatestData {
  accessionNumber: string;
  filingDate: string | null;
  reportDate: string | null;
  secUrl: string | null;
  generatedAt: string | null;
  totalValue: number;
  holdingsCount: number;
  holdings: Holding[];
}

export interface HistoryItem {
  filingDate: string | null;
  reportDate: string | null;
  secUrl: string | null;
  totalValue: number;
  holdingsCount: number;
}

export interface QuarterData extends HistoryItem {
  accessionNumber: string;
  holdings: Holding[];
}

export interface PerformancePoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  includedPortfolioWeight?: number;
}

export interface QuarterlyReturn extends PerformancePoint {
  startDate: string;
  endDate: string;
}

export interface PerformanceData {
  startDate: string | null;
  endDate: string | null;
  benchmarkTicker: "SPY";
  points: PerformancePoint[];
  quarterlyReturns: QuarterlyReturn[];
  missingSymbols: string[];
  generatedAt: string | null;
  methodology: string[];
  priceSource?: string | null;
}
