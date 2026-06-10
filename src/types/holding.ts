export type Action = "New Position" | "Added" | "Reduced" | "Unchanged" | "Sold Out";
export type HoldingTrend = "Accumulating" | "Trimming" | "Stable" | "Re-entered" | "Exited" | "New";

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
}

export interface LatestData {
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
  holdings: Holding[];
}
