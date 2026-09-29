"use client";

import type {
  KpiSummary,
  MatrixDatum,
  SummaryDatum,
  TrendDatum,
} from "../../types";
import KpiCard from "../../../../../components/reporting/report/KpiCard";
import LollipopRankChart from "../../../../../components/reporting/report/LollipopRankChart";
import StoreWiseMatrix from "../../../../../components/reporting/report/StoreWiseMatrix";
import TrendAreaChart from "../../../../../components/reporting/report/TrendAreaChart";
import ReportWorkspace from "../../../../../components/reporting/dashboard/ReportWorkspace";

type Props = {
  status: string;
  isLoading: boolean;
  isKpiLoading: boolean;
  isMatrixLoading: boolean;
  isDoorCodesLoading: boolean;
  isTransactionTypesLoading: boolean;
  isTrendLoading: boolean;
  isMatrixDeferred: boolean;
  isDoorCodesDeferred: boolean;
  isTransactionTypesDeferred: boolean;
  isTrendDeferred: boolean;
  kpi: KpiSummary;
  doorCodes: SummaryDatum[];
  transactionTypes: SummaryDatum[];
  trend: TrendDatum[];
  matrix: MatrixDatum[];
  onExport: () => void;
};

export default function StoreWisePdReport({
  status,
  isLoading,
  isKpiLoading,
  isMatrixLoading,
  isDoorCodesLoading,
  isTransactionTypesLoading,
  isTrendLoading,
  isMatrixDeferred,
  isDoorCodesDeferred,
  isTransactionTypesDeferred,
  isTrendDeferred,
  kpi,
  doorCodes,
  transactionTypes,
  trend,
  matrix,
  onExport,
}: Props) {
  return (
    <ReportWorkspace
      status={status}
      loading={isLoading}
      loadingLabel="Loading Store Wise PD report"
      onExport={onExport}
      exportTitle="Export Store Wise PD report"
      className="min-h-[420px]"
    >
      <KpiCard
        summary={kpi}
        isLoading={isKpiLoading}
        showTransactions={false}
      />
      <div id="store-door-code-section" className="min-w-0 max-w-full">
        <LollipopRankChart
          title="Door Code Wise PD Amount"
          labelHeader="Door Code / Store"
          items={doorCodes}
          isLoading={isDoorCodesLoading || isDoorCodesDeferred}
        />
      </div>
      <div id="store-transaction-type-section" className="min-w-0 max-w-full">
        <LollipopRankChart
          title="Transaction Type Wise PD Amount"
          labelHeader="Transaction Type"
          items={transactionTypes}
          isLoading={isTransactionTypesLoading || isTransactionTypesDeferred}
        />
      </div>
      <div id="store-trend-section" className="min-w-0 max-w-full">
        <TrendAreaChart
          title="Store Wise PD Monthly Trend"
          points={trend}
          isLoading={isTrendLoading || isTrendDeferred}
        />
      </div>
      <div id="store-matrix-section" className="min-w-0 max-w-full">
        <StoreWiseMatrix
          items={matrix}
          isLoading={isMatrixLoading || isMatrixDeferred}
        />
      </div>
    </ReportWorkspace>
  );
}
