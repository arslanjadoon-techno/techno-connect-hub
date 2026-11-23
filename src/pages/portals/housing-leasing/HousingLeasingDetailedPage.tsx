import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Pencil, Check, Loader2, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  housingLeasingService,
  type HousingLeaseRecord,
  type HousingLeaseRentAgreement,
  type HousingOccupant,
} from "@/services/portals/housing-leasing";
import { housesService } from "@/services/portals/commission";
import { usersService } from "@/services/user-manager/users.service";
import type { BackendUser } from "@/lib/api/client";
import EditableField from "./components/EditableField";
import MonthlyBillingActivitySection from "./components/MonthlyBillingActivitySection";
import AttachmentsSection from "./components/AttachmentsSection";
import MissingDocumentsSection from "./components/MissingDocumentsSection";
import { useCanShow, useCanWrite } from "@/lib/housing-leasing-permissions";

const ENTITY_OPTIONS = [
  "Texas Mobile PCS LLC",
  "Techno CA LLC",
  "Techno Communications LLC",
  "Active Wireless",
  "MDH Estates LLC",
  "MDY Estates LLC",
  "Techno Oklahoma",
  "Techno GA LLC",
  "Techno Kentucky",
  "Techno Portland",
  "Techno Florida",
  "TMDH WIRELESS LLC",
  "Old Dealer",
];
const LEASE_TYPE_OPTIONS = [
  "Month to Month",
  "Master Lease",
  "Assignment",
  "Extension/Amendment",
  "Option Period",
];
const PAYMENT_MODE_OPTIONS = [
  "CORP PAY",
  "AUTO DEBIT",
  "PORTAL PAYMENT",
  "CHECK PAYMENT",
  "WIRE TRANSFER",
  "Hold",
  "COMPENSATION",
  "PENDING",
];

// Mirrors the local `House` interface in commission/HousesPage.tsx - the
// @/lib/api/client House type only declares the legacy flat stateName/
// districtName/marketName fields, not the nested state/district/market
// objects the backend actually returns alongside them.
interface House {
  id: number;
  address: string;
  number: string;
  phone: string;
  stateId: number;
  stateName?: string;
  districtId: number;
  districtName?: string;
  marketId: number;
  marketName?: string;
  state?: { id: number; name: string };
  district?: { id: number; name: string };
  market?: { id: number; name: string };
  createdAt?: string;
  updatedAt?: string;
}

const AGREEMENT_TOTAL = (a: {
  monthlyRent?: number | null;
  camCharges?: number | null;
  otherCharges?: number | null;
}) => (Number(a.monthlyRent) || 0) + (Number(a.camCharges) || 0) + (Number(a.otherCharges) || 0);

const money = (v?: number | null) =>
  v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(2);

function statusTone(status?: string | null): string {
  if (status === "Active")
    return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400";
  if (status === "InActive") return "border-border bg-muted text-muted-foreground";
  if (status === "Door Closure")
    return "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400";
  return "border-border bg-muted text-muted-foreground";
}

