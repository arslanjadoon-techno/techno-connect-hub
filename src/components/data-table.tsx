import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  searchValue?: (row: T) => string;
  className?: string;
  sortValue?: (row: T) => string | number;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  pageSize?: number;
  rowKey: (row: T) => string;
  empty?: ReactNode;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;

  rowCount?: number;
  page?: number;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
}

const PAGE_SIZE_KEY = "app-table-page-size";
const PAGE_SIZE_EVENT = "app-table-page-size-change";
const PAGE_SIZE_OPTIONS = [15, 25, 50];

function getStoredPageSize(fallback: number) {
  if (typeof window === "undefined") return fallback;
  const v = Number(window.localStorage.getItem(PAGE_SIZE_KEY));
  return PAGE_SIZE_OPTIONS.includes(v) ? v : (PAGE_SIZE_OPTIONS.includes(fallback) ? fallback : 15);
}

export function DataTable<T>({
  rows, columns, pageSize: pageSizeProp = 15, rowKey, empty, toolbar,
  searchPlaceholder = "Search...", onRowClick,
  rowCount, page: serverPage, onPageChange, onPageSizeChange,
  isLoading = false,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [localPage, setLocalPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => getStoredPageSize(pageSizeProp));

  // Listen for cross-table size changes
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<number>;
      if (typeof ev.detail === "number" && ev.detail !== pageSize) {
        setPageSize(ev.detail);
        if (onPageSizeChange) onPageSizeChange(ev.detail);
        if (isServerPagination && onPageChange) onPageChange(0);
        else setLocalPage(1);
      }
    };
    window.addEventListener(PAGE_SIZE_EVENT, handler as EventListener);
    return () => window.removeEventListener(PAGE_SIZE_EVENT, handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, onPageSizeChange, onPageChange]);

  // Propagate initial size to server-paginated parents
  useEffect(() => {
    if (onPageSizeChange && pageSize !== pageSizeProp) {
      onPageSizeChange(pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePageSize = (next: number) => {
    setPageSize(next);
    try { window.localStorage.setItem(PAGE_SIZE_KEY, String(next)); } catch {}
    window.dispatchEvent(new CustomEvent(PAGE_SIZE_EVENT, { detail: next }));
    if (onPageSizeChange) onPageSizeChange(next);
    if (isServerPagination && onPageChange) onPageChange(0);
    else setLocalPage(1);
  };

  const isServerPagination = rowCount !== undefined && serverPage !== undefined && onPageChange !== undefined;
  const activePage = isServerPagination ? serverPage! : localPage;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((c) => {
        const v = c.searchValue
          ? c.searchValue(row)
          : typeof c.accessor(row) === "string"
            ? (c.accessor(row) as string)
            : "";
        return v.toLowerCase().includes(q);
      }),
    );
  }, [rows, query, columns]);

  const totalRecords = isServerPagination ? rowCount! : filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePageDisplay = isServerPagination ? activePage + 1 : activePage;
  const tableDataSlice = isServerPagination ? rows : filtered.slice((activePage - 1) * pageSize, activePage * pageSize);

  const handlePageSwitch = (target: number) => {
    if (isLoading) return;
    if (isServerPagination) {
      onPageChange!(target);
    } else {
      setLocalPage(target + 1);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative w-full sm:w-72 sm:ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            disabled={isLoading}
            onChange={(e) => {
              setQuery(e.target.value);
              if (isServerPagination) onPageChange!(0);
              else setLocalPage(1);
            }}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
        {toolbar}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>{c.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableDataSlice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {empty ?? "No results"}
                </TableCell>
              </TableRow>
            ) : (
              tableDataSlice.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? "cursor-pointer transition-colors hover:bg-accent/50" : undefined}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>{c.accessor(row)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {totalRecords === 0 ? 0 : isServerPagination ? (activePage * pageSize + 1) : ((activePage - 1) * pageSize + 1)}
          {"–"}
          {isServerPagination
            ? Math.min((activePage + 1) * pageSize, totalRecords)
            : Math.min(activePage * pageSize, totalRecords)
          } of {totalRecords}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => changePageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[78px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant="outline" size="icon"
            disabled={isLoading || (isServerPagination ? activePage === 0 : activePage === 1)}
            onClick={() => handlePageSwitch(isServerPagination ? activePage - 1 : activePage - 2)}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <span className="px-1">Page {safePageDisplay} / {totalPages}</span>
          <Button
            variant="outline" size="icon"
            disabled={isLoading || (isServerPagination ? (activePage + 1) >= totalPages : activePage === totalPages)}
            onClick={() => handlePageSwitch(isServerPagination ? activePage + 1 : activePage)}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
