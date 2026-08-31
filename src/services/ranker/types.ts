export interface RankerKpi {
  label: string;
  value: string | number;
  tone?: string;
  fg?: string;
}

export interface RankerStar {
  name: string;
  market: string;
  rank: number;
  tone?: string;
}

export interface RankerWeight {
  name: string;
  value: number;
  color?: string;
}

export interface RankerStandingsQuery {
  market?: string;
  year?: number;
  month?: number;
  page?: number;
  size?: number;
}
