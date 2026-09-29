import type { ReportView } from "../../../pages/portals/reporting/types";
import { pdCompensationConfig } from "../../../pages/portals/reporting/reports/pd-compensation/config";
import { retentionActivationConfig } from "../../../pages/portals/reporting/reports/retention-activation/config";
import { storeWisePdConfig } from "../../../pages/portals/reporting/reports/store-wise-pd/config";

export type ReportDefinition = {
  id: ReportView;
  label: string;
  path: string;
  supportsFilters: boolean;
};

export const reportRegistry: Record<ReportView, ReportDefinition> = {
  "pd-compensation": pdCompensationConfig,
  "store-wise-pd-compensation": storeWisePdConfig,
  "retention-activation": retentionActivationConfig,
  profitability: {
    id: "profitability",
    label: "Profitability Report",
    path: "/reporting/profitability",
    supportsFilters: false,
  },
};
