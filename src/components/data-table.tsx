import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  accessor?: (row: T) => ReactNode;
  cell?: (row: T) => ReactNode;
  searchValue?: (row: T) => string;
  className?: string;
  sortValue?: (row: T) => string | number;
}

interface Props<T> {
  rows?: T[];
  data?: T[];
  columns: Column<T>[];
  pageSize?: number;
  rowKey?: (row: T, index: number) => string;
  empty?: ReactNode;
  emptyMessage?: ReactNode;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T, index: number) => string | undefined;
  subHeaderRow?: ReactNode;
  footerRow?: ReactNode;

  rowCount?: number;
  page?: number;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
  loading?: boolean;
}

const PAGE_SIZE_KEY = "app-table-page-size";
const PAGE_SIZE_EVENT = "app-table-page-size-change";
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];

function getStoredPageSize(fallback: number) {
  if (typeof window === "undefined") return fallback;
  const v = Number(window.localStorage.getItem(PAGE_SIZE_KEY));
  return PAGE_SIZE_OPTIONS.includes(v) ? v : PAGE_SIZE_OPTIONS.includes(fallback) ? fallback : 15;
}

function extractSearchableStrings(val: unknown, depth = 0, set = new Set<string>()): string[] {
  if (depth > 4 || val === null || val === undefined) return [];
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    const s = String(val).trim();
    if (s && !set.has(s)) {
      set.add(s);
    }
    return Array.from(set);
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      extractSearchableStrings(item, depth + 1, set);
    }
    return Array.from(set);
  }
  if (typeof val === "object") {
    // If it's a React element, check its props (like children)
    if ("props" in (val as Record<string, unknown>)) {
      const children = (val as { props?: { children?: unknown } }).props?.children;
      if (children) {
        extractSearchableStrings(children, depth + 1, set);
      }
      return Array.from(set);
    }
    for (const key of Object.keys(val as Record<string, unknown>)) {
      if (
        key === "password" ||
        key === "avatarColor" ||
        key === "token" ||
        key === "refreshToken" ||
        key === "_owner" ||
        key === "$$typeof"
      ) {
        continue;
      }
      extractSearchableStrings((val as Record<string, unknown>)[key], depth + 1, set);
    }
  }
  return Array.from(set);
}

function rowMatchesQuery<T>(row: T, columns: Column<T>[], q: string): boolean {
  if (!q) return true;

  // 1. Column explicit searchValue
  for (const c of columns) {
    if (c.searchValue) {
      try {
        const val = c.searchValue(row);
        if (val && String(val).toLowerCase().includes(q)) return true;
      } catch {
        // continue
      }
    }
  }

  // 2. Column accessor or cell
  for (const c of columns) {
    if (typeof c.accessor === "function") {
      try {
        const val = c.accessor(row);
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          if (String(val).toLowerCase().includes(q)) return true;
        } else if (val && typeof val === "object") {
          const extracted = extractSearchableStrings(val);
          if (extracted.some((s) => s.toLowerCase().includes(q))) return true;
        }
      } catch {
        // continue
      }
    }
    if (typeof c.cell === "function") {
      try {
        const val = c.cell(row);
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          if (String(val).toLowerCase().includes(q)) return true;
        } else if (val && typeof val === "object") {
          const extracted = extractSearchableStrings(val);
          if (extracted.some((s) => s.toLowerCase().includes(q))) return true;
        }
      } catch {
        // continue
      }
    }
  }

  // 3. Deep search all fields of the row object
  if (row && typeof row === "object") {
    const allStrings = extractSearchableStrings(row);
    if (allStrings.some((s) => s.toLowerCase().includes(q))) return true;
  }

  return false;
}

