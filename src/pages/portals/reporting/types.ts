export type ReportView =
  | "pd-compensation"
  | "store-wise-pd-compensation"
  | "retention-activation"
  | "profitability";

export type TransactionRow = {
  id: number;
  market: string;
  doorCode: string;
  storeName: string;
  postedDate: string;
  transactionDate: string;
  programName: string;
  transactionType: string;
  compType: string;
  dispute: string;
  amount: number;
};

export type Filters = {
  postedStart: string;
  postedEnd: string;
  transactionStart: string;
  transactionEnd: string;
  programName: string;
  transactionType: string;
  compType: string;
  dispute: string;
  markets: string[];
  stores: string[];
};

export type BarDatum = {
  label: string;
  value: number;
};

export type SummaryDatum = {
  label: string;
  amount: number;
  transactions: number;
};

export type TrendDatum = {
  postedDate: string;
  amount: number;
  transactions: number;
};

export type KpiSummary = {
  pdAmount: number;
  pdTransactions: number;
};

export type MatrixDatum = {
  transactionType: string;
  store: string;
  amount: number;
};

export type FilterOptionSet = {
  markets: string[];
  storesByMarket: Record<string, string[]>;
  programs: string[];
  transactionTypes: string[];
  compTypes: string[];
  disputes: string[];
};

export type DetailResult = {
  totalRows: number;
  rows: TransactionRow[];
  hasNextPage?: boolean;
};
