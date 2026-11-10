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
  AlertCircle,
  Copy,
  Terminal,
  RotateCcw,
  User,
  Hash,
  Layers,
  KeyRound,
  ExternalLink,
  Lock,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { deviceService, type AddDevicePayload } from "@/services/device";

interface RegisteredDeviceRecord extends AddDevicePayload {
  id: string;
  timestamp: string;
  status: "Active" | "Pending";
}

const PORTAL_CREDENTIAL_OPTIONS = [
  { label: "Admin", value: 2, description: "Full administrative permissions" },
  { label: "Reporting", value: 3, description: "Analytics & performance reports access" },
  { label: "Inventory", value: 4, description: "Stock, equipment & logistics access" },
  { label: "Surveillance", value: 5, description: "CCTV & security audit report access" },
] as const;

export default function AddDevicesPage() {
  const { user } = useAuth();

  // Form State
  const [deviceId, setDeviceId] = useState("");
  const [portalName, setPortalName] = useState("RTBDI");
  const [portalCredentials, setPortalCredentials] = useState<number>(2);
  const [employeeName, setEmployeeName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Session history for registered devices
  const [sessionDevices, setSessionDevices] = useState<RegisteredDeviceRecord[]>([]);

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

  const activePayload: AddDevicePayload = {
    deviceId: deviceId.trim(),
    portalName,
    isAllowed: true,
    portalCredentials,
    employeeName: employeeName.trim(),
  };

  const generatedCurl = `curl -X 'POST' \\
  'http://localhost:5001/api/Device/AddDevice' \\
  -H 'accept: */*' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(activePayload, null, 2)}'`;

  const handleCopyCurl = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(generatedCurl);
      setCopied(true);
      toast.success("cURL command copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    }
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

      // Record in session table
      const newRecord: RegisteredDeviceRecord = {
        ...payload,
        id: `dev-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        status: "Active",
      };
      setSessionDevices((prev) => [newRecord, ...prev]);

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
    <div className="space-y-6 max-w-6xl animate-fade-in pb-12">
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
            Device Registration
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

      {/* Security Context Notice */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              High-Privilege Configuration Module
              <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">
                &bull; Session user: {user?.email}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              New device credentials granted here authorize terminal hardware to access the selected
              portal. All registrations are signed with active permissions (
              <code className="font-mono text-primary font-medium">isAllowed: true</code>).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground bg-background/80 px-3 py-1.5 rounded-lg border border-border/60">
          <Clock className="h-3.5 w-3.5 text-primary" />
          Target:{" "}
          <code className="font-mono font-medium text-foreground">http://localhost:5001</code>
        </div>
      </div>

      {/* Main Grid: Form & Live Request Preview */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Device Registration Form */}
        <Card className="lg:col-span-7 border-border/80 shadow-xs">
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
                            <Badge
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 font-mono"
                            >
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
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      true
                    </span>{" "}
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

        {/* Live Payload & cURL Inspector */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  API Payload Preview
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCurl}
                  className="h-7 text-xs px-2 gap-1.5"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "Copied!" : "Copy cURL"}
                </Button>
              </div>
              <CardDescription className="text-[11px]">
                Real-time preview of the JSON payload sent to the backend endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100 overflow-x-auto shadow-inner border border-slate-800">
                <div className="text-[10px] text-slate-500 select-none pb-1 border-b border-slate-800/80 mb-2 flex items-center justify-between">
                  <span>POST /api/Device/AddDevice</span>
                  <span className="text-emerald-400 font-semibold">JSON</span>
                </div>
                <pre className="text-[11px] leading-relaxed text-slate-200">
                  {JSON.stringify(activePayload, null, 2)}
                </pre>
              </div>

              {/* Endpoint Protocol Specs */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">HTTP Method:</span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                  >
                    POST
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Endpoint:</span>
                  <span className="font-mono text-[11px] text-foreground">
                    http://localhost:5001/api/Device/AddDevice
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Headers:</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    application/json
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Assigned Role:</span>
                  <Badge variant="secondary" className="font-medium text-[11px]">
                    {selectedCredentialMeta?.label} ({portalCredentials})
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Guidance / Information Card */}
          <Card className="border-border/60 bg-muted/20 shadow-none">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div className="font-semibold text-foreground">Operational Note</div>
                  <p className="leading-relaxed">
                    Ensure the local terminal service running on port 5001 is active. If the service
                    is offline, the request will return a connection timeout error.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Session Registered Devices History */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Session Registration History
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Hardware devices successfully added during your current administrative session.
              </CardDescription>
            </div>
            {sessionDevices.length > 0 && (
              <Badge variant="outline" className="font-mono text-xs">
                {sessionDevices.length} {sessionDevices.length === 1 ? "device" : "devices"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessionDevices.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border border-dashed border-border/70 rounded-lg">
              <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <div className="text-xs font-medium">No devices registered in this session yet.</div>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                Completed submissions will be recorded here for verification.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/70">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Device ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Portal</th>
                    <th className="py-2.5 px-3">Credentials</th>
                    <th className="py-2.5 px-3">Allowed</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sessionDevices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">
                        {dev.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                        {dev.deviceId}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {dev.employeeName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-primary font-medium">
                        {dev.portalName}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {PORTAL_CREDENTIAL_OPTIONS.find((o) => o.value === dev.portalCredentials)
                            ?.label || "Role"}{" "}
                          ({dev.portalCredentials})
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge className="bg-emerald-600/90 text-white font-mono text-[10px]">
                          true
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {dev.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
