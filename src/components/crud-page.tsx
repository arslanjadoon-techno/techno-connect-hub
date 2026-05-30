import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DataTable, type Column } from "./data-table";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!isAdmin(user)) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h2 className="font-display text-xl font-semibold">Admins only</h2>
        <p className="mt-2 text-sm text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}

interface CrudPageProps<T> {
  title: string;
  subtitle?: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  renderForm: (
    initial: T | null,
    onSubmit: (next: T) => void,
    onCancel: () => void,
  ) => ReactNode;
  onDelete: (row: T) => void;
  createLabel?: string;
}

export function CrudPage<T>({
  title, subtitle, rows, columns, rowKey, renderForm, onDelete,
  createLabel = "Add new",
}: CrudPageProps<T>) {
  const [editing, setEditing] = useState<T | null>(null);
  const [open, setOpen] = useState(false);

  const augmentedCols: Column<T>[] = [
    ...columns,
    {
      key: "__actions", header: "", className: "w-24 text-right",
      accessor: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon" variant="ghost"
            onClick={() => { setEditing(row); setOpen(true); }}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" title="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete record?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(row)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-1 h-4 w-4" /> {createLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit" : createLabel}</DialogTitle>
            </DialogHeader>
            {renderForm(editing, () => { setOpen(false); setEditing(null); }, () => { setOpen(false); setEditing(null); })}
            <DialogFooter />
          </DialogContent>
        </Dialog>
      </div>

      <DataTable rows={rows} columns={augmentedCols} rowKey={rowKey} searchPlaceholder={`Search ${title.toLowerCase()}...`} />
    </div>
  );
}
