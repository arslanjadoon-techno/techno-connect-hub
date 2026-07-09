// import { useState, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import { CrudPage } from "@/components/crud-page";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { toast } from "sonner";
// import { Search, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// // 1. Interfaces
// interface StandingRow {
//     id: number;
//     rank: number;
//     name: string;
//     market: string;
//     accessories: number;
//     voice: number;
//     hsi: number;
//     bts: number;
//     upgrades: number;
//     mim: number;
//     retention: number;
//     total: number;
// }

// type SortField = 'accessories' | 'voice' | 'hsi' | 'bts' | 'upgrades' | 'mim' | 'retention' | 'total';
// type SortOrder = 'asc' | 'desc' | 'normal';

// export default function StandingsPage() {
//     const navigate = useNavigate();

//     // 2. Filters States
//     const [searchQuery, setSearchQuery] = useState("");
//     const [selectedYear, setSelectedYear] = useState<string>("all");
//     const [selectedMonth, setSelectedMonth] = useState<string>("all");
//     const [selectedDay, setSelectedDay] = useState<string>("all");

//     // 3. Sorting State
//     const [sortField, setSortField] = useState<SortField | null>(null);
//     const [sortOrder, setSortOrder] = useState<SortOrder>('normal');

//     // Pagination states
//     const [page, setPage] = useState<number>(0);
//     const [size, setSize] = useState<number>(15);

//     // 4. Static Data (5 Rows)
//     const initialData: StandingRow[] = [
//         { id: 1, rank: 1, name: "John Doe", market: "New York", accessories: 144, voice: 78, hsi: 101, bts: 97, upgrades: 132, mim: 152, retention: 64, total: 112 },
//         { id: 2, rank: 2, name: "Sarah Connor", market: "Los Angeles", accessories: 103, voice: 92, hsi: 103, bts: 79, upgrades: 98, mim: 169, retention: 58, total: 100 },
//         { id: 3, rank: 3, name: "Mike Ross", market: "Chicago", accessories: 109, voice: 80, hsi: 60, bts: 85, upgrades: 149, mim: 176, retention: 64, total: 100 },
//         { id: 4, rank: 4, name: "Harvey Specter", market: "Houston", accessories: 96, voice: 76, hsi: 131, bts: 78, upgrades: 98, mim: 160, retention: 71, total: 99 },
//         { id: 5, rank: 5, name: "Louis Litt", market: "Miami", accessories: 55, voice: 65, hsi: 92, bts: 88, upgrades: 105, mim: 110, retention: 82, total: 84 },
//     ];

//     // 5. Helper function for percentage conditional colors
//     const renderPercentageBadge = (value: number, isTotal = false) => {
//         let bgClass = "";
//         let textClass = "";
//         let borderClass = "";

//         if (value < 60) {
//             bgClass = "bg-red-50 dark:bg-red-950/30";
//             textClass = "text-red-600 dark:text-red-400 font-semibold";
//             borderClass = isTotal ? "border-2 border-red-500" : "border border-red-200/60 dark:border-red-900/40";
//         } else if (value >= 60 && value <= 100) {
//             bgClass = "bg-amber-50 dark:bg-amber-950/20";
//             textClass = "text-amber-700 dark:text-amber-500 font-semibold";
//             borderClass = isTotal ? "border-2 border-amber-500" : "border border-amber-200 dark:border-amber-900/30";
//         } else {
//             bgClass = "bg-emerald-50 dark:bg-emerald-950/30";
//             textClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
//             borderClass = isTotal ? "border-2 border-emerald-500" : "border border-emerald-200/60 dark:border-emerald-900/40";
//         }

//         return (
//             <div className={`flex items-center justify-center h-8 px-3 rounded-xl transition-all ${bgClass} ${textClass} ${borderClass} ${isTotal ? 'w-20 font-bold text-sm shadow-sm' : 'w-16 text-xs'}`}>
//                 {value}%
//             </div>
//         );
//     };

