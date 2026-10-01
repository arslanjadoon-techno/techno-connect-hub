import { Download } from "lucide-react";
import { useState } from "react";
import LoadingIndicator from "../report/LoadingIndicator";
import { Button } from "@/components/ui/button";

type ReportWorkspaceProps = {
  children: React.ReactNode;
  status: string;
  loading?: boolean;
  loadingLabel?: string;
  onExport?: () => void | Promise<void>;
  exportTitle?: string;
  className?: string;
};

export default function ReportWorkspace({
  children,
  status,
  loading = false,
  loadingLabel = "Loading report",
  onExport,
  exportTitle = "Export report",
  className = "",
}: ReportWorkspaceProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (!onExport || isExporting) return;
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section
      className={`min-w-0 max-w-full flex-1 overflow-hidden rounded-2xl border border-[#7600bc] bg-white p-2.5 shadow-lg shadow-[#7600bc]/5 sm:p-5 ${className}`}
    >
      <div className="grid min-w-0 max-w-full gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-semibold text-[#6a5a75]">
            {loading ? <LoadingIndicator label={loadingLabel} size="sm" /> : status}
          </div>
          {onExport ? (
            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[6px] border border-[#176b87] bg-white px-3 text-[12px] font-bold text-[#176b87] shadow-sm transition hover:bg-[#eefafa] disabled:cursor-not-allowed disabled:opacity-60"
              title={exportTitle}
            >
              <Download size={15} />
              {isExporting ? "Preparing download..." : "Export"}
            </Button>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
