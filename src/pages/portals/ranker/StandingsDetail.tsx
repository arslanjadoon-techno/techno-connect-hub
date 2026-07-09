import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CrudPage } from "@/components/crud-page";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, XCircle, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeft } from "lucide-react";
import { ConfettiBackground } from "@/components/confetti-background";

// 1. Types & Interfaces
interface KPIMetrics {
    tgt: string | number;
    act: string | number;
    pct: number;
}

interface StoreDetailRow {
    id: number;
    tId: string;
    market: string;
    store: string;
    accessories: KPIMetrics;
    voice: KPIMetrics;
    hsi: KPIMetrics;
    bts: KPIMetrics;
    upgrades: KPIMetrics;
    mim: KPIMetrics;
    retention: KPIMetrics;
    total: KPIMetrics; // 🌟 Total will only use the .pct property now
    isSubHeaderRow?: boolean;
}

type SortField = 'accessories' | 'voice' | 'hsi' | 'bts' | 'upgrades' | 'mim' | 'retention' | 'total';
type SortOrder = 'asc' | 'desc' | 'normal';

export default function MarketDetailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const marketName = searchParams.get("market") || "New York";

    // 2. Filters States
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState<string>("all");
    const [selectedDay, setSelectedDay] = useState<string>("all");
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>('normal');

    // Pagination
    const [page, setPage] = useState<number>(0);
    const [size, setSize] = useState<number>(15);

    // 3. Mock Data
    const initialData: StoreDetailRow[] = [
        {
            id: 1, tId: "10328867", market: marketName, store: "3338 BROADWAY",
            accessories: { tgt: "$22,291", act: "$45,106", pct: 202 },
            voice: { tgt: "194", act: "193", pct: 99 },
            hsi: { tgt: "18", act: "21", pct: 117 },
            bts: { tgt: "116", act: "101", pct: 87 },
            upgrades: { tgt: "39", act: "88", pct: 226 },
            mim: { tgt: "55", act: "76", pct: 138 },
            retention: { tgt: "246", act: "179", pct: 73 },
            total: { tgt: "0", act: "0", pct: 138 }
        },
        {
            id: 2, tId: "10328866", market: marketName, store: "S. HULEN",
            accessories: { tgt: "$23,646", act: "$38,651", pct: 163 },
            voice: { tgt: "224", act: "165", pct: 74 },
            hsi: { tgt: "19", act: "23", pct: 121 },
            bts: { tgt: "101", act: "98", pct: 97 },
            upgrades: { tgt: "45", act: "88", pct: 196 },
            mim: { tgt: "58", act: "77", pct: 133 },
            retention: { tgt: "250", act: "166", pct: 66 },
            total: { tgt: "0", act: "0", pct: 124 }
        },
        {
            id: 3, tId: "10328865", market: marketName, store: "E. ABRAM ST",
            accessories: { tgt: "$28,972", act: "$51,038", pct: 176 },
            voice: { tgt: "243", act: "210", pct: 86 },
            hsi: { tgt: "24", act: "22", pct: 92 },
            bts: { tgt: "162", act: "226", pct: 140 },
            upgrades: { tgt: "49", act: "70", pct: 143 },
            mim: { tgt: "63", act: "87", pct: 138 },
            retention: { tgt: "320", act: "190", pct: 59 },
            total: { tgt: "0", act: "0", pct: 119 }
        }
    ];

    const getPctColorClass = (value: number) => {
        if (value < 60) return "text-red-700 dark:text-red-400 font-bold";
        if (value >= 60 && value <= 100) return "text-amber-700 dark:text-amber-500 font-bold";
        return "text-emerald-700 dark:text-emerald-400 font-bold";
    };

    const handleSort = (field: SortField) => {
        if (sortField !== field) {
            setSortField(field);
            setSortOrder('asc');
        } else {
            if (sortOrder === 'asc') setSortOrder('desc');
            else if (sortOrder === 'desc') setSortOrder('normal');
            else {
                setSortField(field);
                setSortOrder('asc');
            }
        }
    };

    const processedData = useMemo(() => {
        let result = [...initialData];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r => r.store.toLowerCase().includes(q) || r.tId.includes(q));
        }
        if (sortField && sortOrder !== 'normal') {
            result.sort((a, b) => {
                const valA = a[sortField].pct;
                const valB = b[sortField].pct;
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            });
        }

        const subHeaderRow: StoreDetailRow = {
            id: -999, tId: "", market: "", store: "", isSubHeaderRow: true,
            accessories: { tgt: "Tgt", act: "Act", pct: 0 },
            voice: { tgt: "Tgt", act: "Act", pct: 0 },
            hsi: { tgt: "Tgt", act: "Act", pct: 0 },
            bts: { tgt: "Tgt", act: "Act", pct: 0 },
            upgrades: { tgt: "Tgt", act: "Act", pct: 0 },
            mim: { tgt: "Tgt", act: "Act", pct: 0 },
            retention: { tgt: "Tgt", act: "Act", pct: 0 },
            total: { tgt: "%", act: "", pct: 0 } // 🌟 Kept clean for single header representation
        };

        return [subHeaderRow, ...result];
    }, [searchQuery, sortField, sortOrder]);

    const handleResetFilters = () => {
        setSearchQuery("");
        setSelectedYear("all");
        setSelectedMonth("all");
        setSelectedDay("all");
        setSortField(null);
        setSortOrder('normal');
        toast.success("Filters reset successfully");
    };

    const kpiBgColors = {
        accessories: "bg-blue-100/50 dark:bg-blue-950/30 border-x border-blue-200/40",
        voice: "bg-indigo-100/50 dark:bg-indigo-950/30 border-x border-indigo-200/40",
        hsi: "bg-emerald-100/50 dark:bg-emerald-950/30 border-x border-emerald-200/40",
        bts: "bg-rose-100/50 dark:bg-rose-950/30 border-x border-rose-200/40",
        upgrades: "bg-amber-100/50 dark:bg-amber-950/30 border-x border-amber-200/40",
        mim: "bg-purple-100/50 dark:bg-purple-950/30 border-x border-purple-200/40",
        retention: "bg-cyan-100/50 dark:bg-cyan-950/30 border-x border-cyan-200/40",
        total: "bg-zinc-200/70 dark:bg-zinc-800/50 font-bold border-x border-zinc-300/50",
    };

    const renderMetricsCell = (row: StoreDetailRow, field: SortField) => {
        const metrics = row[field];
        const bgColor = kpiBgColors[field];
        
        // 🌟 Special Layout Rules Check for TOTAL Column (No Grid/Sub-columns)
        if (field === 'total') {
            if (row.isSubHeaderRow) {
                return (
                    <div className={`w-full text-center text-[11px] uppercase font-bold text-zinc-700 dark:text-zinc-300 tracking-wider py-1.5 h-full flex items-center justify-center ${bgColor}`}>
                        %
                    </div>
                );
            }
            return (
                <div className={`w-full h-full flex items-center justify-center text-sm py-2 ${bgColor} ${getPctColorClass(metrics.pct)}`}>
                    {metrics.pct}%
                </div>
            );
        }

        // Standard 3 sub-columns structure rendering for other fields
        if (row.isSubHeaderRow) {
            return (
                <div className={`grid grid-cols-3 w-full text-center text-[11px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-wider py-1.5 h-full items-center ${bgColor}`}>
                    <div>Tgt</div>
                    <div>Act</div>
                    <div>%</div>
                </div>
            );
        }

        return (
            <div className={`grid grid-cols-3 w-full h-full items-center text-xs py-2 ${bgColor}`}>
                <div className="text-center font-medium text-zinc-600 dark:text-zinc-400">{metrics.tgt}</div>
                <div className="text-center font-semibold text-zinc-800 dark:text-zinc-200">{metrics.act}</div>
                <div className={`text-center ${getPctColorClass(metrics.pct)}`}>
                    {metrics.pct}%
                </div>
            </div>
        );
    };

    return (
        <ConfettiBackground>
            <div className="w-full border-0 shadow-none bg-transparent pt-2 [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[120px\]]:bg-white dark:[&_button.w-\[120px\]]:bg-zinc-950 [&_thead]:bg-zinc-50/90 dark:[&_thead]:bg-zinc-900/80 [&_thead]:border-b [&_thead]:border-border [&_th]:h-11 [&_th]:p-0 [&_td]:p-0 [&_tbody_tr]:bg-background/80 [&_tbody_tr]:backdrop-blur-[1.5px] [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-200 dark:[&_tbody_tr]:border-zinc-800/50 [&_tbody_tr]:hover:bg-muted/40 transition-all duration-200">
                
                {/* Fixed Header Block */}
                <div className="px-6 py-3 flex flex-col gap-1 border-b border-zinc-100/80 dark:border-zinc-900 bg-background/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => navigate(-1)}
                            className="h-8 w-8 rounded-md border-zinc-200 shadow-sm hover:bg-zinc-50 shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                            {marketName}
                        </h1>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium pl-11">
                        Store level performance breakdown
                    </p>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .detail-table button:has(.lucide-plus), 
                    .detail-table button:has(svg.lucide-plus),
                    .detail-table .absolute.right-4.top-4,
                    .detail-table h2 + button,
                    .detail-table h2, 
                    .detail-table p,
                    .detail-table header { display: none !important; }
                    .detail-table div.flex.items-center.gap-2:has(input[placeholder*="Search"]) { display: none !important; }
                    .detail-table th:last-child, .detail-table td:last-child { display: none !important; }

                    .detail-table tr:has(div[data-subheader="true"]) {
                        background-color: rgb(241 245 249 / 0.9) !important;
                        pointer-events: none;
                        cursor: default !important;
                    }

                    .detail-table th {
                        font-size: 11px !important;
                        font-weight: 800 !important;
                        letter-spacing: 0.05em;
                        text-align: center !important;
                    }
                    `}} />

                <div className="detail-table px-2">
                    <CrudPage<StoreDetailRow>
                        title="" 
                        subtitle="" 
                        rows={processedData}
                        rowKey={(r) => r.id.toString()}
                        isLoading={false}
                        isSaving={false}
                        onDelete={async () => { }}
                        renderForm={() => null}
                        createLabel="" 
                        hideEdit={true} 
                        hideDelete={true} 

                        rowCount={processedData.length}
                        page={page}
                        pageSize={size}
                        onPageChange={(newPage) => setPage(newPage)}
                        onPageSizeChange={(newSize) => setSize(newSize)}

                        onRowClick={(row) => {
                            if (row.isSubHeaderRow) return;
                            navigate(`/ranker/stores/detail?id=${row.id}`);
                        }}

                        extraToolbar={
                            <div className="flex flex-wrap items-center gap-3 pb-2 pt-1 w-full md:w-auto relative z-20">

                                <div className="relative flex flex-col pt-2.5">
                                    <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">Year</span>
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Years</SelectItem>
                                            <SelectItem value="2026">2026</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="relative flex flex-col pt-2.5">
                                    <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">Month</span>
                                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                        <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Months</SelectItem>
                                            <SelectItem value="jan">January</SelectItem>
                                            <SelectItem value="feb">February</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="relative flex flex-col pt-2.5">
                                    <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">Day</span>
                                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                                        <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Days</SelectItem>
                                            <SelectItem value="01">01</SelectItem>
                                            <SelectItem value="15">15</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={selectedYear === "all" && selectedMonth === "all" && selectedDay === "all" && searchQuery === "" && sortField === null}
                                    onClick={handleResetFilters}
                                    className="h-9 px-3 text-xs border border-dashed border-muted-foreground/30 group"
                                >
                                    <XCircle className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover:rotate-90 duration-300" />
                                    Reset Filters
                                </Button>
                            </div>
                        }

                        columns={[
                            { 
                                key: "tId", 
                                header: "T-ID", 
                                accessor: (r) => r.isSubHeaderRow ? <div data-subheader="true" className="h-4 pl-4" /> : <div className="py-2.5 pl-4 text-left font-bold text-amber-600 dark:text-amber-500 text-xs">{r.tId}</div> 
                            },
                            { 
                                key: "market", 
                                header: "MARKET", 
                                accessor: (r) => r.isSubHeaderRow ? null : <div className="py-2.5 text-left font-medium text-zinc-500 text-xs uppercase">{r.market}</div> 
                            },
                            { 
                                key: "store", 
                                header: "STORE", 
                                accessor: (r) => r.isSubHeaderRow ? null : <div className="py-2.5 text-left font-bold text-zinc-800 dark:text-zinc-200 text-xs uppercase">{r.store}</div> 
                            },

                            { key: "accessories", header: "ACCESSORIES", accessor: (r) => renderMetricsCell(r, "accessories") },
                            { key: "voice", header: "VOICE", accessor: (r) => renderMetricsCell(r, "voice") },
                            { key: "hsi", header: "HSI", accessor: (r) => renderMetricsCell(r, "hsi") },
                            { key: "bts", header: "BTS", accessor: (r) => renderMetricsCell(r, "bts") },
                            { key: "upgrades", header: "UPGRADES", accessor: (r) => renderMetricsCell(r, "upgrades") },
                            { key: "mim", header: "MIM", accessor: (r) => renderMetricsCell(r, "mim") },
                            { key: "retention", header: "RETENTION", accessor: (r) => renderMetricsCell(r, "retention") },
                            { key: "total", header: "TOTAL", accessor: (r) => renderMetricsCell(r, "total") },
                        ]}
                    />
                </div>

                <div>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        .detail-table th:nth-child(4) { cursor: pointer; position: relative; }
                        .detail-table th:nth-child(4)::after { content: '${sortField === "accessories" && sortOrder === "asc" ? " ▲" : sortField === "accessories" && sortOrder === "desc" ? " ▼" : " ↕"}'; opacity: 0.7; font-size: 11px; color: #18181b; }
                        `}} />
                </div>
            </div>
        </ConfettiBackground>
    );
}