//     // 6. Handle 3-State Sorting Click
//     const handleSort = (field: SortField) => {
//         if (sortField !== field) {
//             setSortField(field);
//             setSortOrder('asc');
//         } else {
//             if (sortOrder === 'asc') setSortOrder('desc');
//             else if (sortOrder === 'desc') setSortOrder('normal');
//             else {
//                 setSortField(field);
//                 setSortOrder('asc');
//             }
//         }
//     };

//     // Sort Icon Renderer
//     const renderSortIcon = (field: SortField) => {
//         if (sortField !== field || sortOrder === 'normal') {
//             return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50 group-hover:text-muted-foreground" />;
//         }
//         return sortOrder === 'asc' ?
//             <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary font-bold" /> :
//             <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary font-bold" />;
//     };

//     // 7. Filter & Sort Logic
//     const processedData = useMemo(() => {
//         let result = [...initialData];

//         if (searchQuery.trim()) {
//             const q = searchQuery.toLowerCase();
//             result = result.filter(r => r.name.toLowerCase().includes(q) || r.market.toLowerCase().includes(q));
//         }

//         if (sortField && sortOrder !== 'normal') {
//             result.sort((a, b) => {
//                 const valA = a[sortField];
//                 const valB = b[sortField];
//                 return sortOrder === 'asc' ? valA - valB : valB - valA;
//             });
//         }

//         return result;
//     }, [searchQuery, sortField, sortOrder, selectedYear, selectedMonth, selectedDay]);

//     // Reset Filters Handler
//     const handleResetFilters = () => {
//         if (selectedYear === "all" && selectedMonth === "all" && selectedDay === "all" && searchQuery === "") return;
//         setSearchQuery("");
//         setSelectedYear("all");
//         setSelectedMonth("all");
//         setSelectedDay("all");
//         setSortField(null);
//         setSortOrder('normal');
//         toast.success("Filters cleared successfully");
//     };

//     const renderInteractiveCell = (field: SortField, value: number, isTotal = false) => {
//         return (
//             <div className="flex flex-col gap-1.5 py-1">
//                 <button
//                     type="button"
//                     onClick={(e) => {
//                         e.stopPropagation();
//                         handleSort(field);
//                     }}
//                     className="flex items-center uppercase tracking-wider text-[11px] font-bold text-zinc-400 dark:text-zinc-500 group select-none hover:text-primary transition-colors duration-150 w-fit md:hidden"
//                 >
//                     {field}
//                     {renderSortIcon(field)}
//                 </button>
//                 <div className={isTotal ? "pr-4 flex justify-start" : ""}>
//                     {renderPercentageBadge(value, isTotal)}
//                 </div>
//             </div>
//         );
//     };

//     return (
//         <div className="w-full">
//             <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[120px\]]:bg-white dark:[&_button.w-\[120px\]]:bg-zinc-950 [&_thead]:bg-zinc-50 dark:[&_thead]:bg-zinc-900/50 [&_thead]:border-b [&_thead]:border-border [&_th]:h-14 [&_tbody_tr]:bg-background [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-100 dark:[&_tbody_tr]:border-zinc-800/50 [&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:cursor-pointer transition-all duration-200">

//                 <style dangerouslySetInnerHTML={{
//                     __html: `
//             .standings-table th { position: relative; cursor: pointer; user-select: none; }
//             .standings-table th:hover { color: var(--primary) !important; }

//             /* CrudPage components ke automatic elements ko selectively target karke hide karne ke liye */
//             .standings-table button:has(.lucide-plus), 
//             .standings-table button:has(svg.lucide-plus),
//             .standings-table .absolute.right-4.top-4,
//             .standings-table h2 + button,
//             .standings-table header button { display: none !important; }

//             /* Table ke right-side par auto-generated hone wali search input wrapper ko hide karne ke liye target kiya */
//             .standings-table div.flex.items-center.gap-2:has(input[placeholder*="Search"]) { display: none !important; }