function yesNoTone(v?: string | null): string {
  if (v === "Allowed" || v === "Yes")
    return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400";
  if (v === "Not Allowed" || v === "No")
    return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

export default function HousingLeasingDetailedPage() {
  const { unitId: unitIdParam } = useParams<{ unitId: string }>();
  const unitId = unitIdParam ? Number(unitIdParam) : NaN;
  const navigate = useNavigate();

  const [allLeases, setAllLeases] = useState<HousingLeaseRecord[]>([]);
  const [house, setHouse] = useState<House | null>(null);
  const [agreements, setAgreements] = useState<HousingLeaseRentAgreement[]>([]);
  const [remarks, setRemarks] = useState("");
  const [remarksBy, setRemarksBy] = useState<string | null>(null);
  const [remarksEditDate, setRemarksEditDate] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<HousingLeaseRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [agreementEditKey, setAgreementEditKey] = useState<string | null>(null);
  const [agreementForm, setAgreementForm] = useState<Partial<HousingLeaseRentAgreement>>({});
  const [addingAgreement, setAddingAgreement] = useState(false);
  const [newAgreement, setNewAgreement] = useState({
    monthlyRent: "",
    camCharges: "",
    otherCharges: "",
    startDate: "",
    endDate: "",
    comments: "",
  });
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [savingRemarks, setSavingRemarks] = useState(false);

  // Occupants
  const [occupants, setOccupants] = useState<HousingOccupant[]>([]);
  const [loadingOccupants, setLoadingOccupants] = useState(false);
  const [addingOccupant, setAddingOccupant] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeResults, setEmployeeResults] = useState<BackendUser[]>([]);
  const [searchingEmployees, setSearchingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<BackendUser | null>(null);
  const [newOccupantMoveIn, setNewOccupantMoveIn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [newOccupantRemarks, setNewOccupantRemarks] = useState("");
  const [savingOccupant, setSavingOccupant] = useState(false);
  const [shiftingOccupantId, setShiftingOccupantId] = useState<number | null>(null);
  const [shiftTargetUnitId, setShiftTargetUnitId] = useState("");
  const [shiftMoveDate, setShiftMoveDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftRemarks, setShiftRemarks] = useState("");

  // Section-level permissions. Each section's Card is omitted entirely when
  // "hide"; its fields stay read-only (even while the page is in Edit mode)
  // unless the user specifically has "write" for that section.
  const canShowGeneralInfo = useCanShow("housingleasing.edit_general_information");
  const canWriteGeneralInfo = useCanWrite("housingleasing.edit_general_information");
  const canWriteLeaseStatus = useCanWrite("housingleasing.edit_lease_status");
  const canShowRemarks = useCanShow("housingleasing.edit_lease_expiration_remarks");
  const canWriteRemarks = useCanWrite("housingleasing.edit_lease_expiration_remarks");
  const canShowLandlordInfo = useCanShow("housingleasing.edit_landlord_information");
  const canWriteLandlordInfo = useCanWrite("housingleasing.edit_landlord_information");
  const canShowPropertyMgmt = useCanShow("housingleasing.edit_property_management_information");
  const canWritePropertyMgmt = useCanWrite("housingleasing.edit_property_management_information");
  const canShowBilling = useCanShow("housingleasing.edit_landlord_billing_details");
  const canWriteBilling = useCanWrite("housingleasing.edit_landlord_billing_details");
  const canShowFinancial = useCanShow("housingleasing.edit_lease_agreement_and_financial_details");
  const canWriteFinancial = useCanWrite("housingleasing.edit_lease_agreement_and_financial_details");
  const canShowClauses = useCanShow("housingleasing.edit_agreement_clauses");
  const canWriteClauses = useCanWrite("housingleasing.edit_agreement_clauses");
  const canShowOccupants = useCanShow("housingleasing.edit_occupants");
  const canWriteOccupants = useCanWrite("housingleasing.edit_occupants");
  const anyWriteAccess =
    canWriteGeneralInfo ||
    canWriteLeaseStatus ||
    canWriteRemarks ||
    canWriteLandlordInfo ||
    canWritePropertyMgmt ||
    canWriteBilling ||
    canWriteFinancial ||
    canWriteClauses;

  // When a house has no Housing lease row yet (brand new property, never saved
  // from this page before), GetHousingLeasingInfo won't return anything for it -
  // that query starts from HousingLeaseDataDBSet. Fall back to a blank record
  // seeded from the House registry itself so the page still renders and lets
  // the user fill in and save a first lease (PostHousingLeasingInfo creates the
  // HousingLeaseData row on first save - see handleSave).
  const blankLeaseFromHouse = useMemo<HousingLeaseRecord | null>(() => {
    if (!house) return null;
    return {
      unitId,
      unitName: house.number || house.address || null,
      marketName: house.market?.name ?? house.marketName ?? null,
      districtName: house.district?.name ?? house.districtName ?? null,
      address: house.address ?? null,
      isDeleted: false,
    };
  }, [house, unitId]);

  const leaseData = useMemo(
    () => allLeases.find((l) => l.unitId === unitId) ?? blankLeaseFromHouse,
    [allLeases, unitId, blankLeaseFromHouse],
  );

  const loadAgreements = useCallback(async () => {
    if (!Number.isFinite(unitId)) return;
    try {
      const data = await housingLeasingService.getLeaseRentAgreementByUnitId(unitId);
      setAgreements(data.filter((a) => a.unitId === unitId));
    } catch (error) {
      console.error("Error loading agreements:", error);
    }
  }, [unitId]);

  useEffect(() => {
    if (!Number.isFinite(unitId)) return;
    let active = true;
    (async () => {
      setPageLoading(true);
      try {
        const [leases, remarkRows, houseRes] = await Promise.all([
          housingLeasingService.getAllHousingLeasing(),
          housingLeasingService.getLeaseExpirationRemarks(unitId),
          housesService.get(unitId).catch(() => null),
        ]);
        if (!active) return;
        setAllLeases(leases);
        setHouse(houseRes && houseRes.success ? houseRes.data : null);
        // One remark row per unitId - GetLeaseExpirationRemarks returns an array
        // for symmetry with the bulk variant, but there's ever only one entry.
        setRemarks(remarkRows[0]?.remarks ?? "");
        setRemarksBy(remarkRows[0]?.remarksBy ?? null);
        setRemarksEditDate(remarkRows[0]?.remarksEditDate ?? null);
      } catch (error) {
        console.error("Error loading lease detail:", error);
        toast.error("Failed to load lease details");
      } finally {
        if (active) setPageLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [unitId]);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  useEffect(() => {
    if (leaseData) setFormData({ ...leaseData });
  }, [leaseData]);

  const set = (key: keyof HousingLeaseRecord, value: unknown) =>
    setFormData((f) => (f ? { ...f, [key]: value } : f));

  const daysLeft = leaseData?.expiry_Due
    ? Math.floor((new Date(leaseData.expiry_Due).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleSave = async () => {
    if (!formData || !leaseData) return;
    setSaving(true);
    try {
      const payload: HousingLeaseRecord = {
        ...formData,
        unitId: leaseData.unitId,
        unitName: formData.unitName,
        marketName: formData.marketName,
        contactNumber: formData.contactNumber,
        start_Date: formData.start_Date?.trim() === "" ? null : formData.start_Date,
        expiry_Due: formData.expiry_Due?.trim() === "" ? null : formData.expiry_Due,
        assignmentDate: formData.assignmentDate?.trim() === "" ? null : formData.assignmentDate,
        takeOverDate: formData.takeOverDate?.trim() === "" ? null : formData.takeOverDate,
        commencementDateRent:
          formData.commencementDateRent?.trim() === "" ? null : formData.commencementDateRent,
        leaseStatusDate:
          formData.leaseStatusDate?.trim() === "" ? null : formData.leaseStatusDate,
        isDeleted: false,
      };
      await housingLeasingService.postHousingLeasingInfo(payload);
      setAllLeases((prev) => prev.map((l) => (l.unitId === unitId ? { ...l, ...payload } : l)));
      toast.success("Housing leasing data updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error(`Error occurred: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const startAgreementEdit = (a: HousingLeaseRentAgreement) => {
    setAgreementEditKey(`${a.unitId}-${a.startDate}`);
    setAgreementForm({ ...a });
  };

  const saveAgreementEdit = async () => {
    try {
      await housingLeasingService.updateLeaseRentAgreement(agreementForm);
      toast.success("Agreement updated.");
      setAgreementEditKey(null);
      loadAgreements();
    } catch (error) {
      toast.error(`Failed to save: ${(error as Error).message}`);
    }
  };

  const deleteAgreement = async (a: HousingLeaseRentAgreement) => {
    const key = `${a.unitId}-${a.startDate}`;
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    setDeletingKey(key);
    try {
      await housingLeasingService.deleteLeaseRentAgreement({
        UnitId: a.unitId,
        StartDate: a.startDate,
        EndDate: a.endDate,
      });
      toast.success("Agreement deleted.");
      loadAgreements();
    } catch (error) {
      toast.error(`Delete failed: ${(error as Error).message}`);
    } finally {
      setDeletingKey(null);
    }
  };

  const submitNewAgreement = async () => {
    if (!Number.isFinite(unitId) || !newAgreement.startDate || !newAgreement.endDate) {
      toast.error("Start date and end date are required.");
      return;
    }
    try {
      await housingLeasingService.insertLeaseRentAgreement({ unitId, ...newAgreement });
      toast.success("Lease agreement has been successfully recorded.");
      setAddingAgreement(false);
      setNewAgreement({
        monthlyRent: "",
        camCharges: "",
        otherCharges: "",
        startDate: "",
        endDate: "",
        comments: "",
      });
      loadAgreements();
    } catch (error) {
      toast.error(`Error occurred: ${(error as Error).message}`);
    }
  };

  const saveRemarks = async () => {
    if (!Number.isFinite(unitId)) return;
    setSavingRemarks(true);
    try {
      await housingLeasingService.saveLeaseExpirationRemarks({ unitId, remarks });
      const refreshed = await housingLeasingService.getLeaseExpirationRemarks(unitId);
      setRemarksBy(refreshed[0]?.remarksBy ?? null);
      setRemarksEditDate(refreshed[0]?.remarksEditDate ?? null);
      toast.success("Remarks saved.");
    } catch (error) {
      toast.error(`Failed to save remarks: ${(error as Error).message}`);
    } finally {
      setSavingRemarks(false);
    }
  };

  const loadOccupants = useCallback(async () => {
    if (!Number.isFinite(unitId)) return;
    setLoadingOccupants(true);
    try {
      const data = await housingLeasingService.getHousingOccupants(unitId);
      setOccupants(data);
    } catch (error) {
      console.error("Error loading occupants:", error);
    } finally {
      setLoadingOccupants(false);
    }
  }, [unitId]);

  useEffect(() => {
    loadOccupants();
  }, [loadOccupants]);

  // Debounced whole-database employee search, same pattern as the user search
  // bar on AssignPermissionsPage (GET /api/users/search?search=).
  useEffect(() => {
    const trimmed = employeeQuery.trim();
    if (!trimmed) {
      setEmployeeResults([]);
      return;
    }
    setSearchingEmployees(true);
    const timer = setTimeout(async () => {
      try {
        const res = await usersService.search(trimmed);
        const list = Array.isArray(res) ? res : (res as { data?: BackendUser[] })?.data ?? [];
        setEmployeeResults(list);
      } catch (error) {
        console.error("Failed to search employees:", error);
        setEmployeeResults([]);
      } finally {
        setSearchingEmployees(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [employeeQuery]);

  const resetAddOccupantForm = () => {
    setAddingOccupant(false);
    setEmployeeQuery("");
    setEmployeeResults([]);
    setSelectedEmployee(null);
    setNewOccupantMoveIn(new Date().toISOString().slice(0, 10));
    setNewOccupantRemarks("");
  };

  const handleAddOccupant = async () => {
    if (!selectedEmployee || !Number.isFinite(unitId)) {
      toast.error("Pick an employee first.");
      return;
    }
    setSavingOccupant(true);
    try {
      await housingLeasingService.addHousingOccupant({
        unitId,
        userId: selectedEmployee.id,
        moveInDate: newOccupantMoveIn,
        remarks: newOccupantRemarks || null,
      });
      toast.success(`${selectedEmployee.fullName} added as an occupant.`);
      resetAddOccupantForm();
      loadOccupants();
    } catch (error) {
      toast.error((error as Error).message || "Failed to add occupant.");
    } finally {
      setSavingOccupant(false);
    }
  };

  const resetShiftForm = () => {
    setShiftingOccupantId(null);
    setShiftTargetUnitId("");
    setShiftMoveDate(new Date().toISOString().slice(0, 10));
    setShiftRemarks("");
  };

  const handleShiftOccupant = async (occupant: HousingOccupant) => {
    const newUnitId = Number(shiftTargetUnitId);
    if (!Number.isFinite(newUnitId) || newUnitId <= 0) {
      toast.error("Pick a destination unit first.");
      return;
    }
    setSavingOccupant(true);
    try {
      await housingLeasingService.shiftHousingOccupant({
        occupantId: occupant.id,
        newUnitId,
        moveDate: shiftMoveDate,
        remarks: shiftRemarks || null,
      });
      toast.success(`${occupant.employeeName ?? "Employee"} shifted successfully.`);
      resetShiftForm();
      loadOccupants();
    } catch (error) {
      toast.error((error as Error).message || "Failed to shift occupant.");
    } finally {
      setSavingOccupant(false);
    }
  };

  const handleRemoveOccupant = async (occupant: HousingOccupant) => {
    if (!window.confirm(`Remove ${occupant.employeeName ?? "this employee"} from this unit?`))
      return;
    setSavingOccupant(true);
    try {
      await housingLeasingService.removeHousingOccupant({
        occupantId: occupant.id,
        moveOutDate: new Date().toISOString().slice(0, 10),
      });
      toast.success("Occupant removed.");
      loadOccupants();
    } catch (error) {
      toast.error((error as Error).message || "Failed to remove occupant.");
    } finally {
      setSavingOccupant(false);
    }
  };

  if (pageLoading || !formData) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm">Loading lease details...</p>
      </div>
    );
  }

  if (!leaseData) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <p>No house found for id {unitIdParam}.</p>
        <Button variant="outline" className="mt-3" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const f = isEditing ? formData : leaseData;

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      {/* Frozen on scroll - sits just below the app header (h-12 / z-30) */}
      <div className="sticky top-12 z-20 bg-background pb-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Hero */}
        <Card className="mt-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{leaseData.unitName}</h1>
                {leaseData.tier && <Badge className="uppercase">{leaseData.tier}</Badge>}
                <span className="text-sm font-medium text-muted-foreground">
                  {leaseData.unitId}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {leaseData.marketName} &bull; {leaseData.districtName ?? "—"}
              </p>
              {daysLeft !== null && (
                <Badge
                  variant="outline"
                  className={`mt-2 ${yesNoTone(daysLeft < 0 ? "Not Allowed" : daysLeft <= 45 ? "" : "Allowed")}`}
                >
                  Lease expiring in {daysLeft} days
                </Badge>
              )}
            </div>
            {anyWriteAccess && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={isEditing ? "text-destructive" : ""}
                  onClick={() => {
                    if (isEditing && leaseData) setFormData({ ...leaseData });
                    setIsEditing((v) => !v);
                  }}
                >
                  {isEditing ? (
                    <X className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Pencil className="mr-1.5 h-4 w-4" />
                  )}
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
                {isEditing && (
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* General Information */}
        {canShowGeneralInfo && (
          <Card className="p-4 lg:col-span-2">
            <h2 className="mb-3 text-base font-bold">General Information</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <EditableField
                label="Lease Start Date"
                value={f.start_Date ?? ""}
                editing={isEditing && canWriteGeneralInfo}
                type="date"
                onChange={(v) => set("start_Date", v)}
              />
              <EditableField
                label="Lease Expiry Date"
                value={f.expiry_Due ?? ""}
                editing={isEditing && canWriteGeneralInfo}
                type="date"
                onChange={(v) => set("expiry_Due", v)}
              />
              <EditableField
                label="Assignment Date"
                value={f.assignmentDate ?? ""}
                editing={isEditing && canWriteGeneralInfo}
                type="date"
                onChange={(v) => set("assignmentDate", v)}
              />
              <EditableField
                label="Take Over Date"
                value={f.takeOverDate ?? ""}
                editing={isEditing && canWriteGeneralInfo}
                type="date"
                onChange={(v) => set("takeOverDate", v)}
              />
              <EditableField
                label="Rent Commencement Date"
                value={f.commencementDateRent ?? ""}
                editing={isEditing && canWriteGeneralInfo}
                type="date"
                onChange={(v) => set("commencementDateRent", v)}
              />
              <EditableField
                label="Lease Type"
                value={f.lease_Term ?? ""}
                editing={isEditing && canWriteGeneralInfo}
                type="select"
                options={LEASE_TYPE_OPTIONS}
                onChange={(v) => set("lease_Term", v)}
              />
              <EditableField
                label="Tenant / Entity Name"
                value={f.entityName ?? ""}
                editing={isEditing && canWriteGeneralInfo}
                type="select"
                options={ENTITY_OPTIONS}
                onChange={(v) => set("entityName", v)}
              />
              <EditableField
                label="Lease Signed By"
                value={f.leaseSignedBy ?? ""}
                editing={isEditing && canWriteGeneralInfo}
                onChange={(v) => set("leaseSignedBy", v)}
              />
              <EditableField
                label="District"
                value={leaseData.districtName ?? ""}
                editing={false}
              />
              <EditableField label="Tier" value={leaseData.tier ?? ""} editing={false} />
              <EditableField
                label="Lease Status"
                value={f.leaseStatus ?? ""}
                editing={isEditing && canWriteLeaseStatus}
                type="select"
                options={["Active", "InActive", "Door Closure"]}
                onChange={(v) => set("leaseStatus", v)}
                badgeTone={!isEditing ? statusTone(leaseData.leaseStatus) : undefined}
                displayValue={!isEditing ? leaseData.leaseStatus || "Not Set" : undefined}
              />
              {/* Only takes effect when Lease Status is InActive - defaults to "now" on
                  save if left untouched, but editable so users can correct/backdate it. */}
              <EditableField
                label="Status Date"
                value={f.leaseStatusDate?.split("T")[0] ?? ""}
                editing={isEditing && canWriteLeaseStatus && f.leaseStatus === "InActive"}
                type="date"
                onChange={(v) => set("leaseStatusDate", v)}
                displayValue={leaseData.leaseStatusDate?.split("T")[0] || "—"}
              />
            </div>
          </Card>
        )}

        {/* Remarks */}
        {canShowRemarks && (
          <Card className="p-4">
            <h2 className="mb-3 text-base font-bold">Lease Expiration Remarks</h2>
            {canWriteRemarks ? (
              <>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={6}
                  placeholder="Add remarks about this lease's expiration..."
                />
                <Button size="sm" className="mt-2" onClick={saveRemarks} disabled={savingRemarks}>
                  {savingRemarks ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Remarks"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{remarks || "No remarks added."}</p>
            )}
            {(remarksBy || remarksEditDate) && (
              <p className="mt-2 text-xs text-muted-foreground">
                {remarksBy && <>Added by: {remarksBy}</>}
                {remarksBy && remarksEditDate && " · "}
                {remarksEditDate && <>Last edited: {new Date(remarksEditDate).toLocaleString()}</>}
              </p>
            )}
          </Card>
        )}
      </div>

      {/* Landlord Information */}
      {canShowLandlordInfo && (
        <Card className="p-4">
          <h2 className="mb-3 text-base font-bold">Landlord Information</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <EditableField
              label="Landlord Name"
              value={f.landLordName ?? ""}
              editing={isEditing && canWriteLandlordInfo}
              onChange={(v) => set("landLordName", v)}
            />
            <EditableField
              label="Point of Contact"
              value={f.landLordPointOfContact ?? ""}
              editing={isEditing && canWriteLandlordInfo}
              onChange={(v) => set("landLordPointOfContact", v)}
            />
            <EditableField
              label="Phone Number"
              value={f.landLordContactNumber ?? ""}
              editing={isEditing && canWriteLandlordInfo}
              onChange={(v) => set("landLordContactNumber", v)}
            />
            <EditableField
              label="Email"
              value={f.landLordEmail ?? ""}
              editing={isEditing && canWriteLandlordInfo}
              type="email"
              onChange={(v) => set("landLordEmail", v)}
            />
            <EditableField
              label="Address"
              value={f.landLordAddress ?? ""}
              editing={isEditing && canWriteLandlordInfo}
              type="textarea"
              onChange={(v) => set("landLordAddress", v)}
            />
          </div>
        </Card>
      )}

      {/* Property Management Information */}
      {canShowPropertyMgmt && (
        <Card className="p-4">
          <h2 className="mb-3 text-base font-bold">Property Management Information</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <EditableField
              label="Property Management Name"
              value={f.propertyMgtName ?? ""}
              editing={isEditing && canWritePropertyMgmt}
              onChange={(v) => set("propertyMgtName", v)}
            />
            <EditableField
              label="Point of Contact"
              value={f.propertyMgtPointOfContact ?? ""}
              editing={isEditing && canWritePropertyMgmt}
              onChange={(v) => set("propertyMgtPointOfContact", v)}
            />
            <EditableField
              label="Email"
              value={f.propertyMgtEmail ?? ""}
              editing={isEditing && canWritePropertyMgmt}
              type="email"
              onChange={(v) => set("propertyMgtEmail", v)}
            />
            <EditableField
              label="Phone Number"
              value={f.propertyMgtPhoneNumber ?? ""}
              editing={isEditing && canWritePropertyMgmt}
              onChange={(v) => set("propertyMgtPhoneNumber", v)}
            />
            <EditableField
              label="Address"
              value={f.propertyMgtAddress ?? ""}
              editing={isEditing && canWritePropertyMgmt}
              type="textarea"
              onChange={(v) => set("propertyMgtAddress", v)}
            />
          </div>
        </Card>
      )}

      {/* Landlord Billing Details */}
      {canShowBilling && (
        <Card className="p-4">
          <h2 className="mb-3 text-base font-bold">Landlord Billing Details</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <EditableField
              label="Bank Name"
              value={f.ownerBankName ?? ""}
              editing={isEditing && canWriteBilling}
              onChange={(v) => set("ownerBankName", v)}
            />
            <EditableField
              label="Account Title"
              value={f.ownerAccountTitle ?? ""}
              editing={isEditing && canWriteBilling}
              onChange={(v) => set("ownerAccountTitle", v)}
            />
            <EditableField
              label="Routing Number"
              value={f.ownerRoutingNumber ?? ""}
              editing={isEditing && canWriteBilling}
              onChange={(v) => set("ownerRoutingNumber", v)}
            />
            <EditableField
              label="Account Number"
              value={f.ownerAccountNumber ?? ""}
              editing={isEditing && canWriteBilling}
              onChange={(v) => set("ownerAccountNumber", v)}
            />
            <EditableField
              label="Billing / Cheque Address"
              value={f.ownerCheckAddress ?? ""}
              editing={isEditing && canWriteBilling}
              type="textarea"
              onChange={(v) => set("ownerCheckAddress", v)}
            />
            <EditableField
              label="Payment Mode"
              value={f.ownerPaymentMode ?? ""}
              editing={isEditing && canWriteBilling}
              type="select"
              options={PAYMENT_MODE_OPTIONS}
              onChange={(v) => set("ownerPaymentMode", v)}
            />
            <EditableField
              label="Remarks"
              value={f.landLordRemarks ?? ""}
              editing={isEditing && canWriteBilling}
              type="textarea"
              colSpan="sm:col-span-2"
              onChange={(v) => set("landLordRemarks", v)}
            />
          </div>
        </Card>
      )}

      {/* Financial Details - Rent Agreements */}
      {canShowFinancial && (
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Lease Agreement &mdash; Financial Details</h2>
          {canWriteFinancial && (
            <Button size="sm" variant="outline" onClick={() => setAddingAgreement(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Agreement
            </Button>
          )}
        </div>

        {addingAgreement && canWriteFinancial && (
          <Card className="mb-3 grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6">
            <EditableField
              label="Monthly Rent"
              value={newAgreement.monthlyRent}
              editing
              type="number"
              onChange={(v) => setNewAgreement((a) => ({ ...a, monthlyRent: v }))}
            />
            <EditableField
              label="CAM Charges"
              value={newAgreement.camCharges}
              editing
              type="number"
              onChange={(v) => setNewAgreement((a) => ({ ...a, camCharges: v }))}
            />
            <EditableField
              label="Other Charges"
              value={newAgreement.otherCharges}
              editing
              type="number"
              onChange={(v) => setNewAgreement((a) => ({ ...a, otherCharges: v }))}
            />
            <EditableField
              label="Start Date"
              value={newAgreement.startDate}
              editing
              type="date"
              onChange={(v) => setNewAgreement((a) => ({ ...a, startDate: v }))}
            />
            <EditableField
              label="End Date"
              value={newAgreement.endDate}
              editing
              type="date"
              onChange={(v) => setNewAgreement((a) => ({ ...a, endDate: v }))}
            />
            <EditableField
              label="Comments"
              value={newAgreement.comments}
              editing
              onChange={(v) => setNewAgreement((a) => ({ ...a, comments: v }))}
            />
            <div className="col-span-full flex gap-2">
              <Button size="sm" onClick={submitNewAgreement}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddingAgreement(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {[
                  "Monthly Rent",
                  "CAM Charges",
                  "Other Charges",
                  "Total",
                  "Start Date",
                  "End Date",
                  "Comments",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {agreements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    No records added yet.
                  </td>
                </tr>
              ) : (
                agreements.map((a) => {
                  const key = `${a.unitId}-${a.startDate}`;
                  const editing = agreementEditKey === key;
                  return (
                    <tr key={key} className="hover:bg-muted/30">
                      {editing ? (
                        <>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              className="h-8 w-24 rounded border border-input px-2 text-sm"
                              value={agreementForm.monthlyRent ?? ""}
                              onChange={(e) =>
                                setAgreementForm((p) => ({
                                  ...p,
                                  monthlyRent: Number(e.target.value),
                                }))
                              }
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              className="h-8 w-24 rounded border border-input px-2 text-sm"
                              value={agreementForm.camCharges ?? ""}
                              onChange={(e) =>
                                setAgreementForm((p) => ({
                                  ...p,
                                  camCharges: Number(e.target.value),
                                }))
                              }
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              className="h-8 w-24 rounded border border-input px-2 text-sm"
                              value={agreementForm.otherCharges ?? ""}
                              onChange={(e) =>
                                setAgreementForm((p) => ({
                                  ...p,
                                  otherCharges: Number(e.target.value),
                                }))
                              }
                            />
                          </td>
                          <td className="px-3 py-1.5">{money(AGREEMENT_TOTAL(agreementForm))}</td>
                          <td className="px-3 py-1.5">
                            <input
                              type="date"
                              className="h-8 w-36 rounded border border-input px-2 text-sm"
                              value={agreementForm.startDate?.slice(0, 10) ?? ""}
                              onChange={(e) =>
                                setAgreementForm((p) => ({ ...p, startDate: e.target.value }))
                              }
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="date"
                              className="h-8 w-36 rounded border border-input px-2 text-sm"
                              value={agreementForm.endDate?.slice(0, 10) ?? ""}
                              onChange={(e) =>
                                setAgreementForm((p) => ({ ...p, endDate: e.target.value }))
                              }
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              className="h-8 w-full rounded border border-input px-2 text-sm"
                              value={(agreementForm.comments as string) ?? ""}
                              onChange={(e) =>
                                setAgreementForm((p) => ({ ...p, comments: e.target.value }))
                              }
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7 text-emerald-600"
                                onClick={saveAgreementEdit}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7 text-destructive"
                                onClick={() => setAgreementEditKey(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2">{money(a.monthlyRent)}</td>
                          <td className="px-3 py-2">{money(a.camCharges)}</td>
                          <td className="px-3 py-2">{money(a.otherCharges)}</td>
                          <td className="px-3 py-2 font-medium">{money(AGREEMENT_TOTAL(a))}</td>
                          <td className="px-3 py-2">{a.startDate?.split("T")[0] || "—"}</td>
                          <td className="px-3 py-2">{a.endDate?.split("T")[0] || "—"}</td>
                          <td className="max-w-[20ch] whitespace-normal break-words px-3 py-2">
                            {(a.comments as string) || "—"}
                          </td>
                          <td className="px-3 py-2">
                            {canWriteFinancial && (
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => startAgreementEdit(a)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => deleteAgreement(a)}
                                  disabled={deletingKey === key}
                                >
                                  {deletingKey === key ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {/* Agreement Clauses - Housing-specific, not a copy of Leasing's
          commercial-lease clauses (HVAC/Exclusivity/Termination/etc don't apply
          to employee housing). Free-text tag lists instead. */}
      {canShowClauses && (
      <Card className="p-4">
        <h2 className="mb-3 text-base font-bold">Agreement Clauses</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <EditableField
            label="Appliances by Owner"
            value={f.appliancesByOwner ?? ""}
            editing={isEditing && canWriteClauses}
            onChange={(v) => set("appliancesByOwner", v)}
            maxLength={1000}
          />
          <EditableField
            label="Appliances by Tenant"
            value={f.appliancesByTenant ?? ""}
            editing={isEditing && canWriteClauses}
            onChange={(v) => set("appliancesByTenant", v)}
            maxLength={1000}
          />
        </div>
      </Card>
      )}

      {canShowBilling && leaseData.unitId != null && (
        <MonthlyBillingActivitySection unitId={leaseData.unitId} />
      )}
      {leaseData.unitId != null && (
        <AttachmentsSection unitId={leaseData.unitId} isEditing={isEditing && anyWriteAccess} />
      )}
      {leaseData.unitId != null && <MissingDocumentsSection unitId={leaseData.unitId} />}

      {/* Occupants - employees currently/previously living in this unit. Add,
          Shift (move to another unit - closes this row and opens a new one
          there) and Remove all act immediately (not gated behind the page's
          Edit/Save toggle), same as the Remarks section above. */}
      {canShowOccupants && (
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Occupants</h2>
          {canWriteOccupants && !addingOccupant && (
            <Button size="sm" variant="outline" onClick={() => setAddingOccupant(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Occupant
            </Button>
          )}
        </div>

        {addingOccupant && (
          <div className="mb-4 space-y-3 rounded-md border p-3">
            <div className="relative">
              <div className="mb-1 text-xs font-semibold text-muted-foreground">Employee</div>
              {selectedEmployee ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>
                    {selectedEmployee.fullName}{" "}
                    <span className="text-muted-foreground">({selectedEmployee.email})</span>
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setSelectedEmployee(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={employeeQuery}
                    onChange={(e) => setEmployeeQuery(e.target.value)}
                    placeholder="Search employee by name or email..."
                    className="h-9"
                  />
                  {employeeQuery.trim() !== "" && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {searchingEmployees ? (
                        <div className="p-2 text-xs text-muted-foreground">Searching...</div>
                      ) : employeeResults.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground">No matches.</div>
                      ) : (
                        employeeResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setSelectedEmployee(u);
                              setEmployeeQuery("");
                              setEmployeeResults([]);
                            }}
                          >
                            {u.fullName} <span className="text-muted-foreground">({u.email})</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Move In Date</div>
                <Input
                  type="date"
                  value={newOccupantMoveIn}
                  onChange={(e) => setNewOccupantMoveIn(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Remarks</div>
                <Input
                  value={newOccupantRemarks}
                  onChange={(e) => setNewOccupantRemarks(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={resetAddOccupantForm}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddOccupant} disabled={savingOccupant}>
                {savingOccupant ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>
        )}

        {loadingOccupants ? (
          <p className="text-sm text-muted-foreground">Loading occupants...</p>
        ) : occupants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No occupants recorded for this unit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                  <th className="py-2">Employee</th>
                  <th className="py-2">Move In</th>
                  <th className="py-2">Move Out</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Remarks</th>
                  {canWriteOccupants && <th className="py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {occupants.map((o) => {
                  const isActive = o.moveOutDate == null;
                  const otherUnits = allLeases.filter(
                    (l) => l.unitId != null && l.unitId !== unitId,
                  );
                  return (
                    <Fragment key={o.id}>
                      <tr className="border-b last:border-0">
                        <td className="py-2">
                          <div>{o.employeeName ?? `User #${o.userId}`}</div>
                          <div className="text-xs text-muted-foreground">{o.employeeEmail}</div>
                        </td>
                        <td className="py-2">{o.moveInDate?.slice(0, 10)}</td>
                        <td className="py-2">{o.moveOutDate?.slice(0, 10) ?? "—"}</td>
                        <td className="py-2">
                          <Badge
                            variant="outline"
                            className={
                              isActive
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : "border-border bg-muted text-muted-foreground"
                            }
                          >
                            {o.status ?? (isActive ? "Active" : "Moved Out")}
                          </Badge>
                        </td>
                        <td className="py-2">{o.remarks ?? "—"}</td>
                        {canWriteOccupants && (
                          <td className="py-2 text-right">
                            {isActive && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    shiftingOccupantId === o.id
                                      ? resetShiftForm()
                                      : setShiftingOccupantId(o.id)
                                  }
                                >
                                  Shift
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive"
                                  onClick={() => handleRemoveOccupant(o)}
                                  disabled={savingOccupant}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                      {shiftingOccupantId === o.id && (
                        <tr>
                          <td colSpan={canWriteOccupants ? 6 : 5} className="pb-3">
                            <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
                              <div className="min-w-[200px]">
                                <div className="mb-1 text-xs font-semibold text-muted-foreground">
                                  Destination Unit
                                </div>
                                <Select value={shiftTargetUnitId} onValueChange={setShiftTargetUnitId}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {otherUnits.map((l) => (
                                      <SelectItem key={l.unitId} value={String(l.unitId)}>
                                        {l.unitName ?? `Unit ${l.unitId}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <div className="mb-1 text-xs font-semibold text-muted-foreground">
                                  Move Date
                                </div>
                                <Input
                                  type="date"
                                  value={shiftMoveDate}
                                  onChange={(e) => setShiftMoveDate(e.target.value)}
                                  className="h-9"
                                />
                              </div>
                              <div className="flex-1 min-w-[160px]">
                                <div className="mb-1 text-xs font-semibold text-muted-foreground">
                                  Remarks
                                </div>
                                <Input
                                  value={shiftRemarks}
                                  onChange={(e) => setShiftRemarks(e.target.value)}
                                  className="h-9"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={resetShiftForm}>
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleShiftOccupant(o)}
                                  disabled={savingOccupant}
                                >
                                  {savingOccupant ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    "Confirm Shift"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
