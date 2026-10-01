import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Camera,
  Eye,
  EyeOff,
  Check,
  Palette as PaletteIcon,
  Lock,
  ShieldCheck,
  Loader2,
  Clock,
  LogOut,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PALETTES, useTheme } from "@/lib/theme";
import { hierarchyApi, usersApi, StatesApi, MarketsApi, DistrictsApi } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";

interface StoredUser {
  id: number;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  profileImage?: string | null;
  department?: { id: number; name: string } | null;
  departmentName?: string | null;
  bypassTwoFactor?: boolean;
  [k: string]: any;
}

function readStoredUser(): StoredUser | null {
  try {
    const raw = window.localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}
function writeStoredUser(u: StoredUser) {
  try {
    window.localStorage.setItem("user", JSON.stringify(u));
  } catch {
    /* ignore */
  }
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const { palette, setPalette } = useTheme();

  const [storedUser, setStoredUser] = useState<StoredUser | null>(() => readStoredUser());

  const [fullName, setFullName] = useState(storedUser?.fullName ?? "");
  const [email, setEmail] = useState(storedUser?.email ?? "");
  const [phone, setPhone] = useState(storedUser?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string>(storedUser?.profileImage ?? "");

  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [loadingDepts, setLoadingDepts] = useState<boolean>(true);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(() => {
    if (storedUser?.department?.id) return String(storedUser.department.id);
    return "placeholder";
  });

  const [states, setStates] = useState<{ id: number; name: string }[]>([]);
  const [loadingStates, setLoadingStates] = useState<boolean>(true);
  const [selectedStateId, setSelectedStateId] = useState<string>(() => {
    const sId =
      storedUser?.stateId ||
      storedUser?.state?.id ||
      storedUser?.states?.[0]?.id ||
      storedUser?.states?.[0];
    if (sId) return String(sId);
    return "placeholder";
  });

  const [markets, setMarkets] = useState<{ id: number; name: string }[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState<boolean>(true);
  const [selectedMarketId, setSelectedMarketId] = useState<string>(() => {
    const mId =
      storedUser?.marketId ||
      storedUser?.market?.id ||
      storedUser?.markets?.[0]?.id ||
      storedUser?.markets?.[0];
    if (mId) return String(mId);
    return "placeholder";
  });

  const [districts, setDistricts] = useState<{ id: number; name: string }[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(true);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(() => {
    const dId =
      storedUser?.districtId ||
      storedUser?.district?.id ||
      storedUser?.districts?.[0]?.id ||
      storedUser?.districts?.[0];
    if (dId) return String(dId);
    return "placeholder";
  });

  const [savingProfile, setSavingProfile] = useState(false);

  // Fetch departments, states, markets, and districts in parallel
  useEffect(() => {
    let isMounted = true;
    async function loadHierarchyData() {
      try {
        setLoadingDepts(true);
        setLoadingStates(true);
        setLoadingMarkets(true);
        setLoadingDistricts(true);

        const [deptsRes, statesRes, marketsRes, districtsRes] = await Promise.all([
          hierarchyApi.getDepartments().catch(() => null),
          StatesApi.getAll({ size: 1000 } as any).catch(() =>
            hierarchyApi.getStates().catch(() => null),
          ),
          MarketsApi.getAll({ size: 5000 } as any).catch(() =>
            hierarchyApi.getMarkets().catch(() => null),
          ),
          DistrictsApi.getAll({ size: 5000 } as any).catch(() =>
            hierarchyApi.getDistricts().catch(() => null),
          ),
        ]);

        if (!isMounted) return;

        // 1. Departments
        const deptList: { id: number; name: string }[] = Array.isArray(deptsRes?.data)
          ? deptsRes.data
          : Array.isArray(deptsRes)
            ? (deptsRes as any)
            : [];
        setDepartments(deptList);

        // Auto-match user's existing department by ID or name
        setSelectedDeptId((prev) => {
          if (prev && prev !== "placeholder") return prev;
          if (storedUser?.department?.id) {
            const matchId = deptList.find((d) => d.id === storedUser.department?.id);
            if (matchId) return String(matchId.id);
          }
          const rawName = (storedUser?.department?.name ?? storedUser?.departmentName ?? "")
            .toLowerCase()
            .trim();
          if (rawName) {
            const matchName = deptList.find((d) => d.name?.toLowerCase().trim() === rawName);
            if (matchName) return String(matchName.id);
          }
          return "none";
        });

        // 2. States
        const stateList: { id: number; name: string }[] = Array.isArray(statesRes?.data)
          ? statesRes.data
          : Array.isArray(statesRes)
            ? (statesRes as any)
            : [];
        setStates(stateList);

        // Auto-match user's existing state
        setSelectedStateId((prev) => {
          if (prev && prev !== "placeholder") return prev;
          const userStateId =
            storedUser?.stateId ||
            storedUser?.state?.id ||
            storedUser?.states?.[0]?.id ||
            storedUser?.states?.[0];
          if (userStateId) {
            const matchId = stateList.find((s) => String(s.id) === String(userStateId));
            if (matchId) return String(matchId.id);
          }
          const rawStateName = (
            storedUser?.stateName ||
            storedUser?.state?.name ||
            storedUser?.states?.[0]?.name ||
            ""
          )
            .toLowerCase()
            .trim();
          if (rawStateName) {
            const matchName = stateList.find((s) => s.name?.toLowerCase().trim() === rawStateName);
            if (matchName) return String(matchName.id);
          }
          return "none";
        });

        // 3. Markets
        const marketList: any[] = Array.isArray(marketsRes?.data)
          ? marketsRes.data
          : Array.isArray(marketsRes)
            ? (marketsRes as any)
            : [];
        setMarkets(marketList);

        // Auto-match user's existing market
        setSelectedMarketId((prev) => {
          if (prev && prev !== "placeholder") return prev;
          const userMarketId =
            storedUser?.marketId ||
            storedUser?.market?.id ||
            storedUser?.markets?.[0]?.id ||
            storedUser?.markets?.[0];
          if (userMarketId) {
            const matchId = marketList.find((m) => String(m.id) === String(userMarketId));
            if (matchId) return String(matchId.id);
          }
          const rawMarketName = (
            storedUser?.marketName ||
            storedUser?.market?.name ||
            storedUser?.markets?.[0]?.name ||
            ""
          )
            .toLowerCase()
            .trim();
          if (rawMarketName) {
            const matchName = marketList.find(
              (m) => m.name?.toLowerCase().trim() === rawMarketName,
            );
            if (matchName) return String(matchName.id);
          }
          return "none";
        });

        // 4. Districts
        const districtList: any[] = Array.isArray(districtsRes?.data)
          ? districtsRes.data
          : Array.isArray(districtsRes)
            ? (districtsRes as any)
            : [];
        setDistricts(districtList);

        // Auto-match user's existing district
        setSelectedDistrictId((prev) => {
          if (prev && prev !== "placeholder") return prev;
          const userDistrictId =
            storedUser?.districtId ||
            storedUser?.district?.id ||
            storedUser?.districts?.[0]?.id ||
            storedUser?.districts?.[0];
          if (userDistrictId) {
            const matchId = districtList.find((d) => String(d.id) === String(userDistrictId));
            if (matchId) return String(matchId.id);
          }
          const rawDistrictName = (
            storedUser?.districtName ||
            storedUser?.district?.name ||
            storedUser?.districts?.[0]?.name ||
            ""
          )
            .toLowerCase()
            .trim();
          if (rawDistrictName) {
            const matchName = districtList.find(
              (d) => d.name?.toLowerCase().trim() === rawDistrictName,
            );
            if (matchName) return String(matchName.id);
          }
          return "none";
        });
      } catch (err: any) {
        console.error("Failed to load hierarchy data in settings:", err);
      } finally {
        if (isMounted) {
          setLoadingDepts(false);
          setLoadingStates(false);
          setLoadingMarkets(false);
          setLoadingDistricts(false);
        }
      }
    }
    loadHierarchyData();
    return () => {
      isMounted = false;
    };
  }, [storedUser]);

  // Password change state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [showPasswordConfirmModal, setShowPasswordConfirmModal] = useState(false);

  // Bypass 2FA — backend sourced
  const [bypass2fa, setBypass2fa] = useState<boolean>(Boolean(storedUser?.bypassTwoFactor));
  const [togglingBypass, setTogglingBypass] = useState(false);

  useEffect(() => {
    setBypass2fa(Boolean(storedUser?.bypassTwoFactor));
  }, [storedUser?.bypassTwoFactor]);

  if (!storedUser) return null;

  const initials =
    (fullName || "U U")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U";

  const onPickImage = (file: File) => {
    if (file.size > 2_000_000) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Full name and email are required");
      return;
    }
    try {
      setSavingProfile(true);
      const selectedDeptObj = departments.find((d) => String(d.id) === selectedDeptId);
      const selectedStateObj = states.find((s) => String(s.id) === selectedStateId);
      const selectedMarketObj = markets.find((m) => String(m.id) === selectedMarketId);
      const selectedDistrictObj = districts.find((d) => String(d.id) === selectedDistrictId);

      const updatePayload: any = {
        id: storedUser.id,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        department: selectedDeptObj ? { id: selectedDeptObj.id, name: selectedDeptObj.name } : null,
        departmentName: selectedDeptObj ? selectedDeptObj.name : null,
        departmentId: selectedDeptObj ? selectedDeptObj.id : null,
        stateId: selectedStateObj ? selectedStateObj.id : null,
        stateName: selectedStateObj ? selectedStateObj.name : null,
        states: selectedStateObj ? [{ id: selectedStateObj.id, name: selectedStateObj.name }] : [],
        marketId: selectedMarketObj ? selectedMarketObj.id : null,
        marketName: selectedMarketObj ? selectedMarketObj.name : null,
        markets: selectedMarketObj
          ? [{ id: selectedMarketObj.id, name: selectedMarketObj.name }]
          : [],
        districtId: selectedDistrictObj ? selectedDistrictObj.id : null,
        districtName: selectedDistrictObj ? selectedDistrictObj.name : null,
        districts: selectedDistrictObj
          ? [{ id: selectedDistrictObj.id, name: selectedDistrictObj.name }]
          : [],
        allowedUserManagement: storedUser.allowedUserManagement ?? false,
        active: storedUser.active ?? true,
        assignedPortals: storedUser.assignedPortals ?? [],
        portalAccess: storedUser.portalAccess ?? [],
        houses: storedUser.houses ?? [],
        stores: storedUser.stores ?? [],
        // profileImage isn't part of AddUserPayload typings yet — send via cast
        ...(avatarUrl ? ({ profileImage: avatarUrl } as any) : {}),
      };

      const res = await usersApi.update(updatePayload);

      const merged: StoredUser = { ...storedUser, ...(res.data as any) };
      // Ensure these fields are persisted even if backend response is sparse
      merged.fullName = fullName.trim();
      merged.email = email.trim();
      merged.phone = phone?.trim() || null;
      if (selectedDeptObj) {
        merged.department = { id: selectedDeptObj.id, name: selectedDeptObj.name };
        merged.departmentName = selectedDeptObj.name;
        merged.departmentId = selectedDeptObj.id;
      } else if (selectedDeptId === "none") {
        merged.department = null;
        merged.departmentName = null;
        merged.departmentId = null;
      }

      if (selectedStateObj) {
        merged.state = { id: selectedStateObj.id, name: selectedStateObj.name };
        merged.stateId = selectedStateObj.id;
        merged.stateName = selectedStateObj.name;
        merged.states = [{ id: selectedStateObj.id, name: selectedStateObj.name }];
      } else if (selectedStateId === "none") {
        merged.state = null;
        merged.stateId = null;
        merged.stateName = null;
        merged.states = [];
      }

      if (selectedMarketObj) {
        merged.market = { id: selectedMarketObj.id, name: selectedMarketObj.name };
        merged.marketId = selectedMarketObj.id;
        merged.marketName = selectedMarketObj.name;
        merged.markets = [{ id: selectedMarketObj.id, name: selectedMarketObj.name }];
      } else if (selectedMarketId === "none") {
        merged.market = null;
        merged.marketId = null;
        merged.marketName = null;
        merged.markets = [];
      }

      if (selectedDistrictObj) {
        merged.district = { id: selectedDistrictObj.id, name: selectedDistrictObj.name };
        merged.districtId = selectedDistrictObj.id;
        merged.districtName = selectedDistrictObj.name;
        merged.districts = [{ id: selectedDistrictObj.id, name: selectedDistrictObj.name }];
      } else if (selectedDistrictId === "none") {
        merged.district = null;
        merged.districtId = null;
        merged.districtName = null;
        merged.districts = [];
      }

      if (avatarUrl) merged.profileImage = avatarUrl;
      writeStoredUser(merged);
      setStoredUser(merged);
      toast.success(res.message || "Profile updated");
    } catch (err: any) {
      toast.error(err?.message || "Profile update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const validatePasswordForm = (): boolean => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error("All password fields are required");
      return false;
    }
    if (newPwd.length < 8) {
      toast.error("New password must be at least 8 characters");
      return false;
    }
    if (newPwd !== confirmPwd) {
      toast.error("Passwords do not match");
      return false;
    }
    if (newPwd === currentPwd) {
      toast.error("New password must differ from current password");
      return false;
    }
    return true;
  };

  const handleUpdatePasswordClick = () => {
    if (validatePasswordForm()) {
      setShowPasswordConfirmModal(true);
    }
  };

  const confirmChangePassword = async () => {
    if (!validatePasswordForm()) {
      setShowPasswordConfirmModal(false);
      return;
    }
    try {
      setSavingPwd(true);
      const res = await usersApi.updatePassword({
        email: storedUser.email,
        oldPassword: currentPwd,
        newPassword: newPwd,
      });

      setShowPasswordConfirmModal(false);
      toast.success(
        res.message ||
          "Password updated successfully. Logging out, please sign in with your new password.",
      );

      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");

      // Log out user and redirect to login screen
      setTimeout(() => {
        logout();
        navigate("/login", { replace: true });
      }, 600);
    } catch (err: any) {
      setShowPasswordConfirmModal(false);
      toast.error(err?.message || "Password update failed");
    } finally {
      setSavingPwd(false);
    }
  };

  const onToggleBypass = async (next: boolean) => {
    setBypass2fa(next); // optimistic
    try {
      setTogglingBypass(true);
      const res = await usersApi.toggle2FaBypass({
        email: storedUser.email,
        bypassStatus: next,
      });
      const merged: StoredUser = { ...storedUser, bypassTwoFactor: next };
      writeStoredUser(merged);
      setStoredUser(merged);
      toast.success(res.message || (next ? "2FA bypass enabled" : "2FA bypass disabled"));
    } catch (err: any) {
      setBypass2fa(!next); // revert
      toast.error(err?.message || "Could not update 2FA preference");
    } finally {
      setTogglingBypass(false);
    }
  };

  // Check if user has permission to see and toggle "Bypass 2FA on login".
  // Rule: Hide if user has role "user" in any portal, or if all portals are "user",
  // or if overall role is "user". Feature is exclusively for managers and admins.
  const isBypassAllowed = (() => {
    const portalAccess: Array<{ portalName?: string; roleName?: string }> =
      Array.isArray(user?.portalAccess) && user.portalAccess.length > 0
        ? user.portalAccess
        : Array.isArray(storedUser?.portalAccess) && storedUser.portalAccess.length > 0
          ? storedUser.portalAccess
          : [];

    const isUserRole = (r?: string | null): boolean => {
      if (!r) return false;
      const clean = r
        .toLowerCase()
        .trim()
        .replace(/[\s_-]/g, "");
      return clean === "user";
    };

    const isManagerOrAdminRole = (r?: string | null): boolean => {
      if (!r) return false;
      const clean = r
        .toLowerCase()
        .trim()
        .replace(/[\s_-]/g, "");
      return clean.includes("admin") || clean.includes("manager");
    };

    // If portalAccess is present:
    if (portalAccess.length > 0) {
      // If ANY portal has the role "user", hide it!
      const hasUserRoleInAnyPortal = portalAccess.some((p) => isUserRole(p.roleName));
      if (hasUserRoleInAnyPortal) return false;

      // Must be manager or admin in all portals
      const allPortalsManagerOrAdmin = portalAccess.every((p) => isManagerOrAdminRole(p.roleName));
      if (!allPortalsManagerOrAdmin) return false;

      return true;
    }

    // Fallback: check global / primary role
    const topRole =
      user?.roleName || storedUser?.roleName || storedUser?.role?.name || storedUser?.role;

    if (isUserRole(topRole)) return false;

    return isManagerOrAdminRole(topRole);
  })();

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
      <header>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Update your profile, password, and theme.</p>
      </header>

      {/* Profile */}
      <Card className="p-6 hover-lift">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white shadow-[var(--shadow-elegant)]"
              style={{
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : "var(--gradient-primary)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!avatarUrl && initials}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow transition hover:scale-110 hover:bg-accent"
              title="Change photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickImage(f);
              }}
            />
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-display text-lg font-semibold">{fullName || "Unnamed user"}</div>
            <div className="text-sm text-muted-foreground">{email}</div>
            <p className="text-xs text-muted-foreground">JPG or PNG. Max 2MB.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email / NTID</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={phone ?? ""}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (123) 456-7890"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Department</Label>
            {loadingDepts ? (
              <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading departments...</span>
              </div>
            ) : (
              <Select value={selectedDeptId} onValueChange={(val) => setSelectedDeptId(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>
                    Select department
                  </SelectItem>
                  <SelectItem value="none">None / Unassigned</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* State Dropdown */}
          <div className="space-y-1.5">
            <Label>State</Label>
            {loadingStates ? (
              <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading states...</span>
              </div>
            ) : (
              <Select value={selectedStateId} onValueChange={(val) => setSelectedStateId(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>
                    Select state
                  </SelectItem>
                  <SelectItem value="none">None / Unassigned</SelectItem>
                  {states.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Market Dropdown */}
          <div className="space-y-1.5">
            <Label>Market</Label>
            {loadingMarkets ? (
              <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading markets...</span>
              </div>
            ) : (
              <Select value={selectedMarketId} onValueChange={(val) => setSelectedMarketId(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>
                    Select market
                  </SelectItem>
                  <SelectItem value="none">None / Unassigned</SelectItem>
                  {markets.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* District Dropdown */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>District</Label>
            {loadingDistricts ? (
              <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading districts...</span>
              </div>
            ) : (
              <Select
                value={selectedDistrictId}
                onValueChange={(val) => setSelectedDistrictId(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>
                    Select district
                  </SelectItem>
                  <SelectItem value="none">None / Unassigned</SelectItem>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveProfile} disabled={savingProfile} className="hover-lift">
            {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </Card>

      {/* Password */}
      <Card className="p-6 hover-lift">
        <div className="mb-4 flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Change password</h2>
            <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            label="Current password"
            value={currentPwd}
            onChange={setCurrentPwd}
            show={showCur}
            toggle={() => setShowCur((s) => !s)}
          />
          <div className="sm:col-span-1" />
          <PasswordField
            label="New password"
            value={newPwd}
            onChange={setNewPwd}
            show={showNew}
            toggle={() => setShowNew((s) => !s)}
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPwd}
            onChange={setConfirmPwd}
            show={showConf}
            toggle={() => setShowConf((s) => !s)}
          />
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            onClick={handleUpdatePasswordClick}
            disabled={savingPwd}
            className="hover-lift"
          >
            {savingPwd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </div>
      </Card>

      {/* Two-factor authentication (visible only for managers and admins) */}
      {isBypassAllowed && (
        <Card className="p-6 hover-lift">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">Bypass 2FA on login</h2>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  When enabled, sign-in skips the third party Authenticator step. Recommended only
                  for trusted devices.
                </p>
              </div>
            </div>
            <Switch
              checked={bypass2fa}
              disabled={togglingBypass}
              onCheckedChange={onToggleBypass}
              aria-label="Bypass 2FA on login"
            />
          </div>
        </Card>
      )}

      {/* Inactivity Auto-Logout */}
      <Card className="p-6 hover-lift">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold">Automatic Session Logout</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active (30 mins)
                </span>
              </div>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                If no activity (mouse, keyboard, scroll) is detected for 30 minutes, a 30-second
                digital clock countdown modal appears before securely logging you out.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-muted text-muted-foreground border">
              30m Idle + 30s Warning
            </span>
          </div>
        </div>
      </Card>

      {/* Theme palette */}
      <Card className="p-6 hover-lift">
        <div className="mb-4 flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <PaletteIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Color palette</h2>
            <p className="text-xs text-muted-foreground">
              Pick the accent — sidebar gradient, buttons, and tables match automatically. Saved to
              your device only.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PALETTES.map((p) => {
            const active = palette.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPalette(p.id);
                  toast.success(`Theme set to ${p.name}`);
                }}
                className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] ${
                  active ? "border-primary ring-2 ring-primary/40" : "border-border"
                }`}
              >
                <span
                  className="h-10 w-10 shrink-0 rounded-lg shadow-inner border border-black/10"
                  style={{
                    backgroundImage:
                      p.previewGradient ||
                      p.sidebarGradient ||
                      `linear-gradient(135deg, ${p.primary}, ${p.primaryGlow})`,
                  }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="mt-1 flex gap-1">
                    {p.swatches.map((s, i) => (
                      <span
                        key={i}
                        className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: s }}
                      />
                    ))}
                  </span>
                </span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Password Change Confirmation Modal */}
      <AlertDialog
        open={showPasswordConfirmModal}
        onOpenChange={(open) => {
          if (!savingPwd) setShowPasswordConfirmModal(open);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
              <LogOut className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-foreground">
              Confirm Password Update
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Updating your password will immediately log you out of the application. You will need
              to log in again using your new password. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={savingPwd}
              onClick={() => setShowPasswordConfirmModal(false)}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={savingPwd}
              onClick={confirmChangePassword}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {savingPwd ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm & Update"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  toggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