//             /* Last placeholder Actions header aur cells layout ko clean karne ke liye */
//             .standings-table th:last-child, 
//             .standings-table td:last-child { display: none !important; }
//           `}} />

//                 <div className="standings-table">
//                     <CrudPage<StandingRow>
//                         title="Standings"
//                         subtitle="Evaluation of market managers and their performance data"
//                         rows={processedData}
//                         rowKey={(r) => r.id.toString()}
//                         isLoading={false}
//                         isSaving={false}
//                         onDelete={async () => { }}
//                         renderForm={() => null}
//                         createLabel="" 
//                         hideEdit={true} 
//                         hideDelete={true} 

//                         rowCount={processedData.length}
//                         page={page}
//                         pageSize={size}
//                         onPageChange={(newPage) => setPage(newPage)}
//                         onPageSizeChange={(newSize) => setSize(newSize)}

//                         onRowClick={(row) => {
//                             navigate(`/ranker/standings/detail?id=${row.id}`);
//                         }}

//                         extraToolbar={
//                             <div className="flex flex-wrap items-center gap-3 pb-0.5 w-full md:w-auto">

//                                 {/* YEAR DROPDOWN */}
//                                 <div className="relative flex flex-col pt-2.5">
//                                     <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
//                                         Year
//                                     </span>
//                                     <Select value={selectedYear} onValueChange={setSelectedYear}>
//                                         <SelectTrigger className="w-[110px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
//                                             <SelectValue placeholder="Year" />
//                                         </SelectTrigger>
//                                         <SelectContent>
//                                             <SelectItem value="all">All Years</SelectItem>
//                                             <SelectItem value="2026">2026</SelectItem>
//                                             <SelectItem value="2025">2025</SelectItem>
//                                         </SelectContent>
//                                     </Select>
//                                 </div>

//                                 {/* MONTH DROPDOWN */}
//                                 <div className="relative flex flex-col pt-2.5">
//                                     <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
//                                         Month
//                                     </span>
//                                     <Select value={selectedMonth} onValueChange={setSelectedMonth}>
//                                         <SelectTrigger className="w-[110px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
//                                             <SelectValue placeholder="Month" />
//                                         </SelectTrigger>
//                                         <SelectContent>
//                                             <SelectItem value="all">All Months</SelectItem>
//                                             <SelectItem value="jan">January</SelectItem>
//                                             <SelectItem value="feb">February</SelectItem>
//                                             <SelectItem value="mar">March</SelectItem>
//                                         </SelectContent>
//                                     </Select>
//                                 </div>

//                                 {/* DAY DROPDOWN */}
//                                 <div className="relative flex flex-col pt-2.5">
//                                     <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
//                                         Day
//                                     </span>
//                                     <Select value={selectedDay} onValueChange={setSelectedDay}>
//                                         <SelectTrigger className="w-[110px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
//                                             <SelectValue placeholder="Day" />
//                                         </SelectTrigger>
//                                         <SelectContent>
//                                             <SelectItem value="all">All Days</SelectItem>
//                                             <SelectItem value="01">01</SelectItem>
//                                             <SelectItem value="15">15</SelectItem>
//                                             <SelectItem value="30">30</SelectItem>
//                                         </SelectContent>
//                                     </Select>
//                                 </div>

//                                 {/* RESET BUTTON */}
//                                 <Button
//                                     type="button"
//                                     variant="ghost"
//                                     size="sm"
//                                     disabled={selectedYear === "all" && selectedMonth === "all" && selectedDay === "all" && searchQuery === "" && sortField === null}
//                                     onClick={handleResetFilters}
//                                     className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-dashed border-muted-foreground/30 disabled:opacity-40 transition-all active:scale-95 group"
//                                 >
//                                     <XCircle className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover:rotate-90 duration-300" />
//                                     Reset Filters
//                                 </Button>
//                             </div>
//                         }

