import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  dailyCommissionFilterService,
  type CommissionUpload,
  type CommissionUploadType,
} from "@/services/portals/commission/daily-commission-filter.service";

const UPLOADS: { type: CommissionUploadType; title: string; accept: string; sheet: string }[] = [
  {
    type: "adr",
    title: "ADR",
    accept: ".csv",
    sheet:
      "Activation Detail .csv from RTPOS (marketid ... actdate ... username ... mrc). Replaces all old ADR data",
  },
  {
    type: "sdr",
    title: "SDR",
    accept: ".csv",
    sheet:
      "Sales Detailed (Raw) .csv from RTPOS (marketid ... adduser ... adddate ... principle). Replaces all old SDR data",
  },
  {
    type: "retention",
    title: "Retention",
    accept: ".xlsx",
    sheet:
      "'95 Day Jun by Nabeel' sheet: Employee Name, NTID, 35-185Day DCS Retention, then NTID / Features Sold / Retained / 95 Day Retention in K-N. First sheet of an .xlsx file",
  },
  {
    type: "eligibility",
    title: "Eligibility",
    accept: ".xlsx",
    sheet:
      "'Eligibility Sheet': NAME, NTID, Start Date ... Active Status Shared by Kiran in L, Market / NTID in N-O. First sheet of an .xlsx file",
  },
];

const dayLabel = (value?: string | null) => (value ? value.slice(0, 10) : "");

export default function DailyCommissionUploadPanel() {
  const [uploads, setUploads] = useState<CommissionUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<CommissionUploadType | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    try {
      setUploads(await dailyCommissionFilterService.getDailyCommissionUploads());
    } catch (e) {
      toast.error((e as Error).message || "Could not load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onUpload = async (type: CommissionUploadType, file: File) => {
    setUploading(type);
    try {
      const result = await dailyCommissionFilterService.dailyCommissionUpload(type, file);
      toast.success(
        result.fromDate
          ? `${result.rows} rows uploaded for ${dayLabel(result.fromDate)} to ${dayLabel(result.toDate)}. ${result.deleted ?? 0} old rows removed.`
          : `${result.rows} rows uploaded. Old ${type} data replaced.`,
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Could not upload");
    } finally {
      setUploading(null);
      const input = fileRefs.current[type];
      if (input) input.value = "";
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dailyCommissionFilterService.refreshDailyCommissionSummary();
      toast.success("Today's commission calculated");
    } catch (e) {
      toast.error((e as Error).message || "Could not calculate");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Commission Uploads</h1>
          <p className="text-sm text-muted-foreground">
            Every upload replaces all the old data of that type. Recalculate after uploading to apply
            it to today's commission.
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={refreshing || uploading !== null}>
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Recalculate Commission
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {UPLOADS.map((u) => {
          const rows = uploads.find((x) => x.type === u.type)?.rows ?? 0;
          return (
            <Card key={u.type}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{u.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `${rows} rows in database`
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{u.sheet}.</p>
                <input
                  ref={(el) => {
                    fileRefs.current[u.type] = el;
                  }}
                  type="file"
                  accept={u.accept}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(u.type, file);
                  }}
                />
                <Button
                  className="w-full"
                  onClick={() => fileRefs.current[u.type]?.click()}
                  disabled={uploading !== null || refreshing}
                >
                  {uploading === u.type ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {uploading === u.type
                    ? "Uploading... (big files take a few minutes)"
                    : `Upload ${u.title}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
