export type Action = "New Position" | "Added" | "Reduced" | "Unchanged" | "Sold Out";

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
  shareChange?: number;
  valueChange?: number;
}

export interface LatestData {
  filingDate: string | null;
  reportDate: string | null;
  secUrl: string | null;
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
