import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Mail,
  Tag,
  FolderKanban,
  Building2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { ALL_DEPARTMENTS } from "@/lib/types";
import { ticketingService } from "@/services/portals/ticketing/ticketing.service";
import type { SupportCategory } from "@/services/portals/ticketing/types";

// 5 Initial static dummy support categories
const INITIAL_CATEGORIES: SupportCategory[] = [
  {
    id: "cat-1",
    categoryName: "Hardware & POS Issues",
    departmentName: "IT",
    departmentEmail: "it.support@company.com",
    description: "POS terminals, barcode scanners, receipt printers, and register networking.",
  },
  {
    id: "cat-2",
    categoryName: "HVAC & Temperature Control",
    departmentName: "Operations",
    departmentEmail: "facilities@company.com",
    description: "Air conditioning, showroom heating, thermostat alarms, and ventilation filters.",
  },
  {
    id: "cat-3",
    categoryName: "Store Operations & Inventory",
    departmentName: "Operations",
    departmentEmail: "ops.helpdesk@company.com",
    description: "Stock discrepancies, opening/closing checklist, display fixtures, and door codes.",
  },
  {
    id: "cat-4",
    categoryName: "Payroll & Compensation Queries",
    departmentName: "Finance",
    departmentEmail: "finance.tickets@company.com",
    description: "Commissions discrepancies, timecard adjustments, and expense reimbursements.",
  },
  {
    id: "cat-5",
    categoryName: "Physical Security & Access Codes",
    departmentName: "Security",
    departmentEmail: "security.desk@company.com",
    description: "Gate buzzer, keypad reset, employee RFID clearance, and alarm panel issues.",
  },
];

export default function SupportCategoriesPage() {
  const [categories, setCategories] = useState<SupportCategory[]>(INITIAL_CATEGORIES);

  // Dialog states for Add / Edit
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SupportCategory | null>(null);

  // Form fields
  const [formCategoryName, setFormCategoryName] = useState("");
  const [formDepartmentName, setFormDepartmentName] = useState<string>(ALL_DEPARTMENTS[0]);
  const [formDepartmentEmail, setFormDepartmentEmail] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<SupportCategory | null>(null);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormCategoryName("");
    setFormDepartmentName(ALL_DEPARTMENTS[0]);
    setFormDepartmentEmail("");
    setFormDescription("");
    setDialogOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (cat: SupportCategory) => {
    setEditingCategory(cat);
    setFormCategoryName(cat.categoryName);
    setFormDepartmentName(cat.departmentName);
    setFormDepartmentEmail(cat.departmentEmail);
    setFormDescription(cat.description || "");
    setDialogOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async () => {
    if (!formCategoryName.trim()) {
      toast.error("Please enter a category name.");
      return;
    }
    if (!formDepartmentName.trim()) {
      toast.error("Please select a department.");
      return;
    }
    if (!formDepartmentEmail.trim()) {
      toast.error("Please enter a department contact email.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formDepartmentEmail.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (editingCategory) {
      // Update existing
      const updated: SupportCategory = {
        ...editingCategory,
        categoryName: formCategoryName.trim(),
        departmentName: formDepartmentName.trim(),
        departmentEmail: formDepartmentEmail.trim(),
        description: formDescription.trim(),
        updatedAt: new Date().toISOString(),
      };

      setCategories((prev) =>
        prev.map((c) => (c.id === editingCategory.id ? updated : c)),
      );

      try {
        // Wire up service class method (ready for backend)
        // await ticketingService.updateSupportCategory(updated);
      } catch {
        // In-memory update
      }

      toast.success("Support category updated successfully!");
    } else {
      // Create new
      const newCategory: SupportCategory = {
        id: `cat-${Date.now()}`,
        categoryName: formCategoryName.trim(),
        departmentName: formDepartmentName.trim(),
        departmentEmail: formDepartmentEmail.trim(),
        description: formDescription.trim(),
        createdAt: new Date().toISOString(),
      };

      setCategories((prev) => [newCategory, ...prev]);

      try {
        // Wire up service class method (ready for backend)
        // await ticketingService.createSupportCategory(newCategory);
      } catch {
        // In-memory update
      }

      toast.success("Support category added successfully!");
    }

    setDialogOpen(false);
  };

  // Delete category
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));

    try {
      // Wire up service class method (ready for backend)
      // await ticketingService.deleteSupportCategory(deleteTarget.id);
    } catch {
      // In-memory update
    }

    toast.success("Support category deleted successfully!");
    setDeleteTarget(null);
  };

  // Exactly 4 columns required:
  // Category Name, Department Name, Department Email, Actions
  const columns: Column<SupportCategory>[] = useMemo(
    () => [
      {
        key: "categoryName",
        header: "Category Name",
        searchValue: (c) => `${c.categoryName} ${c.description || ""}`,
        accessor: (c) => (
          <div className="flex items-start gap-2.5 py-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
              <Tag className="h-4 w-4" />
            </span>
            <div>
              <div className="font-semibold text-foreground text-sm">{c.categoryName}</div>
              {c.description && (
                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {c.description}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "departmentName",
        header: "Department Name",
        searchValue: (c) => c.departmentName,
        accessor: (c) => (
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/5 text-primary text-xs font-medium px-2.5 py-0.5"
          >
            <Building2 className="mr-1 h-3 w-3 inline" />
            {c.departmentName}
          </Badge>
        ),
      },
      {
        key: "departmentEmail",
        header: "Department Email",
        searchValue: (c) => c.departmentEmail,
        accessor: (c) => (
          <a
            href={`mailto:${c.departmentEmail}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors hover:underline"
          >
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            {c.departmentEmail}
          </a>
        ),
      },
      {
        key: "actions",
        header: <span className="text-right block w-full pr-2">Actions</span>,
        accessor: (c) => (
          <div className="flex items-center justify-end gap-1.5 pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(c);
              }}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              title="Edit category"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(c);
              }}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Support Categories
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure ticket support categories, target departments, and routing emails.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Categories Table */}
      <DataTable
        rows={categories}
        columns={columns}
        rowKey={(c) => c.id}
        searchPlaceholder="Search categories by name, department, or email..."
        emptyMessage={
          <div className="py-12 text-center text-muted-foreground">
            <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="font-medium text-sm">No support categories found</p>
            <p className="text-xs mt-1">Get started by creating your first support category.</p>
          </div>
        }
      />

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Support Category" : "Add Support Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update category parameters and assigned routing email."
                : "Enter category details to route tickets to the correct department."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Category Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formCategoryName}
                onChange={(e) => setFormCategoryName(e.target.value)}
                placeholder="e.g. Hardware & POS Issues"
              />
            </div>

            {/* Department Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Department Name <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formDepartmentName}
                onValueChange={setFormDepartmentName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                  <SelectItem value="Facilities & Maintenance">
                    Facilities & Maintenance
                  </SelectItem>
                  <SelectItem value="Finance & Accounts">
                    Finance & Accounts
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Department Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={formDepartmentEmail}
                onChange={(e) => setFormDepartmentEmail(e.target.value)}
                placeholder="e.g. support@company.com"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description (Optional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief summary of what issues fall under this category..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              {editingCategory ? "Update Category" : "Save Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Support Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category{" "}
              <strong className="text-foreground font-semibold">
                "{deleteTarget?.categoryName}"
              </strong>
              ? Tickets already linked to this category will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
