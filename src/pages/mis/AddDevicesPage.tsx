import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  User,
  Hash,
  Layers,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { deviceService, type AddDevicePayload } from "@/services/device";

const PORTAL_CREDENTIAL_OPTIONS = [
  { label: "Admin", value: 2, description: "Full administrative permissions" },
  { label: "Reporting", value: 3, description: "Analytics & performance reports access" },
  { label: "Inventory", value: 4, description: "Stock, equipment & logistics access" },
  { label: "Surveillance", value: 5, description: "CCTV & security audit report access" },
] as const;

export default function AddDevicesPage() {
  // Form State
  const [deviceId, setDeviceId] = useState("");
  const [portalName, setPortalName] = useState("RTBDI");
  const [portalCredentials, setPortalCredentials] = useState<number>(2);
  const [employeeName, setEmployeeName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Enforce alphabet-only input for Employee Name
  const handleEmployeeNameChange = (val: string) => {
    // Retain only alphabetic letters and single spaces
    const alphabetsOnly = val.replace(/[^a-zA-Z\s]/g, "");
    setEmployeeName(alphabetsOnly);
  };

  const handleResetForm = () => {
    setDeviceId("");
    setPortalName("RTBDI");
    setPortalCredentials(2);
    setEmployeeName("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedDeviceId = deviceId.trim();
    const trimmedEmployeeName = employeeName.trim();

    if (!trimmedDeviceId) {
      toast.error("Please enter a valid Device ID.");
      return;
    }

    if (!trimmedEmployeeName) {
      toast.error("Please enter an employee name.");
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(trimmedEmployeeName)) {
      toast.error("Employee Name must contain alphabetic characters only.");
      return;
    }

    setSubmitting(true);

    const payload: AddDevicePayload = {
      deviceId: trimmedDeviceId,
      portalName,
      isAllowed: true,
      portalCredentials: Number(portalCredentials),
      employeeName: trimmedEmployeeName,
    };

    try {
      const response = await deviceService.addDevice(payload);

      toast.success(
        response?.message ||
          `Device ${trimmedDeviceId} registered successfully for ${trimmedEmployeeName}.`,
      );

      // Clear device ID and employee name for next entry while retaining portal selections
      setDeviceId("");
      setEmployeeName("");
    } catch (err: unknown) {
      const errorMsg =
        (err as Error)?.message || "An unexpected error occurred while adding the device.";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCredentialMeta = PORTAL_CREDENTIAL_OPTIONS.find(
    (opt) => opt.value === portalCredentials,
  );

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in pb-12">
      {/* Header / Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
            <Link to="/ai-chat" className="hover:text-foreground transition-colors">
              MIS
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Add Devices</span>
            <Badge
              variant="outline"
              className="ml-1 text-[10px] font-mono border-primary/30 text-primary"
            >
              Restricted
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
            <Smartphone className="h-7 w-7 text-primary shrink-0" />
            Add Devices
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Register and authorize hardware devices for authenticated MIS portal sessions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 py-1 px-2.5 text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Authorized Administrator
          </Badge>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link to="/mis/support">
              <span>Help Desk</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Device Registration Form Card */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Register New Device
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetForm}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>
          <CardDescription className="text-xs">
            Provide hardware identifier, employee association, and assigned portal security level.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Device ID Field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="device-id"
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                Device ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="device-id"
                required
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="e.g. 111111111111 or MAC / UUID"
                className="font-mono text-sm tracking-wide"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                The unique hardware identifier or terminal serial number.
              </p>
            </div>

            {/* Portal Name & Credentials Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Portal Name (Dropdown: title RTBDI, value RTBDI) */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="portal-name"
                  className="text-xs font-semibold flex items-center gap-1.5"
                >
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  Portal Name <span className="text-destructive">*</span>
                </Label>
                <Select value={portalName} onValueChange={setPortalName}>
                  <SelectTrigger id="portal-name" className="w-full">
                    <SelectValue placeholder="Select portal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RTBDI">RTBDI</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Target portal namespace for this hardware binding.
                </p>
              </div>

              {/* Portal Credentials Dropdown [Admin: 2, Reporting: 3, Inventory: 4, Surveillance: 5] */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="portal-credentials"
                  className="text-xs font-semibold flex items-center gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  Portal Credentials <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={String(portalCredentials)}
                  onValueChange={(val) => setPortalCredentials(Number(val))}
                >
                  <SelectTrigger id="portal-credentials" className="w-full">
                    <SelectValue placeholder="Select credential level" />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTAL_CREDENTIAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        <div className="flex items-center gap-2">
                          <span>{opt.label}</span>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
                            Code {opt.value}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {selectedCredentialMeta?.description}
                </p>
              </div>
            </div>

            {/* Employee Name (Alphabets only) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="employee-name"
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Employee Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="employee-name"
                required
                value={employeeName}
                onChange={(e) => handleEmployeeNameChange(e.target.value)}
                placeholder="e.g. ANAS or John Doe"
                className="text-sm font-medium"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Restricted to alphabetic letters only (no numbers or special characters).
              </p>
            </div>

            {/* isAllowed Status Box (Always True) */}
            <div className="rounded-lg border border-border/80 bg-muted/40 p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Authorization Status (<code className="font-mono text-[11px]">isAllowed</code>)
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Automatically enforced as{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">true</span>{" "}
                  for every verified registration.
                </div>
              </div>
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-mono text-xs px-2.5 py-0.5">
                true
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 font-semibold transition-all shadow-sm"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Registering Device...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Register Device
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
