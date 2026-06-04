import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  searchValue?: (row: T) => string;
  className?: string;
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

  // Server-side props
  rowCount?: number; 
  page?: number;     
  onPageChange?: (newPage: number) => void;
  isLoading?: boolean; // Added isLoading prop to control pagination buttons
}

export function DataTable<T>({
  rows, columns, pageSize = 8, rowKey, empty, toolbar,
  searchPlaceholder = "Search...", onRowClick,
  rowCount, page: serverPage, onPageChange,
  isLoading = false, // Defaulted to false
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [localPage, setLocalPage] = useState(1);

  const isServerPagination = rowCount !== undefined && serverPage !== undefined && onPageChange !== undefined;
  const activePage = isServerPagination ? serverPage : localPage;

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

  const totalRecords = isServerPagination ? rowCount : filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePageDisplay = isServerPagination ? activePage + 1 : activePage;
  const tableDataSlice = isServerPagination ? rows : filtered.slice((activePage - 1) * pageSize, activePage * pageSize);

  const handlePageSwitch = (target: number) => {
    if (isLoading) return; // Prevent double trigger during execution
    if (isServerPagination) {
      onPageChange(target);
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
              if (isServerPagination) {
                onPageChange(0);
              } else {
                setLocalPage(1); 
              }
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalRecords === 0 ? 0 : isServerPagination ? (activePage * pageSize + 1) : ((activePage - 1) * pageSize + 1)}
          {"–"}
          {isServerPagination 
            ? Math.min((activePage + 1) * pageSize, totalRecords) 
            : Math.min(activePage * pageSize, totalRecords)
          } of {totalRecords}
        </span>
        <div className="flex items-center gap-1">
          {/* Previous Page Button */}
          <Button 
            variant="outline" 
            size="icon" 
            disabled={isLoading || (isServerPagination ? activePage === 0 : activePage === 1)} 
            onClick={() => handlePageSwitch(isServerPagination ? activePage - 1 : activePage - 2)}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          
          <span className="px-2">Page {safePageDisplay} / {totalPages}</span>
          
          {/* Next Page Button */}
          <Button 
            variant="outline" 
            size="icon" 
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