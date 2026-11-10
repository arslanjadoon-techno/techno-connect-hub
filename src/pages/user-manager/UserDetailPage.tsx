import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usersApi, hierarchyApi } from "@/lib/api/client";
import { portalsService, usersService } from "@/services/user-manager";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Mail,
  Phone,
  Building2,
  Shield,
  MapPin,
  Map as MapIcon,
  Store,
  Home,
  CheckCircle2,
  XCircle,
  Layers,
  Pencil,
  X,
  Power,
} from "lucide-react";
import { getUserAvatarColor } from "./user-colors";
import { UserForm } from "./UsersPage";

function Section({ icon: Icon, title, children, empty }: any) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {Array.isArray(children) && children.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">{empty ?? "Nothing assigned"}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function chip(label: string, key: string | number) {
  return (
    <Badge key={key} variant="outline" className="text-[12px] px-2.5 py-1 rounded-md font-medium">
      {label}
    </Badge>
  );
}

const PORTAL_TONES: Record<string, string> = {
  ticketing: "border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50",
  commission: "border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900/50",
  ranker: "border-purple-200 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-900/50",
  leasing: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50",
  leave: "border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/50",
};
const PORTAL_TONES_FALLBACK = [
  "border-cyan-200 bg-cyan-50 dark:bg-cyan-950/30 dark:border-cyan-900/50",
  "border-fuchsia-200 bg-fuchsia-50 dark:bg-fuchsia-950/30 dark:border-fuchsia-900/50",
  "border-lime-200 bg-lime-50 dark:bg-lime-950/30 dark:border-lime-900/50",
  "border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900/50",
];
function portalTone(name: string, idx: number) {
  return (
    PORTAL_TONES[name?.toLowerCase()?.trim()] ??
    PORTAL_TONES_FALLBACK[idx % PORTAL_TONES_FALLBACK.length]
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentAuthUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dynamicRoles, setDynamicRoles] = useState<any[]>([]);
  const [portalsMasterList, setPortalsMasterList] = useState<any[]>([]);

  const fetchUser = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await usersApi.get(id);
      if (res.success) setUser(res.data);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  };

  const currentLoggedInUserEmail = useMemo(() => {
    if (currentAuthUser?.email) {
      return String(currentAuthUser.email).toLowerCase().trim();
    }
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        return userObj?.email ? String(userObj.email).toLowerCase().trim() : null;
      }
    } catch {
      // Ignore JSON parse error
    }
    return null;
  }, [currentAuthUser]);

  const currentUserEmail = user?.email ? String(user.email).toLowerCase().trim() : "";
  const isSelfAccount = Boolean(
    (currentUserEmail &&
      currentLoggedInUserEmail &&
      currentUserEmail === currentLoggedInUserEmail) ||
    (currentAuthUser?.id && user?.id && String(user.id) === String(currentAuthUser.id)),
  );
  const isDefaultAdmin = currentUserEmail === "admin@techno.com";

  const isActionBlocked = isSelfAccount || isDefaultAdmin;

  const fetchLookups = async () => {
    try {
      const [rolesRes, portalsRes] = await Promise.all([
        hierarchyApi.getRoles(),
        portalsService.getAll(),
      ]);

      if (rolesRes.success && Array.isArray(rolesRes.data)) setDynamicRoles(rolesRes.data);

      if (portalsRes?.success && Array.isArray(portalsRes.data))
        setPortalsMasterList(portalsRes.data);
    } catch {
      // Ignore lookup error
    }
  };

  useEffect(() => {
    fetchUser();
    fetchLookups();
  }, [id]);

  const handleDelete = async () => {
    if (!user) return;
    if (isSelfAccount) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (isDefaultAdmin) {
      toast.error("Default Admin cannot be deleted");
      return;
    }
    try {
      setDeleting(true);
      const res = await usersService.delete(Number(user.id));
      if (res.success) {
        toast.success("User deleted");
        navigate("/admin/users");
      }
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (next: boolean) => {
    if (!user) return;
    if (!next && isSelfAccount) {
      toast.error("You cannot disable your own account");
      return;
    }
    if (!next && isDefaultAdmin) {
      toast.error("Default Admin account cannot be deactivated");
      return;
    }
    try {
      setTogglingActive(true);
      const payload: any = {
        id: Number(user.id),
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        department: user.department ?? null,
        allowedUserManagement: user.allowedUserManagement ?? false,
        active: next,
        assignedPortals: user.assignedPortals ?? [],
        portalAccess: user.portalAccess ?? [],
        states: user.states ?? [],
        districts: user.districts ?? [],
        markets: user.markets ?? [],
        stores: user.stores ?? [],
      };
      const res = await usersApi.update(payload);
      if (res.success) {
        setUser({ ...user, active: next });
        toast.success(next ? "User activated" : "User deactivated");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    } finally {
      setTogglingActive(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading user details...</p>
      </div>
    );
  }
  if (!user) {
    return <div className="py-20 text-center text-muted-foreground">User not found.</div>;
  }

  const initials = (user.fullName || "?")
    .split(/\s+/)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const avatarBg = getUserAvatarColor(user.id);

  const formInitial = {
    id: String(user.id),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? "",
    department:
      user.department && typeof user.department === "object"
        ? user.department.name
        : (user.department ?? "—"),
    allowedUserManagement: user.allowedUserManagement ?? false,
    active: user.active ?? true,
    portalAccess: user.portalAccess ?? [],
    states: user.states ?? [],
    districts: user.districts ?? [],
    markets: user.markets ?? [],
    stores: user.stores ?? [],
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => navigate("/admin/users")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Button>
        <div className="flex gap-2 flex-wrap">
          {!editMode ? (
            <Button variant="outline" className="gap-2" onClick={() => setEditMode(true)}>
              <Pencil className="h-4 w-4" /> Edit details
            </Button>
          ) : (
            <Button variant="outline" className="gap-2" onClick={() => setEditMode(false)}>
              <X className="h-4 w-4" /> Cancel edit
            </Button>
          )}

          {/* Activate / Deactivate with confirmation */}
          <AlertDialog>
            <div
              title={
                isSelfAccount
                  ? "You cannot disable your own account"
                  : isDefaultAdmin
                    ? "Default Admin account cannot be deactivated"
                    : ""
              }
              className={isActionBlocked ? "cursor-not-allowed inline-flex" : "inline-flex"}
            >
              <AlertDialogTrigger asChild disabled={isActionBlocked}>
                <Button
                  variant={user.active ? "outline" : "default"}
                  className={`gap-2 ${isActionBlocked ? "pointer-events-none opacity-50" : ""}`}
                  disabled={togglingActive || isActionBlocked}
                >
                  {togglingActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  {user.active ? "Deactivate" : "Activate"}
                </Button>
              </AlertDialogTrigger>
            </div>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {user.active ? `Deactivate ${user.fullName}?` : `Activate ${user.fullName}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {user.active
                    ? `Are you sure you want to deactivate ${user.fullName}? After this, ${user.fullName} will no longer be able to access any portal until reactivated.`
                    : `${user.fullName} will regain access to all assigned portals.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleToggleActive(!user.active)}>
                  {user.active ? "Yes, deactivate" : "Yes, activate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <div
              title={
                isSelfAccount
                  ? "You cannot delete your own account"
                  : isDefaultAdmin
                    ? "Default Admin cannot be deleted"
                    : ""
              }
              className={isActionBlocked ? "cursor-not-allowed inline-flex" : "inline-flex"}
            >
              <AlertDialogTrigger asChild disabled={isActionBlocked}>
                <Button
                  variant="destructive"
                  className={`gap-2 ${isActionBlocked ? "pointer-events-none opacity-50" : ""}`}
                  disabled={deleting || isActionBlocked}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete user
                </Button>
              </AlertDialogTrigger>
            </div>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes {user.fullName}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold text-white uppercase shadow-md"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-semibold">{user.fullName}</h1>
              {user.active ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> Inactive
                </Badge>
              )}
              {user.allowedUserManagement && (
                <Badge variant="outline" className="gap-1 text-indigo-600 border-indigo-300">
                  <Shield className="h-3 w-3" /> User Manager
                </Badge>
              )}
              {user.bypassTwoFactor ? (
                <Badge
                  variant="outline"
                  className="gap-1 text-rose-600 border-rose-300 dark:text-rose-400 dark:border-rose-800"
                >
                  2FA Disabled
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-800"
                >
                  2FA Enabled
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> <span className="text-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />{" "}
                <span className="text-foreground">{user.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="text-foreground">
                  {user.department?.name || user.department || "—"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {editMode ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Edit user</CardTitle>
          </CardHeader>
          <CardContent>
            {portalsMasterList.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading editor...
              </div>
            ) : (
              <UserForm
                initial={formInitial}
                dynamicRoles={dynamicRoles}
                portalsMasterList={portalsMasterList}
                onSaved={() => {
                  toast.success("User updated");
                  setEditMode(false);
                  fetchUser();
                }}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-6 flex flex-col items-center">
                {/* Avatar Box (Peach/Apricot) */}
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-2xl font-bold bg-[#FCE1B6] text-[#78480D] dark:bg-[#78480D]/40 dark:text-[#FCE1B6] shadow-xs">
                  {initials}
                </div>

                {/* Name & Subtitle */}
                <h2 className="text-base font-bold text-foreground mt-3.5 text-center">
                  {user.fullName || "—"}
                </h2>
                <p className="text-xs text-muted-foreground text-center mt-0.5">
                  {user.department?.name || user.department || "Sales"}
                </p>

                {/* Status Badges */}
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  {user.active ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Inactive
                    </span>
                  )}

                  {user.bypassTwoFactor ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                      <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> 2FA off
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
                      <Shield className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> 2FA on
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div className="w-full border-t border-border/70 my-5" />

                {/* Meta details list */}
                <div className="w-full space-y-3.5 text-xs">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <CreditCard className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="font-semibold text-foreground tracking-wide">
                      {user.ntid ||
                        user.employeeId ||
                        user.code ||
                        user.username ||
                        `USR${user.id}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="text-foreground">{user.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Building2 className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="text-foreground">
                      {user.department?.name || user.department || "Sales"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Stacked Detail Cards */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* 1. Portal access card */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Portal access
                </CardTitle>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                  aria-label="More options"
                >
                  <span className="text-lg leading-none font-bold tracking-widest text-slate-400">
                    ···
                  </span>
                </button>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {Array.isArray(user.portalAccess) && user.portalAccess.length > 0 ? (
                  <div className="space-y-2.5">
                    {user.portalAccess.map((pa: any) => (
                      <div
                        key={pa.portalId}
                        className="rounded-xl border border-blue-200/80 bg-[#dbeafe]/60 dark:bg-blue-950/30 dark:border-blue-900/50 px-4 py-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            PORTAL
                          </div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">
                            {pa.portalName}
                          </div>
                        </div>
                        <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-xs border border-slate-100 dark:border-slate-800 capitalize">
                          {pa.roleName || "User"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-muted-foreground">Nothing assigned</p>
                )}
              </CardContent>
            </Card>

            {/* 2. Coverage card */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <div className="flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">☍</span>
                  </div>
                  Coverage
                </CardTitle>
                <span className="text-xs text-muted-foreground font-normal">
                  State · Market · District
                </span>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-1">
                <div className="space-y-0">
                  {/* State row */}
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-14 shrink-0">
                      State
                    </span>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {Array.isArray(user.states) && user.states.length > 0 ? (
                        user.states.map((s: any) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                          >
                            {s.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Not assigned</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-normal ml-auto pl-2">
                      {user.states?.length || 0}
                    </span>
                  </div>

                  {/* Connected line between State and Market */}
                  <div className="ml-3.5 w-0.5 h-4 border-l-2 border-dashed border-blue-400 dark:border-blue-700 my-0.5" />

                  {/* Market row */}
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-14 shrink-0">
                      Market
                    </span>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {Array.isArray(user.markets) && user.markets.length > 0 ? (
                        user.markets.map((m: any) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                          >
                            {m.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Not assigned</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-normal ml-auto pl-2">
                      {user.markets?.length || 0}
                    </span>
                  </div>

                  {/* Connected line between Market and District */}
                  <div className="ml-3.5 w-0.5 h-4 border-l-2 border-dashed border-slate-300 dark:border-slate-700 my-0.5" />

                  {/* District row */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        Array.isArray(user.districts) && user.districts.length > 0
                          ? "bg-[#1d4ed8] text-white shadow-xs"
                          : "border border-slate-300 dark:border-slate-700 bg-transparent text-slate-400"
                      }`}
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-14 shrink-0">
                      District
                    </span>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {Array.isArray(user.districts) && user.districts.length > 0 ? (
                        user.districts.map((d: any) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                          >
                            {d.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Not assigned</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-normal ml-auto pl-2">
                      {user.districts?.length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Stores card */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Stores
                </CardTitle>
                <span className="text-xs text-muted-foreground font-normal">
                  {user.stores?.length || 0} assigned
                </span>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {Array.isArray(user.stores) && user.stores.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.stores.map((st: any) => (
                      <span
                        key={st.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border"
                      >
                        {st.name || st.code || st.storeName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nothing assigned</p>
                )}
              </CardContent>
            </Card>

            {/* 4. House card */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" /> House
                </CardTitle>
                <span className="text-xs text-muted-foreground font-normal">
                  {Array.isArray(user.houses) && user.houses.length > 1
                    ? `${user.houses.length} assigned`
                    : "Single"}
                </span>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {Array.isArray(user.houses) && user.houses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.houses.map((h: any) => (
                      <span
                        key={h.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border"
                      >
                        {h.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nothing assigned</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