export function DataTable<T>({
  rows: rowsProp,
  data: dataProp,
  columns = [],
  pageSize: pageSizeProp = 15,
  rowKey,
  empty,
  emptyMessage,
  toolbar,
  searchPlaceholder = "Search...",
  onRowClick,
  rowClassName,
  subHeaderRow,
  footerRow,
  rowCount,
  page: serverPage,
  onPageChange,
  onPageSizeChange,
  isLoading: isLoadingProp = false,
  loading: loadingProp = false,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [localPage, setLocalPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => getStoredPageSize(pageSizeProp));

  const rawRows = rowsProp ?? dataProp;
  const rows = useMemo(() => (Array.isArray(rawRows) ? rawRows : []), [rawRows]);
  const isLoading = Boolean(isLoadingProp || loadingProp);
  const emptyContent = empty ?? emptyMessage ?? "No results found";

  const getRowKey = (row: T, idx: number): string => {
    if (rowKey) return rowKey(row, idx);
    if (row && typeof row === "object") {
      const obj = row as Record<string, unknown>;
      if (obj.id !== undefined && obj.id !== null) return String(obj.id);
      if (obj._id !== undefined && obj._id !== null) return String(obj._id);
      if (obj.key !== undefined && obj.key !== null) return String(obj.key);
    }
    return String(idx);
  };

  const renderCellContent = (c: Column<T>, row: T) => {
    if (typeof c.cell === "function") return c.cell(row);
    if (typeof c.accessor === "function") return c.accessor(row);
    if (row && typeof row === "object") {
      const val = (row as Record<string, unknown>)[c.key];
      if (typeof val === "string" || typeof val === "number") return val;
    }
    return null;
  };

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
    try {
      window.localStorage.setItem(PAGE_SIZE_KEY, String(next));
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(new CustomEvent(PAGE_SIZE_EVENT, { detail: next }));
    if (onPageSizeChange) onPageSizeChange(next);
    if (isServerPagination && onPageChange) onPageChange(0);
    else setLocalPage(1);
  };

  const isServerPagination =
    rowCount !== undefined && serverPage !== undefined && onPageChange !== undefined;

  const isSearching = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => rowMatchesQuery(row, columns, q));
  }, [rows, query, columns]);

  const totalRecords = isSearching ? filtered.length : isServerPagination ? rowCount! : rows.length;

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const safePageDisplay = isSearching
    ? Math.min(localPage, totalPages)
    : isServerPagination
      ? serverPage! + 1
      : localPage;

  const tableDataSlice = isSearching
    ? filtered.slice((localPage - 1) * pageSize, localPage * pageSize)
    : isServerPagination
      ? rows
      : rows.slice((localPage - 1) * pageSize, localPage * pageSize);

  const handlePageSwitch = (target: number) => {
    if (isLoading) return;
    if (isSearching || !isServerPagination) {
      setLocalPage(target + 1);
    } else {
      onPageChange!(target);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative w-full sm:w-72 sm:ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            disabled={isLoading && rows.length === 0}
            onChange={(e) => {
              setQuery(e.target.value);
              setLocalPage(1);
            }}
            placeholder={searchPlaceholder}
            className="pl-8 pr-8"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setLocalPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        {toolbar}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
            {subHeaderRow}
          </TableHeader>
          <TableBody>
            {isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Math.max(1, columns.length)}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : tableDataSlice.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Math.max(1, columns.length)}
                  className="h-32 text-center text-muted-foreground"
                >
                  {isSearching ? `No records matching "${query}"` : emptyContent}
                </TableCell>
              </TableRow>
            ) : (
              tableDataSlice.map((row, idx) => (
                <TableRow
                  key={getRowKey(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    onRowClick ? "cursor-pointer transition-colors hover:bg-accent/50" : undefined,
                    rowClassName ? rowClassName(row, idx) : undefined,
                  )}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {renderCellContent(c, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {footerRow && <TableFooter>{footerRow}</TableFooter>}
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {totalRecords === 0
            ? "0 results"
            : `${
                isSearching || !isServerPagination
                  ? (localPage - 1) * pageSize + 1
                  : serverPage! * pageSize + 1
              }–${
                isSearching || !isServerPagination
                  ? Math.min(localPage * pageSize, totalRecords)
                  : Math.min((serverPage! + 1) * pageSize, totalRecords)
              } of ${totalRecords}`}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => changePageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[78px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            disabled={
              isLoading || (isSearching || !isServerPagination ? localPage <= 1 : serverPage === 0)
            }
            onClick={() =>
              handlePageSwitch(isSearching || !isServerPagination ? localPage - 2 : serverPage! - 1)
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          <span className="px-1">
            Page {safePageDisplay} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={
              isLoading ||
              (isSearching || !isServerPagination
                ? localPage >= totalPages
                : serverPage! + 1 >= totalPages)
            }
            onClick={() =>
              handlePageSwitch(isSearching || !isServerPagination ? localPage : serverPage! + 1)
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