//                         columns={[
//                             { key: "rank", header: "Rank", accessor: (r) => <div className="py-2 pl-4 text-left font-bold text-zinc-500">#{r.rank}</div> },
//                             { key: "name", header: "Name", accessor: (r) => <div className="py-2 text-left font-semibold text-zinc-800 dark:text-zinc-200">{r.name}</div> },
//                             { key: "market", header: "Market", accessor: (r) => <div className="py-2 text-left text-muted-foreground font-medium">{r.market}</div> },

//                             { key: "accessories", header: "Accessories", accessor: (r) => renderInteractiveCell("accessories", r.accessories) },
//                             { key: "voice", header: "Voice", accessor: (r) => renderInteractiveCell("voice", r.voice) },
//                             { key: "hsi", header: "HSI", accessor: (r) => renderInteractiveCell("hsi", r.hsi) },
//                             { key: "bts", header: "BTS", accessor: (r) => renderInteractiveCell("bts", r.bts) },
//                             { key: "upgrades", header: "Upgrades", accessor: (r) => renderInteractiveCell("upgrades", r.upgrades) },
//                             { key: "mim", header: "MIM", accessor: (r) => renderInteractiveCell("mim", r.mim) },
//                             { key: "retention", header: "Retention", accessor: (r) => renderInteractiveCell("retention", r.retention) },
//                             { key: "total", header: "Total", accessor: (r) => renderInteractiveCell("total", r.total, true) },
//                         ]}
//                     />
//                 </div>
//             </div>
//         </div>
//     );
// }



import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CrudPage } from "@/components/crud-page";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { ConfettiBackground } from "@/components/confetti-background"; // 🌟 Reusable Component Import

// 1. Interfaces
interface StandingRow {
    id: number;
    rank: number;
    name: string;
    market: string;
    accessories: number;
    voice: number;
    hsi: number;
    bts: number;
    upgrades: number;
    mim: number;
    retention: number;
    total: number;
}

type SortField = 'accessories' | 'voice' | 'hsi' | 'bts' | 'upgrades' | 'mim' | 'retention' | 'total';
type SortOrder = 'asc' | 'desc' | 'normal';

