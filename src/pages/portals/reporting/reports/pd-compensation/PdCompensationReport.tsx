"use client";

import type { DetailResult, KpiSummary, SummaryDatum, TrendDatum } from "../../types";
import DetailTable from "../../../../../components/reporting/report/DetailTable";
import KpiCard from "../../../../../components/reporting/report/KpiCard";
import LollipopRankChart from "../../../../../components/reporting/report/LollipopRankChart";
import StoreTreemapChart from "../../../../../components/reporting/report/StoreTreemapChart";
import TrendAreaChart from "../../../../../components/reporting/report/TrendAreaChart";
import ReportWorkspace from "../../../../../components/reporting/dashboard/ReportWorkspace";

type Props = {
  status: string;
  isSummaryLoading: boolean;
  isKpiLoading: boolean;
  isMarketLoading: boolean;
  isStoreLoading: boolean;
  isTrendLoading: boolean;
  isDetailLoading: boolean;
  kpi: KpiSummary;
  marketData: SummaryDatum[];
  storeData: SummaryDatum[];
  trendData: TrendDatum[];
  detail: DetailResult;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onExport: () => void;
};

export default function PdCompensationReport({
  status,
  isSummaryLoading,
  isKpiLoading,
  isMarketLoading,
  isStoreLoading,
  isTrendLoading,
  isDetailLoading,
  kpi,
  marketData,
  storeData,
  trendData,
  detail,
  page,
  pageSize,
  onPageChange,
  onExport,
}: Props) {
  return (
    <ReportWorkspace
      status={status}
      loading={isSummaryLoading || isDetailLoading}
      loadingLabel={status}
      onExport={onExport}
      exportTitle="Export all matching rows"
    >
      <KpiCard summary={kpi} isLoading={isKpiLoading} />
      <div className="grid gap-3">
        <div id="pd-market-section" className="min-w-0 max-w-full">
          <LollipopRankChart
            title="Market Performance - Amount and Transactions"
            items={marketData}
            isLoading={isMarketLoading}
          />
        </div>
        <div id="pd-store-section" className="min-w-0 max-w-full">
          <StoreTreemapChart items={storeData} isLoading={isStoreLoading} />
        </div>
      </div>
      <div id="pd-trend-section" className="min-w-0 max-w-full">
        <TrendAreaChart points={trendData} isLoading={isTrendLoading} />
      </div>
      <div id="pd-detail-section" className="min-w-0 max-w-full">
        <DetailTable
          rows={detail?.rows ?? []}
          page={page}
          pageSize={pageSize}
          totalRows={detail?.totalRows ?? 0}
          hasNextPage={detail?.hasNextPage ?? false}
          isLoading={isDetailLoading}
          onPageChange={onPageChange}
        />
      </div>
    </ReportWorkspace>
  );
}
