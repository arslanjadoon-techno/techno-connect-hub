import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, Upload } from "lucide-react";
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

/* Demo file per upload: the real header row and two made-up rows */
const TEMPLATES: Record<
  CommissionUploadType,
  { file: string; sheet: string; rows: unknown[][]; dateCols?: string[] }
> = {
  adr: {
    file: "ADR_template.csv",
    sheet: "ADR",
    rows: [
      [
        "marketid",
        "storeid",
        "company",
        "custid",
        "invno",
        "serial",
        "item",
        "mobile",
        "actdate",
        "account",
        "ported",
        "portptn",
        "reference",
        "sim",
        "reference1",
        "custname",
        "promoname",
        "linetype",
        "status",
        "source",
        "plantype",
        "accounttype",
        "term",
        "prodline",
        "itmdesc",
        "username",
        "acttype",
        "plancode",
        "plantype1",
        "grouptype",
        "plandesc",
        "mrc",
      ],
      [
        "ARIZONA",
        "TECH10001",
        "100 MAIN ST",
        "10001",
        "50001",
        "'350000000000001",
        "'610000000001",
        "6020000001",
        "11/1/2026 12:26",
        "300000001",
        "F",
        "",
        "51900000001",
        "8901260000000000001F",
        "51900000001",
        "J*** D***",
        "New Line",
        "Both (V&D)",
        "Active",
        "Inventory",
        "Individual",
        "Prime",
        "1 Year",
        "METROPCS",
        "DEMO PHONE BLK",
        "ABC12345",
        "New Activation",
        "DEMO55",
        "Voice",
        "Individual",
        "DEMO UNLIMITED PLAN",
        "55",
      ],
      [
        "DALLAS",
        "TECH10002",
        "200 ELM ST",
        "10002",
        "50002",
        "'350000000000002",
        "'610000000002",
        "2140000002",
        "11/2/2026 15:40",
        "300000002",
        "T",
        "",
        "51900000002",
        "8901260000000000002F",
        "51900000002",
        "M*** S***",
        "Upgrade",
        "Both (V&D)",
        "Active",
        "Inventory",
        "Individual",
        "Prime",
        "1 Year",
        "METROPCS",
        "DEMO PHONE WHT",
        "XYZ67890",
        "Upgrade",
        "DEMO40",
        "Voice",
        "Individual",
        "DEMO 40 PLAN",
        "40",
      ],
    ],
  },
  sdr: {
    file: "SDR_template.csv",
    sheet: "SDR",
    rows: [
      [
        "marketid",
        "custno",
        "company",
        "item",
        "itmdesc",
        "serial",
        "qty",
        "price",
        "minprice",
        "cost",
        "discount",
        "realprice",
        "taxable",
        "taxamount",
        "pptax",
        "subtotal",
        "profit",
        "adduser",
        "name",
        "lastname",
        "invno",
        "adddate",
        "custno1",
        "acttype",
        "arstat",
        "paytype",
        "prodline",
        "category",
        "subcategory",
        "paymentsku",
        "cashpaid",
        "creditcardpaid",
        "debitcardpaid",
        "financedpaid",
        "checkpaid",
        "otherpaid",
        "artraniid",
        "armastiid",
        "firstname",
        "lastname1",
        "tangible",
        "serialized",
        "stationid",
        "manufacturer",
        "color",
        "state",
        "region",
        "principle",
      ],
      [
        "ARIZONA",
        "10001",
        "100 MAIN ST",
        "DEMOCASE1",
        "DEMO PHONE CASE",
        "",
        "1",
        "29.99",
        "0",
        "5",
        "0",
        "29.99",
        "T",
        "2.4",
        "0",
        "29.99",
        "24.99",
        "ABC12345",
        "Demo",
        "User",
        "50001",
        "11/1/2026 12:30",
        "10001",
        "",
        "",
        "Cash",
        "ACCESSORIES",
        "Accessories",
        "Cases",
        "",
        "32.39",
        "0",
        "0",
        "0",
        "0",
        "0",
        "",
        "",
        "Demo",
        "User",
        "T",
        "F",
        "1",
        "DEMO",
        "Black",
        "AZ",
        "West",
        "DEMO",
      ],
      [
        "DALLAS",
        "10002",
        "200 ELM ST",
        "DEMOCHG1",
        "DEMO CHARGER",
        "",
        "1",
        "19.99",
        "0",
        "4",
        "0",
        "19.99",
        "T",
        "1.6",
        "0",
        "19.99",
        "15.99",
        "XYZ67890",
        "Demo",
        "User",
        "50002",
        "11/2/2026 15:45",
        "10002",
        "",
        "",
        "Card",
        "ACCESSORIES",
        "Accessories",
        "Chargers",
        "",
        "0",
        "21.59",
        "0",
        "0",
        "0",
        "0",
        "",
        "",
        "Demo",
        "User",
        "T",
        "F",
        "1",
        "DEMO",
        "White",
        "TX",
        "South",
        "DEMO",
      ],
    ],
  },
  retention: {
    file: "Retention_template.xlsx",
    sheet: "95 Day by Nabeel",
    rows: [
      [
        "Employee Name",
        "NTID",
        "35Day DCS Retention",
        "65Day DCS Retention",
        "95Day DCS Retention",
        "125Day DCS Retention",
        "155Day DCS Retention",
        "185Day DCS Retention",
        "",
        "",
        "NTID",
        "Sum of 95-Day Features Sold",
        "Sum of 95-Day Features MRC Retained",
        "95 Day Retention",
      ],
      [
        "Demo User One",
        "abc12345",
        0.9,
        0.85,
        0.8,
        0.75,
        0.7,
        0.65,
        "",
        "",
        "abc12345",
        90,
        55,
        0.6111,
      ],
      ["Demo User Two", "xyz67890", 1, 0.95, 0.9, 0.8, 0.75, 0.7, "", "", "xyz67890", 40, 30, 0.75],
    ],
  },
  eligibility: {
    file: "Eligibility_template.xlsx",
    sheet: "Eligibility Sheet",
    /* Excel date numbers, shown as dates */
    dateCols: ["C", "D"],
    rows: [
      [
        "NAME",
        "NTID",
        "Start DATe",
        "Start DATe_1",
        "Column12",
        "Column13",
        "Column14",
        "",
        "Market",
        "NTID",
        "Reps",
        "Active Status Shared by Kiran",
        "",
        "Market",
        "NTID",
      ],
      [
        "Demo User One",
        "ABC12345",
        46037,
        46037,
        "",
        "",
        "",
        "",
        "",
        "",
        "ABC12345",
        "Active",
        "",
        "ARIZONA",
        "ABC12345",
      ],
      [
        "Demo User Two",
        "XYZ67890",
        46174,
        46174,
        "",
        "",
        "",
        "",
        "",
        "",
        "XYZ67890",
        "Active",
        "",
        "DALLAS",
        "XYZ67890",
      ],
    ],
  },
};

const downloadTemplate = (type: CommissionUploadType) => {
  const t = TEMPLATES[type];
  const sheet = XLSX.utils.aoa_to_sheet(t.rows);
  t.dateCols?.forEach((col) => {
    for (let row = 2; row <= t.rows.length; row++) {
      const cell = sheet[`${col}${row}`];
      if (cell) cell.z = "m/d/yyyy";
    }
  });
  if (t.file.endsWith(".csv")) {
    /* No BOM: the server reads the csv as Windows-1252, a BOM would break the first column name */
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([XLSX.utils.sheet_to_csv(sheet)], { type: "text/csv" }),
    );
    link.download = t.file;
    link.click();
    URL.revokeObjectURL(link.href);
    return;
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, t.sheet);
  XLSX.writeFile(book, t.file);
};

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
            Every upload replaces all the old data of that type. Recalculate after uploading to
            apply it to today's commission.
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
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => downloadTemplate(u.type)}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download template
                </Button>
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