export default function StandingsPage() {
    const navigate = useNavigate();

    // 2. Filters States
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState<string>("all");
    const [selectedDay, setSelectedDay] = useState<string>("all");

    // 3. Sorting State
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>('normal');

    // Pagination states
    const [page, setPage] = useState<number>(0);
    const [size, setSize] = useState<number>(15);

    // 4. Static Data (5 Rows)
    const initialData: StandingRow[] = [
        { id: 1, rank: 1, name: "John Doe", market: "New York", accessories: 144, voice: 78, hsi: 101, bts: 97, upgrades: 132, mim: 152, retention: 64, total: 112 },
        { id: 2, rank: 2, name: "Sarah Connor", market: "Los Angeles", accessories: 103, voice: 92, hsi: 103, bts: 79, upgrades: 98, mim: 169, retention: 58, total: 100 },
        { id: 3, rank: 3, name: "Mike Ross", market: "Chicago", accessories: 109, voice: 80, hsi: 60, bts: 85, upgrades: 149, mim: 176, retention: 64, total: 100 },
        { id: 4, rank: 4, name: "Harvey Specter", market: "Houston", accessories: 96, voice: 76, hsi: 131, bts: 78, upgrades: 98, mim: 160, retention: 71, total: 99 },
        { id: 5, rank: 5, name: "Louis Litt", market: "Miami", accessories: 55, voice: 65, hsi: 92, bts: 88, upgrades: 105, mim: 110, retention: 82, total: 84 },
    ];

    // 5. Helper function for percentage conditional colors
    const renderPercentageBadge = (value: number, isTotal = false) => {
        let bgClass = "";
        let textClass = "";
        let borderClass = "";

        if (value < 60) {
            bgClass = "bg-red-50 dark:bg-red-950/30";
            textClass = "text-red-600 dark:text-red-400 font-semibold";
            borderClass = isTotal ? "border-2 border-red-500" : "border border-red-200/60 dark:border-red-900/40";
        } else if (value >= 60 && value <= 100) {
            bgClass = "bg-amber-50 dark:bg-amber-950/20";
            textClass = "text-amber-700 dark:text-amber-500 font-semibold";
            borderClass = isTotal ? "border-2 border-amber-500" : "border border-amber-200 dark:border-amber-900/30";
        } else {
            bgClass = "bg-emerald-50 dark:bg-emerald-950/30";
            textClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
            borderClass = isTotal ? "border-2 border-emerald-500" : "border border-emerald-200/60 dark:border-emerald-900/40";
        }

        return (
            <div className={`flex items-center justify-center h-8 px-3 rounded-xl transition-all ${bgClass} ${textClass} ${borderClass} ${isTotal ? 'w-20 font-bold text-sm shadow-sm' : 'w-16 text-xs'}`}>
                {value}%
            </div>
        );
    };

    // 6. Handle 3-State Sorting Click
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

    // Sort Icon Renderer
    const renderSortIcon = (field: SortField) => {
        if (sortField !== field || sortOrder === 'normal') {
            return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50 group-hover:text-muted-foreground" />;
        }
        return sortOrder === 'asc' ?
            <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary font-bold" /> :
            <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary font-bold" />;
    };

    // 7. Filter & Sort Logic
    const processedData = useMemo(() => {
        let result = [...initialData];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r => r.name.toLowerCase().includes(q) || r.market.toLowerCase().includes(q));
        }

        if (sortField && sortOrder !== 'normal') {
            result.sort((a, b) => {
                const valA = a[sortField];
                const valB = b[sortField];
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            });
        }

        return result;
    }, [searchQuery, sortField, sortOrder, selectedYear, selectedMonth, selectedDay]);

    // Reset Filters Handler
    const handleResetFilters = () => {
        if (selectedYear === "all" && selectedMonth === "all" && selectedDay === "all" && searchQuery === "") return;
        setSearchQuery("");
        setSelectedYear("all");
        setSelectedMonth("all");
        setSelectedDay("all");
        setSortField(null);
        setSortOrder('normal');
        toast.success("Filters cleared successfully");
    };

    const renderInteractiveCell = (field: SortField, value: number, isTotal = false) => {
        return (
            <div className="flex flex-col gap-1.5 py-1">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSort(field);
                    }}
                    className="flex items-center uppercase tracking-wider text-[11px] font-bold text-zinc-400 dark:text-zinc-500 group select-none hover:text-primary transition-colors duration-150 w-fit md:hidden"
                >
                    {field}
                    {renderSortIcon(field)}
                </button>
                <div className={isTotal ? "pr-4 flex justify-start" : ""}>
                    {renderPercentageBadge(value, isTotal)}
                </div>
            </div>
        );
    };

    return (
        /* 🌟 WRAPPED WITH NEW REUSABLE BACKGROUND WRAPPER COMPONENTS */
        <ConfettiBackground>
            <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[120px\]]:bg-white dark:[&_button.w-\[120px\]]:bg-zinc-950 [&_thead]:bg-zinc-50/90 dark:[&_thead]:bg-zinc-900/80 [&_thead]:border-b [&_thead]:border-border [&_th]:h-14 [&_tbody_tr]:bg-background/80 [&_tbody_tr]:backdrop-blur-[1.5px] [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-100 dark:[&_tbody_tr]:border-zinc-800/50 [&_tbody_tr]:hover:bg-muted/50 [&_tbody_tr]:cursor-pointer transition-all duration-200">

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .standings-table th { position: relative; cursor: pointer; user-select: none; }
                    .standings-table th:hover { color: var(--primary) !important; }
                    
                    /* CrudPage hidden targets overrides */
                    .standings-table button:has(.lucide-plus), 
                    .standings-table button:has(svg.lucide-plus),
                    .standings-table .absolute.right-4.top-4,
                    .standings-table h2 + button,
                    .standings-table header button { display: none !important; }
                    
                    .standings-table div.flex.items-center.gap-2:has(input[placeholder*="Search"]) { display: none !important; }
                    
                    .standings-table th:last-child, 
                    .standings-table td:last-child { display: none !important; }
                    `}} />

                <div className="standings-table">
                    <CrudPage<StandingRow>
                        title="Standings"
                        subtitle="Evaluation of market managers and their performance data"
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
                            navigate(`/ranker/standings/detail?market=${encodeURIComponent(row.market)}`);
                        }}

                        extraToolbar={
                            <div className="flex flex-wrap items-center gap-3 pb-0.5 w-full md:w-auto relative z-20">

                                {/* YEAR DROPDOWN */}
                                <div className="relative flex flex-col pt-2.5">
                                    <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
                                        Year
                                    </span>
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger className="w-[110px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Years</SelectItem>
                                            <SelectItem value="2026">2026</SelectItem>
                                            <SelectItem value="2025">2025</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* MONTH DROPDOWN */}
                                <div className="relative flex flex-col pt-2.5">
                                    <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
                                        Month
                                    </span>
                                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                        <SelectTrigger className="w-[110px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
                                            <SelectValue placeholder="Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Months</SelectItem>
                                            <SelectItem value="jan">January</SelectItem>
                                            <SelectItem value="feb">February</SelectItem>
                                            <SelectItem value="mar">March</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* DAY DROPDOWN */}
                                <div className="relative flex flex-col pt-2.5">
                                    <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
                                        Day
                                    </span>
                                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                                        <SelectTrigger className="w-[110px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
                                            <SelectValue placeholder="Day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Days</SelectItem>
                                            <SelectItem value="01">01</SelectItem>
                                            <SelectItem value="15">15</SelectItem>
                                            <SelectItem value="30">30</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* RESET BUTTON */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={selectedYear === "all" && selectedMonth === "all" && selectedDay === "all" && searchQuery === "" && sortField === null}
                                    onClick={handleResetFilters}
                                    className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-dashed border-muted-foreground/30 disabled:opacity-40 transition-all active:scale-95 group"
                                >
                                    <XCircle className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover:rotate-90 duration-300" />
                                    Reset Filters
                                </Button>
                            </div>
                        }

                        columns={[
                            { key: "rank", header: "Rank", accessor: (r) => <div className="py-2 pl-4 text-left font-bold text-zinc-500">#{r.rank}</div> },
                            { key: "name", header: "Name", accessor: (r) => <div className="py-2 text-left font-semibold text-zinc-800 dark:text-zinc-200">{r.name}</div> },
                            { key: "market", header: "Market", accessor: (r) => <div className="py-2 text-left text-muted-foreground font-medium">{r.market}</div> },

                            { key: "accessories", header: "Accessories", accessor: (r) => renderInteractiveCell("accessories", r.accessories) },
                            { key: "voice", header: "Voice", accessor: (r) => renderInteractiveCell("voice", r.voice) },
                            { key: "hsi", header: "HSI", accessor: (r) => renderInteractiveCell("hsi", r.hsi) },
                            { key: "bts", header: "BTS", accessor: (r) => renderInteractiveCell("bts", r.bts) },
                            { key: "upgrades", header: "Upgrades", accessor: (r) => renderInteractiveCell("upgrades", r.upgrades) },
                            { key: "mim", header: "MIM", accessor: (r) => renderInteractiveCell("mim", r.mim) },
                            { key: "retention", header: "Retention", accessor: (r) => renderInteractiveCell("retention", r.retention) },
                            { key: "total", header: "Total", accessor: (r) => renderInteractiveCell("total", r.total, true) },
                        ]}
                    />
                </div>
            </div>
        </ConfettiBackground>
    );
}