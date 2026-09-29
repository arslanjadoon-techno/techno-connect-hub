"use client";

import type { FilterOptionSet, Filters } from "../../../pages/portals/reporting/types";
import FilterPanel from "../filters/FilterPanel";

type ReportFilterWorkspaceProps = {
  title: string;
  filters: Filters;
  options: FilterOptionSet;
  resultCount?: number;
  showProgramFilter?: boolean;
  showTransactionTypeFilter?: boolean;
  showCompTypeFilter?: boolean;
  showDisputeFilter?: boolean;
  showResultCount?: boolean;
  onChange: (filters: Filters) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

export default function ReportFilterWorkspace({
  title,
  filters,
  options,
  resultCount = 0,
  showProgramFilter = false,
  showTransactionTypeFilter = false,
  showCompTypeFilter = false,
  showDisputeFilter = false,
  showResultCount = false,
  onChange,
  onApply,
  onReset,
  onClose,
}: ReportFilterWorkspaceProps) {
  return (
    <FilterPanel
      title={title}
      filters={filters}
      markets={options.markets}
      storesByMarket={options.storesByMarket}
      programs={options.programs}
      transactionTypes={options.transactionTypes}
      compTypes={options.compTypes}
      disputes={options.disputes}
      resultCount={resultCount}
      showProgramFilter={showProgramFilter}
      showTransactionTypeFilter={showTransactionTypeFilter}
      showCompTypeFilter={showCompTypeFilter}
      showDisputeFilter={showDisputeFilter}
      showResultCount={showResultCount}
      onChange={onChange}
      onApply={onApply}
      onReset={onReset}
      onClose={onClose}
    />
  );
}
